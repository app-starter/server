const express = require("express");

const app = express();
const PORT = 36001;
const cors = require("cors");

const routes = require("./routes");

const stripeController = require("./controller/stripe");
const passport = require("./config/passport");
const session = require("express-session");

app.use(express.urlencoded({ extended: false }));

app.use(cors());

app.use(session({
  secret: process.env.SESSION_SECRET || 'your_session_secret',
  resave: false,
  saveUninitialized: false,
  cookie: { secure: process.env.NODE_ENV === 'production' }
}));
app.use(passport.initialize());
app.use(passport.session());

app.post(
  "/webhook",
  express.raw({ type: "application/json" }),
  stripeController.webhook
);
app.use(express.json());
app.use(routes);

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
