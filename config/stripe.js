// stripe.js
const Stripe = require("stripe");
const stripe = Stripe(
  "sk_test_51PVbD1Ay4vwOMCax3OpBDnvDL394c4HcTcGHqyHLhHsaFgKTGABXqe3lZjmZajppuYRmlpXTfo1xg2GaHBwp838Z00Vye535na"
); // Replace with your secret key from Stripe Dashboard

module.exports = stripe;
