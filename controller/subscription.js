const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

exports.getSubscriptions = async (req, res) => {
  try {
    const subscriptions = await prisma.subscription.findMany({
      include: {
        user: true,
        plan: true,
      },
    });
    res.json(subscriptions);
  } catch (error) {
    res.status(500).send(error.message);
  }
};

exports.getSubscription = async (req, res) => {
  try {
    const subscription = await prisma.subscription.findUnique({
      where: { id: parseInt(req.params.id) },
      include: {
        user: true,
        plan: true,
      },
    });

    if (!subscription) {
      return res.status(404).json({ message: "Subscription not found" });
    }

    res.json(subscription);
  } catch (error) {
    res.status(500).send(error.message);
  }
};

exports.createSubscription = async (req, res) => {
  try {
    const subscription = await prisma.subscription.create({
      data: {
        userId: parseInt(req.body.userId),
        planId: parseInt(req.body.planId),
        startDate: new Date(req.body.startDate),
        endDate: new Date(req.body.endDate),
        status: req.body.status,
      },
    });
    res.json(subscription);
  } catch (error) {
    res.status(500).send(error.message);
  }
};

exports.updateSubscription = async (req, res) => {
  try {
    const subscription = await prisma.subscription.update({
      where: { id: parseInt(req.params.id) },
      data: {
        userId: parseInt(req.body.userId),
        planId: parseInt(req.body.planId),
        startDate: new Date(req.body.startDate),
        endDate: new Date(req.body.endDate),
        status: req.body.status,
      },
    });
    res.json(subscription);
  } catch (error) {
    res.status(500).send(error.message);
  }
};

exports.deleteSubscription = async (req, res) => {
  try {
    await prisma.subscription.delete({
      where: { id: parseInt(req.params.id) },
    });

    res.json({ message: "Subscription deleted" });
  } catch (error) {
    res.status(500).send(error.message);
  }
};