const express = require("express");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const crypto = require("crypto");
const { v2: cloudinary } = require("cloudinary");
const { authRequired } = require("../middleware/auth");

const router = express.Router();

const UPLOAD_DIR = path.join(__dirname, "..", "uploads");
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOAD_DIR),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase() || ".png";
    cb(null, `${crypto.randomBytes(12).toString("hex")}${ext}`);
  },
});
const upload = multer({ storage, limits: { fileSize: 5 * 1024 * 1024 } });

const cloudName =
  process.env.CLOUDINARY_CLOUD_NAME || process.env.REACT_APP_CLOUDINARY_CLOUD_NAME;
const cloudinaryReady = Boolean(
  cloudName && process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET
);

if (cloudName) {
  cloudinary.config({
    cloud_name: cloudName,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
  });
}

router.get("/config", (_req, res) => {
  res.json({
    cloudinary: cloudinaryReady,
    cloudName: cloudName || null,
    uploadPreset:
      process.env.CLOUDINARY_UPLOAD_PRESET ||
      process.env.REACT_APP_CLOUDINARY_UPLOAD_PRESET ||
      null,
  });
});

router.post("/", authRequired, upload.single("file"), async (req, res) => {
  try {
    if (!req.file && !req.body.url) {
      return res.status(400).json({ error: "No file or url provided" });
    }

    if (req.body.url) {
      return res.json({ url: req.body.url });
    }

    if (cloudinaryReady) {
      const b64 = `data:${req.file.mimetype};base64,${req.file.buffer.toString("base64")}`;
      const result = await cloudinary.uploader.upload(b64, {
        folder: "cv-management",
        resource_type: "image",
      });
      return res.json({ url: result.secure_url });
    }

    // Cloudinary not fully configured: persist the file locally and return a
    // short, durable URL so it can be stored in the database without overflowing
    // text columns.
    return res.json({
      url: `/uploads/${req.file.filename}`,
      warning:
        "Cloudinary credentials not set — image stored locally on the server.",
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Upload failed" });
  }
});

module.exports = router;
