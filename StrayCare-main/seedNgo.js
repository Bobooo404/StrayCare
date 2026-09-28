require("dotenv").config();
const mongoose = require("mongoose");
const bcrypt = require("bcrypt");
const Ngo = require("./models/ngo");

mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("MongoDB connected"))
  .catch(err => console.log(err));

async function createNgo() {
  try {
    const hashedPassword = await bcrypt.hash("panjimNgo", 10); // temporary password
    const ngo = new Ngo({
      name: "panjim NGO",
      phone: "82991001",
      email: "panajingo@gmail.com",
      password: hashedPassword
    });

    await ngo.save();
    console.log("NGO added successfully ✅");
    mongoose.disconnect();
  } catch (err) {
    console.error("Error creating NGO:", err);
  }
}

createNgo();
