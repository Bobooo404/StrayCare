const mongoose = require("mongoose");

const adoptionPetSchema = new mongoose.Schema({
  ownersName: String,
  petName: String,
  petType: String,
  age: Number,
  description: String,
  contact: String,
  imagePath: String,
  postedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "user",
    required: true
  },
  datePosted: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model("AdoptionPet", adoptionPetSchema);

