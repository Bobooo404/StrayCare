const express = require('express');
const router = express.Router();
const upload = require("../config/multer-config");
const LostPet = require("../models/lostPet");
const StrayPet = require("../models/strayPet");
//const AdoptionPet = require("../models/adoptionPet");
const { registerUser, loginUser, logout } = require("../controllers/authController");

const isLoggedIn = require("../middlewares/isLoggedIn");

router.get("/", (req, res) => {
  res.send("hey its working");
});

router.get("/report", isLoggedIn, async (req, res) => {
  try {
    const lostReports = await LostPet.find({ reportedBy: req.user._id })
      .populate("assignedNGO", "name phone");  // ✅ populate NGO details

    const strayReports = await StrayPet.find({ reportedBy: req.user._id })
      .populate("assignedNGO", "name phone");  // ✅ populate NGO details

    const allReports = [...lostReports, ...strayReports];

    res.render("report", { user: req.user, reports: allReports });
  } catch (err) {
    console.error(err);
    res.status(500).send("Error fetching reports");
  }
});



router.get("/report/lost", isLoggedIn, (req, res) => {
  res.render("reportForm", { user: req.user, subject: "Report Lost" });
});

router.get("/report/stray", isLoggedIn, (req, res) => {
  res.render("reportForm", { user: req.user, subject: "Report Stray" });
  
});

router.get("/report/injured", isLoggedIn, (req, res) => {
  res.render("reportForm", { user: req.user, subject: "Report Injured" });
});

router.get("/report/adoption", isLoggedIn, (req, res) => {
  res.render("adoptionForm", { user: req.user });
});

// ⬇️ Add this here
router.get("/adoption", isLoggedIn, async (req, res) => {
  try {
    const pets = await AdoptionPet.find().populate("postedBy", "fullname");
    res.render("adoptionList", { user: req.user, pets });
  } catch (err) {
    console.error(err);
    res.status(500).send("Error fetching adoption pets");
  }
});


router.post("/report/submit", isLoggedIn, upload.single("image"), async (req, res) => {
  try {
    const { fullname,contact, subject, description, latitude, longitude } = req.body;

    // Correct model selection
    const Model = subject.includes("Lost") ? LostPet : StrayPet;

    const newReport = await Model.create({
      fullname,
      contact,
      subject,
      description,
      imagePath: req.file ? `/images/${req.file.filename}` : null,
      location: {
        type: "Point",
        coordinates: [parseFloat(longitude), parseFloat(latitude)],
      },
      reportedBy: req.user._id
    });

    console.log("Created report:", newReport); // debug
    res.send("Report submitted successfully!");
  } catch (err) {
    console.error(err);
    res.status(500).send("Error submitting report");
  }
});

const AdoptionPet = require("../models/adoptionPet");

router.post("/report/adoption", isLoggedIn, upload.single("image"), async (req, res) => {
  try {
    const { ownersName, petName, petType, age, description, contact } = req.body;

    const newAdoption = await AdoptionPet.create({
      ownersName,
      petName,
      petType,
      age,
      description,
      contact,
      imagePath: req.file ? `/images/${req.file.filename}` : null,
      postedBy: req.user._id
    });

    console.log("Adoption report created:", newAdoption);
    res.send("Adoption report submitted successfully!");
  } catch (err) {
    console.error(err);
    res.status(500).send("Error submitting adoption report");
  }
});


router.post("/register", registerUser);

router.post("/login", loginUser);

router.get("/logout", logout);

module.exports = router;
