const express = require("express");
const {
  getUsers,
  updatePreferences,
  updateEmail,
  updatePassword,
  getLoginEntries,
  updateAvatar,
} = require("../controllers/userController");
const { protect } = require("../middleware/auth");

const router = express.Router();

router.use(protect);
router.get("/", getUsers);
router.get("/me/login-entries", getLoginEntries);
router.patch("/me/preferences", updatePreferences);
router.patch("/me/email", updateEmail);
router.patch("/me/password", updatePassword);
router.patch("/me/avatar", updateAvatar);

module.exports = router;
