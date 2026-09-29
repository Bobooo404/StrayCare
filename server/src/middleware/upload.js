const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const multer = require('multer');
const env = require('../config/env');
const ApiError = require('../utils/ApiError');

const UPLOAD_DIR = path.join(__dirname, '..', '..', 'uploads');
fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const ALLOWED_MIME_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
]);

const EXTENSION_BY_MIME = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
  'image/gif': '.gif',
};

const storage = multer.diskStorage({
  destination(_req, _file, cb) {
    cb(null, UPLOAD_DIR);
  },
  filename(_req, file, cb) {
    // The extension is derived from the mime type, never from the client
    // supplied filename, so an upload cannot be disguised as a script.
    const ext = EXTENSION_BY_MIME[file.mimetype] || '.bin';
    cb(null, `${Date.now()}-${crypto.randomBytes(8).toString('hex')}${ext}`);
  },
});

function fileFilter(_req, file, cb) {
  if (!ALLOWED_MIME_TYPES.has(file.mimetype)) {
    return cb(
      ApiError.badRequest('Only JPG, PNG, WEBP or GIF images are allowed')
    );
  }
  return cb(null, true);
}

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024, files: 1 },
});

/** Public URL for a stored file, used as the `imageUrl` on created documents. */
function toPublicUrl(filename) {
  if (!filename) return null;
  // Absolute once PUBLIC_URL is set, because the client drops this straight
  // into an `img src` and would otherwise resolve it against its own domain.
  return `${env.publicUrl}/uploads/${filename}`;
}

const uploadSingleImage = upload.single('image');

module.exports = { uploadSingleImage, toPublicUrl, UPLOAD_DIR };
