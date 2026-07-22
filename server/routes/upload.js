const express = require("express");
const multer = require("multer");
const crypto = require("crypto");
const { v2: cloudinary } = require("cloudinary");
const { authRequired } = require("../middleware/auth");

const router = express.Router();

const cloudName =
  process.env.CLOUDINARY_CLOUD_NAME || process.env.REACT_APP_CLOUDINARY_CLOUD_NAME;
const cloudinaryReady = Boolean(
  cloudName && process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET
);

if (!cloudinaryReady) {
  console.warn("Cloudinary not configured. Image uploads are disabled.");
}

if (cloudName) {
  cloudinary.config({
    cloud_name: cloudName,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
  });
}

const storage = multer.memoryStorage();
const upload = multer({ storage, limits: { fileSize: 5 * 1024 * 1024 } });

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
    if (!req.file) {
      return res.status(400).json({ error: "No file provided" });
    }

    if (!cloudinaryReady) {
      return res.status(500).json({ error: "Image uploads are not configured" });
    }

    const b64 = `data:${req.file.mimetype};base64,${req.file.buffer.toString("base64")}`;
    const result = await cloudinary.uploader.upload(b64, {
      folder: "cv-management",
      resource_type: "image",
    });
    res.json({ url: result.secure_url });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Upload failed" });
  }
});

module.exports = router;
