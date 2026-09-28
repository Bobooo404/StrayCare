require('dotenv').config(); 
const express = require("express");
const path = require("path");
const app = express();
const cookieParser = require("cookie-parser");

const expressSession = require("express-session");  // <-- added
const flash = require("connect-flash");            // <-- added


const indexRouter = require("./routes/index");
const userRouter = require("./routes/userRouter");
const ngoRouter = require('./routes/ngo');
const db = require("./config/mongoose-connection");

// Middleware to parse form and JSON data
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(cookieParser());   // this makes req.cookies available
app.use(express.static("public"));



app.use(
  expressSession({
    resave: false,
    saveUninitialized: false,
    secret: process.env.EXPRESS_SESSION_SECRET_KEY
  })
)
app.use(flash());

// Set view engine
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

// Routes
app.use("/", indexRouter);
app.use("/users", userRouter);
app.use('/ngo', ngoRouter);

app.listen(3000, () => {
  console.log("Server running on http://localhost:3000");
});
