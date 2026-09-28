const mongoose = require('mongoose'); 
const dgbr = require("debug")("development:mongoose");

// Hardcode MongoDB URI for local development
const MONGODB_URI = "mongodb://127.0.0.1:27017/pet";

mongoose.connect(MONGODB_URI)
  .then(() => dgbr("✅ MongoDB connected"))
  .catch(err => dgbr("❌ MongoDB connection error:", err));

module.exports = mongoose.connection;
