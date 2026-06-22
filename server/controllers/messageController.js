const Chat = require("../models/Chat");
const Message = require("../models/Message");

const ensureChatMember = async (chatId, userId) => {
  const chat = await Chat.findById(chatId).select("participants");
  if (!chat) {
    return { error: "Chat not found", status: 404 };
  }

  const isMember = chat.participants.some((id) => id.toString() === userId);
  if (!isMember) {
    return { error: "Access denied", status: 403 };
  }

  return { chat };
};

const sendMessage = async (req, res) => {
  try {
    const {
      chatId,
      content = "",
      fileUrl = "",
      fileType = "",
      attachments = [],
    } = req.body;

    const normalizedAttachments = Array.isArray(attachments)
      ? attachments.filter((attachment) => attachment?.fileUrl)
      : [];

    if (!chatId || (!content.trim() && !fileUrl && normalizedAttachments.length === 0)) {
      return res.status(400).json({ message: "chatId and content/file are required" });
    }

    const chat = await Chat.findById(chatId);
    if (!chat) {
      return res.status(404).json({ message: "Chat not found" });
    }

    const isMember = chat.participants.some((id) => id.toString() === req.userId);
    if (!isMember) {
      return res.status(403).json({ message: "Access denied" });
    }

    const message = await Message.create({
      sender: req.userId,
      chat: chatId,
      content,
      fileUrl,
      fileType,
      attachments: normalizedAttachments,
      status: "sent",
      seenBy: [req.userId],
    });

    chat.lastMessage = message._id;
    await chat.save();

    const populatedMessage = await Message.findById(message._id)
      .populate("sender", "username email avatar")
      .populate("chat");

    return res.status(201).json(populatedMessage);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

const getMessagesByChat = async (req, res) => {
  try {
    const { chatId } = req.params;

    const access = await ensureChatMember(chatId, req.userId);
    if (access.error) {
      return res.status(access.status).json({ message: access.error });
    }

    const messages = await Message.find({ chat: chatId })
      .populate("sender", "username email avatar")
      .sort({ createdAt: 1 });

    return res.json(messages);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

const markChatSeen = async (req, res) => {
  try {
    const { chatId } = req.params;

    const access = await ensureChatMember(chatId, req.userId);
    if (access.error) {
      return res.status(access.status).json({ message: access.error });
    }

    await Message.updateMany(
      {
        chat: chatId,
        sender: { $ne: req.userId },
      },
      {
        $addToSet: { seenBy: req.userId },
        $set: { status: "seen" },
      }
    );

    return res.json({ message: "Messages marked as seen" });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

const searchMessages = async (req, res) => {
  try {
    const { chatId, query } = req.query;

    if (!chatId || !query) {
      return res.status(400).json({ message: "chatId and query are required" });
    }

    const access = await ensureChatMember(chatId, req.userId);
    if (access.error) {
      return res.status(access.status).json({ message: access.error });
    }

    const messages = await Message.find({
      chat: chatId,
      content: { $regex: query, $options: "i" },
    })
      .populate("sender", "username email avatar")
      .sort({ createdAt: -1 })
      .limit(50);

    return res.json(messages);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

const markDelivered = async (req, res) => {
  try {
    const { messageId } = req.params;

    const message = await Message.findById(messageId);
    if (!message) {
      return res.status(404).json({ message: "Message not found" });
    }

    if (message.status === "sent") {
      message.status = "delivered";
      await message.save();
    }

    return res.json({ message: "Message marked as delivered" });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

module.exports = {
  sendMessage,
  getMessagesByChat,
  markChatSeen,
  searchMessages,
  markDelivered,
};
