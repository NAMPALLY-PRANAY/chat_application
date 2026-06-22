const Chat = require("../models/Chat");

const buildDirectKey = (userA, userB) => [userA.toString(), userB.toString()].sort().join(":");

const populateChat = (query) =>
  query
    .populate("participants", "username email avatar isOnline lastSeen preferences")
    .populate("admin", "username email avatar")
    .populate({
      path: "lastMessage",
      populate: { path: "sender", select: "username email avatar" },
    });

const sanitizeChatParticipants = (chat, currentUserId) => {
  if (!chat) return null;
  const chatObj = chat.toObject ? chat.toObject() : chat;
  if (chatObj.participants && Array.isArray(chatObj.participants)) {
    chatObj.participants = chatObj.participants.map((p) => {
      if (p._id.toString() !== currentUserId.toString()) {
        if (!p.preferences || p.preferences.showEmail === false) {
          delete p.email;
        }
      }
      return p;
    });
  }
  return chatObj;
};

const getOrCreateDirectChat = async (req, res) => {
  try {
    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({ message: "userId is required" });
    }

    if (userId === req.userId) {
      return res.status(400).json({ message: "Cannot create a direct chat with yourself" });
    }

    const directKey = buildDirectKey(req.userId, userId);

    let chat = await Chat.findOne({ isGroup: false, directKey });

    if (!chat) {
      chat = await Chat.create({
        participants: [req.userId, userId],
        directKey,
      });
    }

    chat = await populateChat(Chat.findById(chat._id));
    return res.json(sanitizeChatParticipants(chat, req.userId));
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

const createGroupChat = async (req, res) => {
  try {
    const { groupName, participants, groupAvatar = "" } = req.body;

    if (!groupName || !Array.isArray(participants)) {
      return res.status(400).json({ message: "groupName and participants are required" });
    }

    const uniqueParticipants = [...new Set([...participants, req.userId])];

    if (uniqueParticipants.length < 3) {
      return res.status(400).json({ message: "Group needs at least 3 members" });
    }

    const chat = await Chat.create({
      isGroup: true,
      groupName,
      participants: uniqueParticipants,
      admin: req.userId,
      groupAvatar,
    });

    const populated = await populateChat(Chat.findById(chat._id));
    return res.status(201).json(sanitizeChatParticipants(populated, req.userId));
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

const getMyChats = async (req, res) => {
  try {
    const chats = await populateChat(
      Chat.find({ participants: req.userId }).sort({ updatedAt: -1 })
    );

    const sanitizedChats = chats.map((c) => sanitizeChatParticipants(c, req.userId));
    return res.json(sanitizedChats);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

const getChatById = async (req, res) => {
  try {
    const chat = await populateChat(Chat.findById(req.params.id));
    if (!chat) {
      return res.status(404).json({ message: "Chat not found" });
    }

    const isMember = chat.participants.some((p) => p._id.toString() === req.userId);
    if (!isMember) {
      return res.status(403).json({ message: "Access denied" });
    }

    return res.json(sanitizeChatParticipants(chat, req.userId));
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

const addGroupMember = async (req, res) => {
  try {
    const { memberId } = req.body;
    const chat = await Chat.findById(req.params.id);

    if (!chat || !chat.isGroup) {
      return res.status(404).json({ message: "Group not found" });
    }

    if (chat.admin.toString() !== req.userId) {
      return res.status(403).json({ message: "Only admin can add members" });
    }

    if (!chat.participants.includes(memberId)) {
      chat.participants.push(memberId);
      await chat.save();
    }

    const populated = await populateChat(Chat.findById(chat._id));
    return res.json(sanitizeChatParticipants(populated, req.userId));
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

const removeGroupMember = async (req, res) => {
  try {
    const { memberId } = req.body;
    const chat = await Chat.findById(req.params.id);

    if (!chat || !chat.isGroup) {
      return res.status(404).json({ message: "Group not found" });
    }

    if (chat.admin.toString() !== req.userId) {
      return res.status(403).json({ message: "Only admin can remove members" });
    }

    chat.participants = chat.participants.filter((id) => id.toString() !== memberId);
    await chat.save();

    const populated = await populateChat(Chat.findById(chat._id));
    return res.json(sanitizeChatParticipants(populated, req.userId));
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

module.exports = {
  getOrCreateDirectChat,
  createGroupChat,
  getMyChats,
  getChatById,
  addGroupMember,
  removeGroupMember,
};
