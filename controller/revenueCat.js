const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

// RevenueCat Webhook Handler
// Documentation: https://docs.revenuecat.com/docs/webhooks

exports.handleWebhook = async (req, res) => {
  try {
    const event = req.body;
    
    console.log('RevenueCat Webhook received:', event.type);

    // Verify webhook (in production, verify the signature)
    // const signature = req.headers['x-revenuecat-signature'];
    // if (!verifyWebhookSignature(signature, req.body)) {
    //   return res.status(401).json({ message: 'Invalid signature' });
    // }

    // Handle different event types
    switch (event.type) {
      case 'INITIAL_PURCHASE':
        await handleInitialPurchase(event);
        break;

      case 'RENEWAL':
        await handleRenewal(event);
        break;

      case 'CANCELLATION':
        await handleCancellation(event);
        break;

      case 'UNCANCELLATION':
        await handleUncancellation(event);
        break;

      case 'NON_RENEWING_PURCHASE':
        await handleNonRenewingPurchase(event);
        break;

      case 'SUBSCRIPTION_EXTENDED':
        await handleSubscriptionExtended(event);
        break;

      case 'EXPIRATION':
        await handleExpiration(event);
        break;

      case 'BILLING_ISSUE':
        await handleBillingIssue(event);
        break;

      case 'PRODUCT_CHANGE':
        await handleProductChange(event);
        break;

      default:
        console.log('Unhandled event type:', event.type);
    }

    res.json({ received: true });
  } catch (error) {
    console.error('Error handling RevenueCat webhook:', error);
    res.status(500).json({ message: 'Webhook handler failed' });
  }
};

// Handle initial purchase
async function handleInitialPurchase(event) {
  try {
    const { app_user_id, product_id, entitlement_id, purchased_at, expiration_at, store } = event.event;

    // Find user by app_user_id (should be the user's ID in our system)
    const user = await prisma.user.findUnique({
      where: { id: parseInt(app_user_id) },
    });

    if (!user) {
      console.error('User not found for app_user_id:', app_user_id);
      return;
    }

    // Map product_id to plan (you'll need to configure this mapping)
    const plan = await findPlanByProductId(product_id);
    if (!plan) {
      console.error('Plan not found for product_id:', product_id);
      return;
    }

    // Create subscription
    await prisma.subscription.create({
      data: {
        userId: user.id,
        planId: plan.id,
        status: 'ACTIVE',
        subscriptionId: event.id,
        startDate: new Date(purchased_at),
        endDate: new Date(expiration_at),
        purchasePlatform: 'mobile',
        revenueCatProductId: product_id,
        revenueCatCustomerId: app_user_id,
        revenueCatEntitlement: entitlement_id,
        store: store,
        nextBillingDate: new Date(expiration_at),
      },
    });

    // Create transaction record
    await prisma.transaction.create({
      data: {
        userId: user.id,
        amount: plan.price,
        currency: 'USD',
        status: 'COMPLETED',
        paymentMethod: store === 'APP_STORE' ? 'apple_pay' : 'google_pay',
        platform: 'mobile',
        transactionId: event.id,
        description: `${plan.name} - Initial Purchase`,
      },
    });

    console.log('Initial purchase processed:', app_user_id);
  } catch (error) {
    console.error('Error handling initial purchase:', error);
    throw error;
  }
}

// Handle renewal
async function handleRenewal(event) {
  try {
    const { app_user_id, product_id, expiration_at } = event.event;

    const subscription = await prisma.subscription.findFirst({
      where: {
        userId: parseInt(app_user_id),
        revenueCatProductId: product_id,
        status: 'ACTIVE',
      },
      include: {
        plan: true,
        user: true,
      },
    });

    if (subscription) {
      // Update subscription
      await prisma.subscription.update({
        where: { id: subscription.id },
        data: {
          endDate: new Date(expiration_at),
          nextBillingDate: new Date(expiration_at),
          updatedAt: new Date(),
        },
      });

      // Create transaction record
      await prisma.transaction.create({
        data: {
          userId: subscription.userId,
          subscriptionId: subscription.id,
          amount: subscription.plan.price,
          currency: 'USD',
          status: 'COMPLETED',
          paymentMethod: subscription.store === 'APP_STORE' ? 'apple_pay' : 'google_pay',
          platform: 'mobile',
          transactionId: event.id,
          description: `${subscription.plan.name} - Renewal`,
        },
      });

      console.log('Renewal processed:', app_user_id);
    }
  } catch (error) {
    console.error('Error handling renewal:', error);
    throw error;
  }
}

