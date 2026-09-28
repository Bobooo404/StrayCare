const Ngo = require('../models/ngo'); 
const LostPet = require('../models/lostPet');
const StrayPet = require('../models/strayPet');
const bcrypt = require('bcrypt');

module.exports.loginNgo = async (req, res) => {
  const { email, password } = req.body;

  try {
    const ngo = await Ngo.findOne({ email });
    if (!ngo) return res.render('ngoLogin', { error: ['Invalid email or password'] });

    const isMatch = await bcrypt.compare(password, ngo.password);
    if (!isMatch) return res.render('ngoLogin', { error: ['Invalid email or password'] });

    // ✅ Save NGO in session (keep only necessary details)
    req.session.ngo = {
      _id: ngo._id,
      name: ngo.name,
      email: ngo.email,
      phone: ngo.phone,
    };

    // ✅ Redirect instead of rendering dashboard
    res.redirect("/ngo/dashboard");

  } catch (err) {
    console.error(err);
    res.render('ngoLogin', { error: ['Something went wrong'] });
  }
};
