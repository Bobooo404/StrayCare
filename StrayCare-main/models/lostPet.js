const mongoose = require("mongoose");

const LostPetSchema = new mongoose.Schema({
  fullname: String,
  contact: String,
  subject: String,
  description: String,
  imagePath: String, // <-- store the path of uploaded image
  location: {
    type: {
      type: String,
      enum: ["Point"],
      default: "Point",
    },
    coordinates: {
      type: [Number], // [lng, lat]
    },
  },
  dateReported: {
    type: Date,
    default: Date.now,
  },
  status: { type: String, default: "Pending" },
  assignedNGO: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Ngo",
    default: null
  },
  reportedBy: { // 👈 add this
    type: mongoose.Schema.Types.ObjectId,
    ref: "user",
    required: true
  }
  
});

module.exports = mongoose.model("lostPet", LostPetSchema);