// Handle cancellation
async function handleCancellation(event) {
  try {
    const { app_user_id, product_id, cancellation_at } = event.event;

    const subscription = await prisma.subscription.findFirst({
      where: {
        userId: parseInt(app_user_id),
        revenueCatProductId: product_id,
        status: 'ACTIVE',
      },
    });

    if (subscription) {
      await prisma.subscription.update({
        where: { id: subscription.id },
        data: {
          status: 'CANCELED',
          canceledAt: new Date(cancellation_at),
          cancelReason: 'User cancelled subscription',
          updatedAt: new Date(),
        },
      });

      console.log('Cancellation processed:', app_user_id);
    }
  } catch (error) {
    console.error('Error handling cancellation:', error);
    throw error;
  }
}

// Handle uncancellation
async function handleUncancellation(event) {
  try {
    const { app_user_id, product_id } = event.event;

    const subscription = await prisma.subscription.findFirst({
      where: {
        userId: parseInt(app_user_id),
        revenueCatProductId: product_id,
        status: 'CANCELED',
      },
    });

    if (subscription) {
      await prisma.subscription.update({
        where: { id: subscription.id },
        data: {
          status: 'ACTIVE',
          canceledAt: null,
          cancelReason: null,
          updatedAt: new Date(),
        },
      });

      console.log('Uncancellation processed:', app_user_id);
    }
  } catch (error) {
    console.error('Error handling uncancellation:', error);
    throw error;
  }
}

// Handle non-renewing purchase
async function handleNonRenewingPurchase(event) {
  // Similar to initial purchase but doesn't renew
  await handleInitialPurchase(event);
}

// Handle subscription extended
async function handleSubscriptionExtended(event) {
  try {
    const { app_user_id, product_id, expiration_at } = event.event;

    const subscription = await prisma.subscription.findFirst({
      where: {
        userId: parseInt(app_user_id),
        revenueCatProductId: product_id,
      },
    });

    if (subscription) {
      await prisma.subscription.update({
        where: { id: subscription.id },
        data: {
          endDate: new Date(expiration_at),
          nextBillingDate: new Date(expiration_at),
          updatedAt: new Date(),
        },
      });

      console.log('Subscription extended:', app_user_id);
    }
  } catch (error) {
    console.error('Error handling subscription extended:', error);
    throw error;
  }
}

// Handle expiration
async function handleExpiration(event) {
  try {
    const { app_user_id, product_id } = event.event;

    const subscription = await prisma.subscription.findFirst({
      where: {
        userId: parseInt(app_user_id),
        revenueCatProductId: product_id,
      },
    });

    if (subscription) {
      await prisma.subscription.update({
        where: { id: subscription.id },
        data: {
          status: 'EXPIRED',
          updatedAt: new Date(),
        },
      });

      console.log('Expiration processed:', app_user_id);
    }
  } catch (error) {
    console.error('Error handling expiration:', error);
    throw error;
  }
}

// Handle billing issue
async function handleBillingIssue(event) {
  try {
    const { app_user_id, product_id } = event.event;

    // You might want to notify the user or take other actions
    console.log('Billing issue for user:', app_user_id, 'product:', product_id);

    // Optionally update subscription status or create notification
  } catch (error) {
    console.error('Error handling billing issue:', error);
    throw error;
  }
}

