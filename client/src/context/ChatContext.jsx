import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import api from "../services/api";
import { getSocket } from "../services/socket";
import { useAuth } from "./AuthContext";

const ChatContext = createContext(null);

export const ChatProvider = ({ children }) => {
  const { user, token } = useAuth();
  const [users, setUsers] = useState([]);
  const [directoryUsers, setDirectoryUsers] = useState([]);
  const [chats, setChats] = useState([]);
  const [currentChat, setCurrentChat] = useState(null);
  const [messages, setMessages] = useState([]);
  const [typingUsers, setTypingUsers] = useState({});

  const refreshUsers = useCallback(async (search = "") => {
    if (!token) return;
    const { data } = await api.get("/users", { params: search ? { search } : {} });
    setUsers(data);
    return data;
  }, [token]);

  const refreshDirectoryUsers = useCallback(async () => {
    if (!token) return;
    const { data } = await api.get("/users");
    setDirectoryUsers(data);
    return data;
  }, [token]);

  const refreshChats = useCallback(async () => {
    if (!token) return;
    const { data } = await api.get("/chat");
    setChats(data);
  }, [token]);

  const openChat = useCallback(async (chat) => {
    const socket = getSocket();
    if (currentChat?._id && currentChat._id !== chat._id) {
      socket?.emit("chat:leave", currentChat._id);
    }

    setCurrentChat(chat);
    const { data } = await api.get(`/message/${chat._id}`);
    setMessages(data);
    socket?.emit("chat:join", chat._id);

    await api.patch(`/message/${chat._id}/read`);
    socket?.emit("message:seen", { chatId: chat._id, userId: user?._id });
  }, [currentChat?._id, user?._id]);

  const closeCurrentChat = useCallback(() => {
    const socket = getSocket();
    if (currentChat?._id) {
      socket?.emit("chat:leave", currentChat._id);
    }
    setCurrentChat(null);
    setMessages([]);
    setTypingUsers({});
  }, [currentChat?._id]);


  const createDirectChat = useCallback(async (userId) => {
    const { data } = await api.post("/chat", { userId });
    await refreshChats();
    await openChat(data);
  }, [openChat, refreshChats]);

  const createGroupChat = useCallback(async (groupName, participants, groupAvatar = "") => {
    const { data } = await api.post("/chat/group", { groupName, participants, groupAvatar });
    await refreshChats();
    await openChat(data);
  }, [openChat, refreshChats]);

  const sendMessage = useCallback(async ({ content, fileUrl = "", fileType = "", attachments = [] }) => {
    if (!currentChat) return;

    const { data } = await api.post("/message", {
      chatId: currentChat._id,
      content,
      fileUrl,
      fileType,
      attachments,
    });

    setMessages((prev) =>
      prev.some((msg) => msg._id === data._id) ? prev : [...prev, data]
    );

    const socket = getSocket();
    socket?.emit("message:new", data);
    await refreshChats();
  }, [currentChat, refreshChats]);

  const sendTyping = useCallback((isTyping) => {
    const socket = getSocket();
    if (!socket || !currentChat) return;

    socket.emit(isTyping ? "typing:start" : "typing:stop", { chatId: currentChat._id });
  }, [currentChat]);

  const searchInCurrentChat = useCallback(async (query) => {
    if (!currentChat || !query) return [];
    const { data } = await api.get("/message/search/query", {
      params: { chatId: currentChat._id, query },
    });
    return data;
  }, [currentChat]);

  const uploadFiles = useCallback(async (files) => {
    const formData = new FormData();
    files.forEach((file) => {
      formData.append("files", file);
    });

    const { data } = await api.post("/upload", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });

    return data;
  }, []);

  useEffect(() => {
    if (!token) {
      setUsers([]);
      setDirectoryUsers([]);
      setChats([]);
      setCurrentChat(null);
      setMessages([]);
      return;
    }

    refreshDirectoryUsers();
    refreshChats();
  }, [token, refreshDirectoryUsers, refreshChats]);

  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;

    const onPresence = ({ userId, isOnline, lastSeen }) => {
      setUsers((prev) =>
        prev.map((u) => (u._id === userId ? { ...u, isOnline, lastSeen } : u))
      );
      setDirectoryUsers((prev) =>
        prev.map((u) => (u._id === userId ? { ...u, isOnline, lastSeen } : u))
      );
      setChats((prev) =>
        prev.map((chat) => ({
          ...chat,
          participants: chat.participants.map((p) =>
            p._id === userId ? { ...p, isOnline, lastSeen } : p
          ),
        }))
      );
      setCurrentChat((prev) =>
        prev
          ? {
              ...prev,
              participants: prev.participants.map((participant) =>
                participant._id === userId ? { ...participant, isOnline, lastSeen } : participant
              ),
            }
          : prev
      );
    };

    const onNewMessage = (message) => {
      const msgChatId = message.chat?._id || message.chat;
      if (currentChat?._id === msgChatId) {
        setMessages((prev) =>
          prev.some((msg) => msg._id === message._id) ? prev : [...prev, message]
        );
        const senderId = message.sender?._id || message.sender;
        if (senderId !== user?._id) {
          socket.emit("message:delivered", { messageId: message._id });
        }
      }
      refreshChats();
    };

    const onMessageNotify = (message) => {
      const msgChatId = message.chat?._id || message.chat;
      const senderId = message.sender?._id || message.sender;
      if (currentChat?._id !== msgChatId && senderId !== user?._id) {
        socket.emit("message:delivered", { messageId: message._id });
        refreshChats();
      }
    };

    const onTypingStart = ({ chatId, userId }) => {
      if (chatId !== currentChat?._id || userId === user?._id) return;
      setTypingUsers((prev) => ({ ...prev, [userId]: true }));
    };

    const onTypingStop = ({ chatId, userId }) => {
      if (chatId !== currentChat?._id) return;
      setTypingUsers((prev) => ({ ...prev, [userId]: false }));
    };

    const onMessageStatus = ({ messageId, status }) => {
      setMessages((prev) =>
        prev.map((msg) => (msg._id === messageId ? { ...msg, status } : msg))
      );
    };

    const onSeen = ({ chatId }) => {
      if (chatId !== currentChat?._id) return;
      setMessages((prev) =>
        prev.map((msg) =>
          msg.sender?._id === user?._id ? { ...msg, status: "seen" } : msg
        )
      );
    };

    socket.on("presence:update", onPresence);
    socket.on("message:new", onNewMessage);
    socket.on("message:notify", onMessageNotify);
    socket.on("typing:start", onTypingStart);
    socket.on("typing:stop", onTypingStop);
    socket.on("message:status", onMessageStatus);
    socket.on("message:seen", onSeen);

    return () => {
      socket.off("presence:update", onPresence);
      socket.off("message:new", onNewMessage);
      socket.off("message:notify", onMessageNotify);
      socket.off("typing:start", onTypingStart);
      socket.off("typing:stop", onTypingStop);
      socket.off("message:status", onMessageStatus);
      socket.off("message:seen", onSeen);
    };
  }, [currentChat?._id, refreshChats, user?._id]);

  const value = useMemo(
    () => ({
      users,
      chats,
      currentChat,
      messages,
      typingUsers,
      directoryUsers,
      setCurrentChat,
      refreshUsers,
      refreshDirectoryUsers,
      refreshChats,
      openChat,
      closeCurrentChat,
      createDirectChat,
      createGroupChat,
      sendMessage,
      sendTyping,
      searchInCurrentChat,
      uploadFiles,
    }),
    [
      users,
      directoryUsers,
      chats,
      currentChat,
      messages,
      typingUsers,
      refreshUsers,
      refreshDirectoryUsers,
      refreshChats,
      openChat,
      closeCurrentChat,
      createDirectChat,
      createGroupChat,
      sendMessage,
      sendTyping,
      searchInCurrentChat,
      uploadFiles,
    ]
  );

  return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>;
};

export const useChat = () => useContext(ChatContext);
