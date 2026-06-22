const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const User = require("../models/User");

const signToken = (userId) =>
  jwt.sign({ userId }, process.env.JWT_SECRET, { expiresIn: "7d" });

const getClientIp = (req) =>
  req.headers["x-forwarded-for"]?.split(",")[0]?.trim() ||
  req.socket?.remoteAddress ||
  "";

const getSessionMetadata = (req) => ({
  sessionId: crypto.randomUUID(),
  userAgent: req.headers["user-agent"] || "Unknown device",
  ipAddress: getClientIp(req),
  createdAt: new Date(),
  lastActiveAt: new Date(),
});

const attachSession = async (user, req) => {
  user.loginEntries = [...(user.loginEntries || []), getSessionMetadata(req)].slice(-12);
  await user.save();
};

const sanitizeUser = (user) => ({
  _id: user._id,
  username: user.username,
  email: user.email,
  avatar: user.avatar,
  isOnline: user.isOnline,
  lastSeen: user.lastSeen,
  preferences: user.preferences || { theme: "system", accent: "teal" },
  loginEntries: (user.loginEntries || [])
    .slice()
    .sort((a, b) => new Date(b.lastActiveAt) - new Date(a.lastActiveAt))
    .map((entry) => ({
      sessionId: entry.sessionId,
      userAgent: entry.userAgent,
      ipAddress: entry.ipAddress,
      createdAt: entry.createdAt,
      lastActiveAt: entry.lastActiveAt,
    })),
});

const register = async (req, res) => {
  try {
    const { username, email, password, avatar } = req.body;

    if (!username || !email || !password) {
      return res.status(400).json({ message: "username, email and password are required" });
    }

    const existing = await User.findOne({
      $or: [{ email: email.toLowerCase() }, { username: username.trim() }],
    });
    if (existing) {
      return res.status(409).json({ message: "Username or email already in use" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await User.create({
      username,
      email,
      password: hashedPassword,
      avatar: avatar || "",
    });

    await attachSession(user, req);

    return res.status(201).json({
      token: signToken(user._id),
      user: sanitizeUser(user),
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: "email and password are required" });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    await attachSession(user, req);

    return res.json({
      token: signToken(user._id),
      user: sanitizeUser(user),
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

const me = async (req, res) => {
  try {
    const user = await User.findById(req.userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    if (Array.isArray(user.loginEntries) && user.loginEntries.length > 0) {
      const latestEntry = user.loginEntries[user.loginEntries.length - 1];
      latestEntry.lastActiveAt = new Date();
      await user.save();
    }

    return res.json(sanitizeUser(user));
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

module.exports = {
  register,
  login,
  me,
};
