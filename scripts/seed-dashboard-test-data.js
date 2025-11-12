const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcrypt");
require("dotenv").config();

const prisma = new PrismaClient();

async function seedTestData() {
  console.log("🌱 Starting test data seeding...\n");

  try {
    // 1. Test Planları Oluştur
    console.log("📋 Creating test plans...");
    
    const plans = [];
    
    // Starter Plan
    const starterPlan = await prisma.plan.upsert({
      where: { id: 1 },
      update: {},
      create: {
        name: "Starter",
        description: "Perfect for individuals and small projects",
        price: 9.99,
        interval: "MONTHLY",
        isActive: true,
        planPriceId: "price_starter_monthly",
        features: {
          create: [
            { name: "5 Projects", icon: "check" },
            { name: "10GB Storage", icon: "check" },
            { name: "Basic Support", icon: "check" },
          ]
        }
      }
    });
    plans.push(starterPlan);
    console.log(`  ✓ Created: ${starterPlan.name}`);

    // Pro Plan
    const proPlan = await prisma.plan.upsert({
      where: { id: 2 },
      update: {},
      create: {
        name: "Pro",
        description: "For growing teams and businesses",
        price: 29.99,
        interval: "MONTHLY",
        isActive: true,
        planPriceId: "price_pro_monthly",
        features: {
          create: [
            { name: "Unlimited Projects", icon: "check" },
            { name: "100GB Storage", icon: "check" },
            { name: "Priority Support", icon: "check" },
            { name: "Advanced Analytics", icon: "check" },
          ]
        }
      }
    });
    plans.push(proPlan);
    console.log(`  ✓ Created: ${proPlan.name}`);

    // Enterprise Plan (Yearly)
    const enterprisePlan = await prisma.plan.upsert({
      where: { id: 3 },
      update: {},
      create: {
        name: "Enterprise",
        description: "For large organizations",
        price: 299.99,
        interval: "YEARLY",
        isActive: true,
        planPriceId: "price_enterprise_yearly",
        features: {
          create: [
            { name: "Everything in Pro", icon: "check" },
            { name: "Unlimited Storage", icon: "check" },
            { name: "24/7 Support", icon: "check" },
            { name: "Custom Integrations", icon: "check" },
            { name: "Dedicated Account Manager", icon: "check" },
          ]
        }
      }
    });
    plans.push(enterprisePlan);
    console.log(`  ✓ Created: ${enterprisePlan.name}`);

    // 2. Test Kullanıcıları Oluştur
    console.log("\n👥 Creating test users...");
    
    const testUsers = [];
    const userNames = [
      { name: "John Doe", email: "john@example.com", platform: "web" },
      { name: "Jane Smith", email: "jane@example.com", platform: "mobile" },
      { name: "Bob Wilson", email: "bob@example.com", platform: "web" },
      { name: "Alice Brown", email: "alice@example.com", platform: "mobile" },
      { name: "Charlie Davis", email: "charlie@example.com", platform: "web" },
      { name: "Diana Evans", email: "diana@example.com", platform: "mobile" },
      { name: "Frank Miller", email: "frank@example.com", platform: "web" },
      { name: "Grace Lee", email: "grace@example.com", platform: "mobile" },
      { name: "Henry Taylor", email: "henry@example.com", platform: "web" },
      { name: "Ivy Chen", email: "ivy@example.com", platform: "web" },
    ];

    const password = await bcrypt.hash("password123", 10);

    for (const userData of userNames) {
      const user = await prisma.user.upsert({
        where: { email: userData.email },
        update: {},
        create: {
          name: userData.name,
          email: userData.email,
          password: password,
          status: "ACTIVE",
          lastLoginAt: getRandomDate(30), // Son 30 gün içinde
          lastLoginIp: `192.168.1.${Math.floor(Math.random() * 255)}`,
          lastLoginPlatform: userData.platform,
          preferredLanguage: "en",
        }
      });
      testUsers.push(user);
      console.log(`  ✓ Created: ${user.name} (${user.lastLoginPlatform})`);
    }

    // 3. Subscriptionlar Oluştur
    console.log("\n💳 Creating subscriptions...");
    
    const subscriptions = [];
    
    // İlk 6 kullanıcıya aktif subscription
    for (let i = 0; i < 6; i++) {
      const user = testUsers[i];
      const plan = plans[i % plans.length]; // Planları döngüsel olarak dağıt
      
      const startDate = getRandomDate(90); // Son 90 gün içinde başlamış
      const endDate = new Date(startDate);
      
      if (plan.interval === "MONTHLY") {
        endDate.setMonth(endDate.getMonth() + 1);
      } else {
        endDate.setFullYear(endDate.getFullYear() + 1);
      }

      const subscription = await prisma.subscription.create({
        data: {
          userId: user.id,
          planId: plan.id,
          status: "ACTIVE",
          subscriptionId: `sub_${user.id}_${Date.now()}`,
          startDate: startDate,
          endDate: endDate,
          nextBillingDate: endDate,
          purchasePlatform: user.lastLoginPlatform,
        }
      });
      subscriptions.push(subscription);
      console.log(`  ✓ ${user.name} → ${plan.name} (${plan.interval})`);
    }

    // 2 kullanıcıya iptal edilmiş subscription
    for (let i = 6; i < 8; i++) {
      const user = testUsers[i];
      const plan = plans[i % plans.length];
      
      const startDate = getRandomDate(120);
      const cancelDate = getRandomDate(30);
      const endDate = new Date(cancelDate);
      endDate.setMonth(endDate.getMonth() + 1);

      await prisma.subscription.create({
        data: {
          userId: user.id,
          planId: plan.id,
          status: "CANCELED",
          subscriptionId: `sub_${user.id}_${Date.now()}`,
          startDate: startDate,
          endDate: endDate,
          canceledAt: cancelDate,
          cancelReason: "Too expensive",
          purchasePlatform: user.lastLoginPlatform,
        }
      });
      console.log(`  ✓ ${user.name} → ${plan.name} (CANCELED)`);
    }

    // 4. Transactionlar Oluştur
    console.log("\n💰 Creating transactions...");
    
    let transactionCount = 0;
    
    for (const subscription of subscriptions) {
      const plan = plans.find(p => p.id === subscription.planId);
      const user = testUsers.find(u => u.id === subscription.userId);
      
      // Her aktif subscription için birkaç transaction
      const numTransactions = Math.floor(Math.random() * 3) + 1;
      
      for (let i = 0; i < numTransactions; i++) {
        await prisma.transaction.create({
          data: {
            userId: subscription.userId,
            subscriptionId: subscription.id,
            amount: plan.price,
            currency: "usd",
            status: "succeeded",
            stripePaymentId: `pi_${Date.now()}_${Math.random().toString(36).substring(7)}`,
            platform: user.lastLoginPlatform,
            createdAt: getRandomDate(90),
          }
        });
        transactionCount++;
      }
    }
    console.log(`  ✓ Created ${transactionCount} transactions`);

    // 5. Birkaç başarısız transaction
    for (let i = 0; i < 3; i++) {
      const user = testUsers[Math.floor(Math.random() * testUsers.length)];
      await prisma.transaction.create({
        data: {
          userId: user.id,
          amount: 29.99,
          currency: "usd",
          status: "failed",
          platform: user.lastLoginPlatform,
          metadata: JSON.stringify({ error: "Card declined" }),
          createdAt: getRandomDate(30),
        }
      });
    }
    console.log(`  ✓ Created 3 failed transactions`);

    // 6. Audit Logs Oluştur
    console.log("\n📝 Creating audit logs...");
    
    const actions = [
      "USER_CREATE", "USER_UPDATE", "USER_DELETE",
      "SUBSCRIPTION_CREATE", "SUBSCRIPTION_UPDATE", "SUBSCRIPTION_CANCEL",
      "PLAN_CREATE", "PLAN_UPDATE"
    ];

    for (let i = 0; i < 50; i++) {
      const user = testUsers[Math.floor(Math.random() * testUsers.length)];
      const action = actions[Math.floor(Math.random() * actions.length)];
      
      await prisma.auditLog.create({
        data: {
          userId: user.id,
          action: action,
          entityType: action.split("_")[0],
          entityId: Math.floor(Math.random() * 100),
          ipAddress: `192.168.1.${Math.floor(Math.random() * 255)}`,
          userAgent: "Mozilla/5.0 (Test Browser)",
          platform: user.lastLoginPlatform,
          createdAt: getRandomDate(60),
        }
      });
    }
    console.log(`  ✓ Created 50 audit logs`);

    // 7. Email Logs Oluştur
    console.log("\n📧 Creating email logs...");
    
    for (let i = 0; i < 30; i++) {
      const user = testUsers[Math.floor(Math.random() * testUsers.length)];
      const templates = ["WELCOME", "PASSWORD_RESET", "SUBSCRIPTION_CONFIRMED", "PAYMENT_SUCCESS"];
      const template = templates[Math.floor(Math.random() * templates.length)];
      const status = Math.random() > 0.1 ? "sent" : "failed";
      
      await prisma.emailLog.create({
        data: {
          userId: user.id,
          templateName: template,
          to: user.email,
          subject: `${template} Email`,
          status: status,
          errorMessage: status === "failed" ? "SMTP Error" : null,
          sentAt: getRandomDate(30),
        }
      });
    }
    console.log(`  ✓ Created 30 email logs`);

    // 8. Notifications Oluştur
    console.log("\n🔔 Creating notifications...");
    
    const notificationTypes = ["info", "warning", "success"];
    const notificationMessages = [
      { title: "Welcome!", message: "Thank you for joining us" },
      { title: "Payment Received", message: "Your payment has been processed" },
      { title: "Subscription Expiring", message: "Your subscription will expire soon" },
      { title: "New Feature", message: "Check out our new feature" },
    ];

    for (let i = 0; i < 20; i++) {
      const user = testUsers[Math.floor(Math.random() * testUsers.length)];
      const notif = notificationMessages[Math.floor(Math.random() * notificationMessages.length)];
      
      await prisma.notification.create({
        data: {
          userId: user.id,
          type: notificationTypes[Math.floor(Math.random() * notificationTypes.length)],
          title: notif.title,
          message: notif.message,
          isRead: Math.random() > 0.5,
          targetPlatform: "all",
          createdAt: getRandomDate(30),
        }
      });
    }
    console.log(`  ✓ Created 20 notifications`);

    console.log("\n✅ Test data seeding completed successfully!");
    console.log("\n📊 Summary:");
    console.log(`  • ${plans.length} Plans`);
    console.log(`  • ${testUsers.length} Users`);
    console.log(`  • ${subscriptions.length} Active Subscriptions`);
    console.log(`  • ${transactionCount + 3} Transactions`);
    console.log(`  • 50 Audit Logs`);
    console.log(`  • 30 Email Logs`);
    console.log(`  • 20 Notifications`);
    console.log("\n🎉 Your dashboard is now ready with test data!");
    
  } catch (error) {
    console.error("❌ Error seeding test data:", error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Yardımcı fonksiyon: Rastgele geçmiş tarih
function getRandomDate(daysAgo) {
  const date = new Date();
  const randomDays = Math.floor(Math.random() * daysAgo);
  date.setDate(date.getDate() - randomDays);
  return date;
}

// Script'i çalıştır
seedTestData()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

