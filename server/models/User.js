const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    username: {
      type: String,
      required: true,
      trim: true,
      unique: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: {
      type: String,
      required: true,
    },
    avatar: {
      type: String,
      default: "",
    },
    lastSeen: {
      type: Date,
      default: Date.now,
    },
    isOnline: {
      type: Boolean,
      default: false,
    },
    preferences: {
      theme: {
        type: String,
        enum: ["system", "light", "dark"],
        default: "system",
      },
      accent: {
        type: String,
        enum: ["teal", "blue", "sunset", "rose"],
        default: "teal",
      },
      showEmail: {
        type: Boolean,
        default: true,
      },
    },
    loginEntries: [
      {
        sessionId: {
          type: String,
          required: true,
        },
        userAgent: {
          type: String,
          default: "Unknown device",
        },
        ipAddress: {
          type: String,
          default: "",
        },
        createdAt: {
          type: Date,
          default: Date.now,
        },
        lastActiveAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
  },
  { timestamps: true }
);

module.exports = mongoose.model("User", userSchema);
