const express = require("express");
const {
  addGroupMember,
  createGroupChat,
  getChatById,
  getMyChats,
  getOrCreateDirectChat,
  removeGroupMember,
} = require("../controllers/chatController");
const { protect } = require("../middleware/auth");

const router = express.Router();

router.use(protect);
router.post("/", getOrCreateDirectChat);
router.post("/group", createGroupChat);
router.get("/", getMyChats);
router.get("/:id", getChatById);
router.patch("/:id/add-member", addGroupMember);
router.patch("/:id/remove-member", removeGroupMember);

module.exports = router;
