const bcrypt = require("bcryptjs");
const User = require("../models/User");

const userSelection = "username email avatar isOnline lastSeen preferences";

const sanitizeUser = (user) => ({
  _id: user._id,
  username: user.username,
  email: user.email,
  avatar: user.avatar,
  isOnline: user.isOnline,
  lastSeen: user.lastSeen,
  preferences: user.preferences || { theme: "system", accent: "teal", showEmail: true },
});

const getUsers = async (req, res) => {
  try {
    const { search = "" } = req.query;
    const query = { _id: { $ne: req.userId } };

    if (search.trim()) {
      query.username = { $regex: search.trim(), $options: "i" };
    }

    const users = await User.find(query)
      .select(userSelection)
      .sort({ isOnline: -1, username: 1 })
      .limit(search.trim() ? 15 : 100);

    const sanitizedUsers = users.map((u) => {
      const uObj = u.toObject();
      if (!uObj.preferences || uObj.preferences.showEmail === false) {
        delete uObj.email;
      }
      return uObj;
    });

    return res.json(sanitizedUsers);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

const updatePreferences = async (req, res) => {
  try {
    const { theme, accent, showEmail } = req.body;
    const user = await User.findById(req.userId);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    if (theme !== undefined) {
      user.preferences.theme = theme;
    }

    if (accent !== undefined) {
      user.preferences.accent = accent;
    }

    if (showEmail !== undefined) {
      user.preferences.showEmail = showEmail;
    }

    await user.save();
    return res.json(sanitizeUser(user));
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

const updateEmail = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: "email and password are required" });
    }

    const user = await User.findById(req.userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const exists = await User.findOne({ email: email.toLowerCase(), _id: { $ne: req.userId } });
    if (exists) {
      return res.status(409).json({ message: "Email already in use" });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: "Current password is incorrect" });
    }

    user.email = email.toLowerCase().trim();
    await user.save();

    return res.json(sanitizeUser(user));
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

const updatePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ message: "currentPassword and newPassword are required" });
    }

    const user = await User.findById(req.userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: "Current password is incorrect" });
    }

    user.password = await bcrypt.hash(newPassword, 10);
    await user.save();

    return res.json({ message: "Password updated successfully" });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

const getLoginEntries = async (req, res) => {
  try {
    const user = await User.findById(req.userId).select("loginEntries");
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const loginEntries = (user.loginEntries || [])
      .slice()
      .sort((a, b) => new Date(b.lastActiveAt) - new Date(a.lastActiveAt));

    return res.json(loginEntries);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

const updateAvatar = async (req, res) => {
  try {
    const { avatar } = req.body;
    const user = await User.findById(req.userId);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    user.avatar = avatar;
    await user.save();

    return res.json(sanitizeUser(user));
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

module.exports = {
  getUsers,
  updatePreferences,
  updateEmail,
  updatePassword,
  getLoginEntries,
  updateAvatar,
};
