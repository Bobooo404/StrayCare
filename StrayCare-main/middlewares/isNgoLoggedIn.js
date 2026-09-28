// middlewares/isNgoLoggedIn.js
module.exports = function (req, res, next) {
  if (!req.session.ngo) {
    return res.redirect('/ngo/login'); // force login if not logged in
  }
  next(); // continue if NGO is logged in
};
