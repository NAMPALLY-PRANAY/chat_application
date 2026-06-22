const express = require("express");
const {
  getMessagesByChat,
  markChatSeen,
  markDelivered,
  searchMessages,
  sendMessage,
} = require("../controllers/messageController");
const { protect } = require("../middleware/auth");

const router = express.Router();

router.use(protect);
router.post("/", sendMessage);
router.get("/search/query", searchMessages);
router.get("/:chatId", getMessagesByChat);
router.patch("/:chatId/read", markChatSeen);
router.patch("/delivery/:messageId", markDelivered);

module.exports = router;
