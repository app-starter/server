const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

// Dashboard genel istatistikleri
exports.getDashboardStats = async (req, res) => {
  try {
    // Toplam kullanıcı sayısı
    const totalUsers = await prisma.user.count();

    // Aktif kullanıcı sayısı
    const activeUsers = await prisma.user.count({
      where: { status: "ACTIVE" },
    });

    // Toplam abonelik sayısı
    const totalSubscriptions = await prisma.subscription.count();

    // Aktif abonelik sayısı
    const activeSubscriptions = await prisma.subscription.count({
      where: { status: "ACTIVE" },
    });

    // Aylık tekrarlayan gelir (MRR) hesaplama
    const activeMonthlySubscriptions = await prisma.subscription.findMany({
      where: {
        status: "ACTIVE",
      },
      include: {
        plan: true,
      },
    });

    let mrr = 0;
    let arr = 0;

    activeMonthlySubscriptions.forEach((sub) => {
      if (sub.plan.interval === "MONTHLY") {
        mrr += sub.plan.price;
        arr += sub.plan.price * 12;
      } else if (sub.plan.interval === "YEARLY") {
        mrr += sub.plan.price / 12;
        arr += sub.plan.price;
      }
    });

    // Son 30 gündeki yeni kullanıcılar
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const newUsersLast30Days = await prisma.user.count({
      where: {
        createdAt: {
          gte: thirtyDaysAgo,
        },
      },
    });

    // Son 30 gündeki yeni abonelikler
    const newSubscriptionsLast30Days = await prisma.subscription.count({
      where: {
        createdAt: {
          gte: thirtyDaysAgo,
        },
      },
    });

    // Platform dağılımı (web vs mobile)
    const platformDistribution = await prisma.user.groupBy({
      by: ["lastLoginPlatform"],
      _count: true,
    });

    // Plan dağılımı
    const planDistribution = await prisma.subscription.groupBy({
      by: ["planId"],
      where: {
        status: "ACTIVE",
      },
      _count: true,
    });

    // Plan detayları ile birleştir
    const planDistributionWithDetails = await Promise.all(
      planDistribution.map(async (item) => {
        const plan = await prisma.plan.findUnique({
          where: { id: item.planId },
        });
        return {
          planId: item.planId,
          planName: plan?.name || "Unknown",
          count: item._count,
        };
      })
    );

    // Son 6 ayın gelir trendi
    const revenueData = await getRevenueByMonth(6);

    // Son kayıt olan 5 kullanıcı
    const recentUsers = await prisma.user.findMany({
      take: 5,
      orderBy: {
        createdAt: "desc",
      },
      select: {
        id: true,
        email: true,
        name: true,
        createdAt: true,
        status: true,
        lastLoginPlatform: true,
      },
    });

    // Son 5 abonelik
    const recentSubscriptions = await prisma.subscription.findMany({
      take: 5,
      orderBy: {
        createdAt: "desc",
      },
      include: {
        user: {
          select: {
            email: true,
            name: true,
          },
        },
        plan: {
          select: {
            name: true,
            price: true,
            interval: true,
          },
        },
      },
    });

    res.json({
      totalUsers,
      activeUsers,
      totalSubscriptions,
      activeSubscriptions,
      mrr: Math.round(mrr * 100) / 100,
      arr: Math.round(arr * 100) / 100,
      newUsersLast30Days,
      newSubscriptionsLast30Days,
      platformDistribution,
      planDistribution: planDistributionWithDetails,
      revenueData,
      recentUsers,
      recentSubscriptions,
    });
  } catch (error) {
    console.error("Dashboard stats error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

// Gelir analitiği
exports.getRevenueAnalytics = async (req, res) => {
  try {
    const { months = 12 } = req.query;

    // Aylık gelir trendi
    const revenueByMonth = await getRevenueByMonth(parseInt(months));

    // Plan bazlı gelir dağılımı
    const revenueByPlan = await prisma.subscription.groupBy({
      by: ["planId"],
      where: {
        status: "ACTIVE",
      },
      _sum: {
        planId: true,
      },
    });

    const revenueByPlanWithDetails = await Promise.all(
      revenueByPlan.map(async (item) => {
        const plan = await prisma.plan.findUnique({
          where: { id: item.planId },
        });
        const count = await prisma.subscription.count({
          where: {
            planId: item.planId,
            status: "ACTIVE",
          },
        });
        const revenue =
          plan.interval === "MONTHLY"
            ? plan.price * count
            : (plan.price / 12) * count;
        return {
          planName: plan?.name || "Unknown",
          revenue: Math.round(revenue * 100) / 100,
          subscribers: count,
        };
      })
    );

    // Platform bazlı gelir (web vs mobile)
    const revenueByPlatform = await prisma.subscription.groupBy({
      by: ["purchasePlatform"],
      where: {
        status: "ACTIVE",
      },
      _count: true,
    });

    const revenueByPlatformWithDetails = await Promise.all(
      revenueByPlatform.map(async (item) => {
        const subscriptions = await prisma.subscription.findMany({
          where: {
            purchasePlatform: item.purchasePlatform,
            status: "ACTIVE",
          },
          include: {
            plan: true,
          },
        });

        let revenue = 0;
        subscriptions.forEach((sub) => {
          if (sub.plan.interval === "MONTHLY") {
            revenue += sub.plan.price;
          } else {
            revenue += sub.plan.price / 12;
          }
        });

        return {
          platform: item.purchasePlatform || "unknown",
          revenue: Math.round(revenue * 100) / 100,
          subscribers: item._count,
        };
      })
    );

    // Churn rate hesaplama (son 30 gün)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const canceledSubscriptions = await prisma.subscription.count({
      where: {
        status: "CANCELED",
        canceledAt: {
          gte: thirtyDaysAgo,
        },
      },
    });

    const totalActiveSubscriptions = await prisma.subscription.count({
      where: {
        status: "ACTIVE",
      },
    });

    const churnRate =
      totalActiveSubscriptions > 0
        ? (canceledSubscriptions / totalActiveSubscriptions) * 100
        : 0;

    res.json({
      revenueByMonth,
      revenueByPlan: revenueByPlanWithDetails,
      revenueByPlatform: revenueByPlatformWithDetails,
      churnRate: Math.round(churnRate * 100) / 100,
    });
  } catch (error) {
    console.error("Revenue analytics error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

// Kullanıcı büyüme analitiği
exports.getUserGrowthAnalytics = async (req, res) => {
  try {
    const { months = 12 } = req.query;

    const data = [];
    const now = new Date();

    for (let i = parseInt(months) - 1; i >= 0; i--) {
      const startDate = new Date(
        now.getFullYear(),
        now.getMonth() - i,
        1
      );
      const endDate = new Date(
        now.getFullYear(),
        now.getMonth() - i + 1,
        0
      );

      const newUsers = await prisma.user.count({
        where: {
          createdAt: {
            gte: startDate,
            lte: endDate,
          },
        },
      });

      const totalUsers = await prisma.user.count({
        where: {
          createdAt: {
            lte: endDate,
          },
        },
      });

      data.push({
        month: startDate.toLocaleDateString("en-US", {
          month: "short",
          year: "numeric",
        }),
        newUsers,
        totalUsers,
      });
    }

    res.json(data);
  } catch (error) {
    console.error("User growth analytics error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

// Yardımcı fonksiyon: Aylık gelir hesaplama
async function getRevenueByMonth(months) {
  const data = [];
  const now = new Date();

  for (let i = months - 1; i >= 0; i--) {
    const startDate = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const endDate = new Date(now.getFullYear(), now.getMonth() - i + 1, 0);

    // O ay içinde aktif olan abonelikleri bul
    const subscriptions = await prisma.subscription.findMany({
      where: {
        OR: [
          {
            AND: [
              { startDate: { lte: endDate } },
              { status: "ACTIVE" },
            ],
          },
          {
            AND: [
              { startDate: { lte: endDate } },
              { status: "CANCELED" },
              { canceledAt: { gte: startDate } },
            ],
          },
        ],
      },
      include: {
        plan: true,
      },
    });

    let revenue = 0;
    subscriptions.forEach((sub) => {
      if (sub.plan.interval === "MONTHLY") {
        revenue += sub.plan.price;
      } else if (sub.plan.interval === "YEARLY") {
        // Yıllık planları aylık gelire dönüştür
        revenue += sub.plan.price / 12;
      }
    });

    data.push({
      month: startDate.toLocaleDateString("en-US", {
        month: "short",
        year: "numeric",
      }),
      revenue: Math.round(revenue * 100) / 100,
      subscriptions: subscriptions.length,
    });
  }

  return data;
}

