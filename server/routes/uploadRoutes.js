const express = require("express");
const fs = require("fs");
const multer = require("multer");
const path = require("path");
const { protect } = require("../middleware/auth");

const router = express.Router();
const uploadDir = path.join(__dirname, "..", "uploads");

fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, uploadDir);
  },
  filename: (_req, file, cb) => {
    const uniqueName = `${Date.now()}-${Math.round(Math.random() * 1e9)}${path.extname(file.originalname)}`;
    cb(null, uniqueName);
  },
});

const upload = multer({ storage });

router.post("/", protect, upload.array("files", 10), (req, res) => {
  if (!req.files?.length) {
    return res.status(400).json({ message: "No file uploaded" });
  }

  const attachments = req.files.map((file) => ({
    fileUrl: `/uploads/${file.filename}`,
    fileType: file.mimetype,
    originalName: file.originalname,
    size: file.size,
  }));

  return res.status(201).json({
    fileUrl: attachments[0].fileUrl,
    fileType: attachments[0].fileType,
    originalName: attachments[0].originalName,
    attachments,
  });
});

module.exports = router;
