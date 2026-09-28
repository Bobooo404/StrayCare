const jwt = require("jsonwebtoken");
const userModel = require("../models/user");

module.exports = async function (req, res, next){
  const token = req.cookies.token;  

  if(!req.cookies.token){
    req.flash("error", "you need to login first");
    return res.redirect("/");
  }

  try{
    const decoded = jwt.verify(token, process.env.JWT_KEY);

    // If you want full user info from DB, fetch it:
    const user = await userModel.findById(decoded.id).select("-password");
    
    if (!user) {
      req.flash("error", "User not found");
      return res.redirect("/");
    }

    req.user = user; // ✅ available in EJS

    next();
  } catch(err){
    req.flash("error", "invalid token");
    res.redirect("/");
  }
}