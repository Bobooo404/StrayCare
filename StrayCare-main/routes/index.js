const express = require("express");
const router = express.Router();
const isLoggedin = require("../middlewares/isLoggedIn");

router.get("/", function (req, res) {
  res.render("index", {
    error: req.flash("error"),
    success: req.flash("success")
  });
});




module.exports = router;