// upload.js
const multer = require("multer");
const os = require("os");

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, os.tmpdir()),
  filename: (req, file, cb) => cb(null, Date.now() + "-" + file.originalname),
});

// Increase size (e.g., 200MB). Adjust per your needs & server limits.
const upload = multer({
  storage,
  limits: { fileSize: 200 * 1024 * 1024, files: 100 },
});

module.exports = upload;
