const express = require('express');
const router = express.Router();
const ngoController = require('../controllers/ngoController');
const isLoggedIn = require("../middlewares/isLoggedIn");
const isNgoLoggedIn = require("../middlewares/isNgoLoggedIn"); // ✅ keep this only

const LostPet = require("../models/lostPet");
const StrayPet = require("../models/strayPet");

router.get('/login', (req, res) => {
  res.render('ngoLogin', { error: [] });
});

// Handle login POST
router.post('/login', ngoController.loginNgo);

// NGO Dashboard
router.get("/dashboard", isNgoLoggedIn, async (req, res) => {
  try {
    const lostReports = await LostPet.find()
      .sort({ dateReported: -1 })
      .populate("assignedNGO", "name phone");

    const strayReports = await StrayPet.find()
      .sort({ dateReported: -1 })
      .populate("assignedNGO", "name phone");

    const reports = [...lostReports, ...strayReports];

     res.render("ngoDashboard", { reports, ngo: req.session.ngo });
  } catch (err) {
    console.error(err);
    res.status(500).send("Error loading dashboard");
  }
});

// Take Case Route
router.post('/take-case/:reportId', isNgoLoggedIn, async (req, res) => {
  try {
    const reportId = req.params.reportId;
    const ngoId = req.session.ngo._id;

    // Try to find and update in LostPet collection
    let updatedReport = await LostPet.findByIdAndUpdate(
      reportId,
      {
        assignedNGO: ngoId,
        status: 'Ongoing'
      },
      { new: true }
    );

    // If not found in LostPet, try StrayPet collection
    if (!updatedReport) {
      updatedReport = await StrayPet.findByIdAndUpdate(
        reportId,
        {
          assignedNGO: ngoId,
          status: 'Ongoing'
        },
        { new: true }
      );
    }

    if (!updatedReport) {
      return res.status(404).json({ error: 'Report not found' });
    }

    console.log('Case taken successfully:', updatedReport);
    res.redirect('/ngo/dashboard');
  } catch (error) {
    console.error('Error taking case:', error);
    res.status(500).json({ error: 'Failed to take case' });
  }
});

// Complete Case Route
router.post('/complete-case/:reportId', isNgoLoggedIn, async (req, res) => {
  try {
    const reportId = req.params.reportId;

    // Try to find and update in LostPet collection
    let updatedReport = await LostPet.findByIdAndUpdate(
      reportId,
      {
        status: 'Completed'
      },
      { new: true }
    );

    // If not found in LostPet, try StrayPet collection
    if (!updatedReport) {
      updatedReport = await StrayPet.findByIdAndUpdate(
        reportId,
        {
          status: 'Completed'
        },
        { new: true }
      );
    }

    if (!updatedReport) {
      return res.status(404).json({ error: 'Report not found' });
    }

    console.log('Case completed successfully:', updatedReport);
    res.redirect('/ngo/dashboard');
  } catch (error) {
    console.error('Error completing case:', error);
    res.status(500).json({ error: 'Failed to complete case' });
  }
});

// NGO Logout
router.get('/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      console.error('Session destruction error:', err);
      return res.redirect('/ngo/dashboard');
    }
    res.clearCookie('connect.sid'); // Clear session cookie
    res.redirect('/ngo/login');
  });
});

module.exports = router;