// Handle product change (upgrade/downgrade)
async function handleProductChange(event) {
  try {
    const { app_user_id, new_product_id, old_product_id } = event.event;

    const subscription = await prisma.subscription.findFirst({
      where: {
        userId: parseInt(app_user_id),
        revenueCatProductId: old_product_id,
      },
    });

    if (subscription) {
      const newPlan = await findPlanByProductId(new_product_id);
      if (newPlan) {
        await prisma.subscription.update({
          where: { id: subscription.id },
          data: {
            previousPlanId: subscription.planId,
            planId: newPlan.id,
            revenueCatProductId: new_product_id,
            updatedAt: new Date(),
          },
        });

        console.log('Product change processed:', app_user_id);
      }
    }
  } catch (error) {
    console.error('Error handling product change:', error);
    throw error;
  }
}

// Helper function to find plan by RevenueCat product ID
async function findPlanByProductId(productId) {
  try {
    // Look up plan by revenueCatProductId field (from schema)
    const plan = await prisma.plan.findFirst({
      where: {
        revenueCatProductId: productId,
      },
    });

    if (!plan) {
      console.warn(`No plan found with revenueCatProductId: ${productId}`);
      console.warn('Make sure to set revenueCatProductId on your plans in the database.');
    }

    return plan;
  } catch (error) {
    console.error('Error finding plan:', error);
    return null;
  }
}

// Sync customer info from mobile app
exports.syncCustomerInfo = async (req, res) => {
  try {
    const { customerInfo } = req.body;
    const userId = req.user.id;

    console.log('Syncing customer info for user:', userId);

    // Extract active entitlements
    const activeEntitlements = customerInfo.entitlements?.active || {};

    for (const [entitlementId, entitlement] of Object.entries(activeEntitlements)) {
      const productId = entitlement.productIdentifier;
      
      // Find or create subscription
      let subscription = await prisma.subscription.findFirst({
        where: {
          userId: userId,
          revenueCatProductId: productId,
        },
      });

      const plan = await findPlanByProductId(productId);
      if (!plan) {
        console.error('Plan not found for product:', productId);
        continue;
      }

      if (subscription) {
        // Update existing subscription
        await prisma.subscription.update({
          where: { id: subscription.id },
          data: {
            status: entitlement.isActive ? 'ACTIVE' : 'EXPIRED',
            endDate: new Date(entitlement.expirationDate),
            revenueCatEntitlement: entitlementId,
            store: entitlement.store,
            updatedAt: new Date(),
          },
        });
      } else {
        // Create new subscription
        await prisma.subscription.create({
          data: {
            userId: userId,
            planId: plan.id,
            status: entitlement.isActive ? 'ACTIVE' : 'EXPIRED',
            subscriptionId: `rc_${userId}_${Date.now()}`,
            startDate: new Date(entitlement.originalPurchaseDate),
            endDate: new Date(entitlement.expirationDate),
            purchasePlatform: 'mobile',
            revenueCatProductId: productId,
            revenueCatCustomerId: userId.toString(),
            revenueCatEntitlement: entitlementId,
            store: entitlement.store,
            nextBillingDate: new Date(entitlement.expirationDate),
          },
        });
      }
    }

    res.json({ message: 'Customer info synced successfully' });
  } catch (error) {
    console.error('Error syncing customer info:', error);
    res.status(500).json({ message: 'Failed to sync customer info' });
  }
};

// Get subscription by RevenueCat data
exports.getRevenueCatSubscription = async (req, res) => {
  try {
    const userId = req.user.id;

    const subscription = await prisma.subscription.findFirst({
      where: {
        userId: userId,
        revenueCatProductId: { not: null },
        status: 'ACTIVE',
      },
      include: {
        plan: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    if (!subscription) {
      return res.status(404).json({ message: 'No RevenueCat subscription found' });
    }

    res.json(subscription);
  } catch (error) {
    console.error('Error getting RevenueCat subscription:', error);
    res.status(500).json({ message: 'Failed to get subscription' });
  }
};

