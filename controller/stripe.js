const stripe = require("../config/stripe"); // Import Stripe configuration
const { PrismaClient } = require("@prisma/client");
const { connect } = require("../routes");
const prisma = new PrismaClient();

module.exports.createCheckoutSession = async (req, res) => {
  const { priceId } = req.body;

  const session = await stripe.checkout.sessions.create({
    payment_method_types: ["card"],
    line_items: [
      {
        price: priceId,
        quantity: 1,
      },
    ],
    mode: "subscription",
    metadata: {
      userId: req.user.id,
      planPriceId: priceId,
    },
    success_url: "http://localhost:3000",
    cancel_url: "https://your-cancel-url.com",
  });
  res.send({ id: session.id });
};
module.exports.webhook = async (req, res) => {
  const sig = req.headers["stripe-signature"];
  const endpointSecret =
    "whsec_bb9abbd94c119ffeb86a72a50d625e3ffa9d173c930aa472ea453072c4b92c87"; // Replace with your webhook secret
  let event;

  try {
    event = stripe.webhooks.constructEvent(req.body, sig, endpointSecret);
  } catch (err) {
    res.status(400).send(`Webhook Error: ${err.message}`);
    return;
  }

  switch (event.type) {
    case "checkout.session.completed":
      // Retrieve the session from the event
      const session = event.data.object;

      // Extract userId from metadata
      const userId = session.metadata.userId;
      const planPriceId = session.metadata.planPriceId;

      const subscription = await stripe.subscriptions.retrieve(
        session.subscription
      );

      const customerId = session.customer;

      await prisma.user.update({
        where: { id: parseInt(userId) },
        data: {
          stripeCustomerId: customerId,
        },
      });

      const plan = await prisma.plan.findFirst({
        where: {
          planPriceId: planPriceId,
        },
      });

      console.log("plan" + plan);
      // Retrieve or create a subscription in the database
      await prisma.subscription.create({
        data: {
          subscriptionId: session.subscription,
          status: "ACTIVE",
          startDate: new Date(session.created * 1000),
          endDate: new Date(session.expires_at * 1000),
          user: {
            connect: {
              id: parseInt(userId),
            },
          },
          plan: {
            connect: {
              id: plan.id,
            },
          },
        },
      });

      console.log(`Subscription created for user ${userId}`);
      break;
    default:
      console.log(`Unhandled event type ${event.type}`);
  }

  res.send({ received: true });
};
