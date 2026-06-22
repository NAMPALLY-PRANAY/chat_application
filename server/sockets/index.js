const jwt = require("jsonwebtoken");
const User = require("../models/User");
const Chat = require("../models/Chat");
const Message = require("../models/Message");

const userSockets = new Map();

const setOnline = async (userId, isOnline) => {
  await User.findByIdAndUpdate(userId, {
    isOnline,
    lastSeen: new Date(),
  });
};

const markPendingMessagesDelivered = async (userId, io) => {
  try {
    const userChats = await Chat.find({ participants: userId }).select("_id");
    const chatIds = userChats.map((c) => c._id);

    const sentMessages = await Message.find({
      chat: { $in: chatIds },
      sender: { $ne: userId },
      status: "sent",
    });

    if (sentMessages.length > 0) {
      await Message.updateMany(
        { _id: { $in: sentMessages.map((m) => m._id) } },
        { $set: { status: "delivered" } }
      );

      sentMessages.forEach((msg) => {
        io.to(`chat:${msg.chat}`).emit("message:status", {
          messageId: msg._id,
          status: "delivered",
        });
      });
    }
  } catch (error) {
    console.error("Error marking pending messages as delivered:", error);
  }
};

const addSocket = (userId, socketId) => {
  const sockets = userSockets.get(userId) || new Set();
  sockets.add(socketId);
  userSockets.set(userId, sockets);
};

const removeSocket = (userId, socketId) => {
  const sockets = userSockets.get(userId);
  if (!sockets) {
    return;
  }
  sockets.delete(socketId);
  if (sockets.size === 0) {
    userSockets.delete(userId);
  }
};

const emitToUser = (io, userId, event, payload) => {
  const sockets = userSockets.get(userId) || [];
  sockets.forEach((socketId) => {
    io.to(socketId).emit(event, payload);
  });
};

const setupSocket = (io) => {
  io.use((socket, next) => {
    const token = socket.handshake.auth?.token;
    if (!token) {
      return next(new Error("Unauthorized"));
    }

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      socket.userId = decoded.userId;
      return next();
    } catch (error) {
      return next(new Error("Unauthorized"));
    }
  });

  io.on("connection", async (socket) => {
    const userId = socket.userId;
    addSocket(userId, socket.id);
    await setOnline(userId, true);
    await markPendingMessagesDelivered(userId, io);

    socket.broadcast.emit("presence:update", { userId, isOnline: true, lastSeen: new Date() });

    socket.on("chat:join", (chatId) => {
      socket.join(`chat:${chatId}`);
    });

    socket.on("chat:leave", (chatId) => {
      socket.leave(`chat:${chatId}`);
    });

    socket.on("typing:start", ({ chatId }) => {
      socket.to(`chat:${chatId}`).emit("typing:start", { chatId, userId });
    });

    socket.on("typing:stop", ({ chatId }) => {
      socket.to(`chat:${chatId}`).emit("typing:stop", { chatId, userId });
    });

    socket.on("message:new", async (message) => {
      io.to(`chat:${message.chat._id || message.chat}`).emit("message:new", message);

      const chat = message.chat;
      const participants = chat.participants || [];

      participants.forEach((participant) => {
        const pid = participant._id ? participant._id.toString() : participant.toString();
        if (pid !== userId) {
          emitToUser(io, pid, "message:notify", message);
        }
      });
    });

    socket.on("message:delivered", async ({ messageId }) => {
      const message = await Message.findById(messageId).populate("chat");
      if (!message) {
        return;
      }

      if (message.status === "sent") {
        message.status = "delivered";
        await message.save();
      }

      io.to(`chat:${message.chat._id}`).emit("message:status", {
        messageId,
        status: message.status,
      });
    });

    socket.on("message:seen", async ({ chatId }) => {
      const readerId = userId;
      await Message.updateMany(
        { chat: chatId, sender: { $ne: readerId } },
        { $addToSet: { seenBy: readerId }, $set: { status: "seen" } }
      );

      io.to(`chat:${chatId}`).emit("message:seen", { chatId, userId: readerId });
    });

    socket.on("disconnect", async () => {
      removeSocket(userId, socket.id);
      const hasActiveSockets = userSockets.has(userId);

      if (!hasActiveSockets) {
        await setOnline(userId, false);
        socket.broadcast.emit("presence:update", {
          userId,
          isOnline: false,
          lastSeen: new Date(),
        });
      }
    });
  });
};

module.exports = setupSocket;
