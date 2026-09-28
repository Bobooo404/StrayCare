const userModel = require("../models/user");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const { generateToken } = require("../utils/generateToken");

module.exports.registerUser = async function (req, res) {
  try {
    let { email, password, fullname } = req.body;

    // Check if user already exists
    let user = await userModel.findOne({ email: email });
    if (user) {
      req.flash("error", "You already have an account. Please login.");
      return res.redirect("/");
    }


    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash(password, salt);

    // Create new user
    user = await userModel.create({
      email,
      password: hash,
      fullname,
    });

    // Generate token
    let token = generateToken(user);
    res.cookie("token", token);
    req.flash("success", "Account created successfully! Please login.");
    res.redirect("/");
  } catch (err) {
    res.status(500).send(err.message);
  }
};

module.exports.loginUser = async function (req, res) {
  let { email, password } = req.body;

  let user = await userModel.findOne({ email: email });
  if (!user) {
      req.flash("error", "User does not exist");
      return res.redirect("/"); // redirect to login page (index.ejs)
  }

  bcrypt.compare(password, user.password, function(err, result){
    if(result){
      let token = generateToken(user);
      res.cookie("token", token);
      req.flash("success", "Logged in successfully!");
      res.redirect("/users/report");
    }
    else{
      req.flash("error", "Email or password incorrect");
      return res.redirect("/");
    }
  })
}

module.exports.logout = function (req, res){
  res.cookie("token", "", { expires: new Date(0) });
  res.redirect("/");
}