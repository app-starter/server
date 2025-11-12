const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

// Audit log kaydetme fonksiyonu
exports.createAuditLog = async ({
  userId,
  action,
  entityType,
  entityId,
  ipAddress,
  userAgent,
  platform = "web",
  metadata = null,
}) => {
  try {
    await prisma.auditLog.create({
      data: {
        userId,
        action,
        entityType,
        entityId,
        ipAddress,
        userAgent,
        platform,
        metadata: metadata ? JSON.stringify(metadata) : null,
      },
    });
  } catch (error) {
    console.error("Audit log creation error:", error);
    // Audit log hatası ana işlemi etkilememeli
  }
};

// Audit logları listeleme
exports.getAuditLogs = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 50,
      userId,
      action,
      entityType,
      startDate,
      endDate,
      platform,
    } = req.query;

    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Filtreleme koşulları
    const where = {};

    if (userId) {
      where.userId = parseInt(userId);
    }

    if (action) {
      where.action = action;
    }

    if (entityType) {
      where.entityType = entityType;
    }

    if (platform) {
      where.platform = platform;
    }

    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) {
        where.createdAt.gte = new Date(startDate);
      }
      if (endDate) {
        where.createdAt.lte = new Date(endDate);
      }
    }

    // Audit logları al
    const logs = await prisma.auditLog.findMany({
      where,
      skip,
      take: parseInt(limit),
      orderBy: {
        createdAt: "desc",
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true,
          },
        },
      },
    });

    // Toplam kayıt sayısı
    const total = await prisma.auditLog.count({ where });

    res.json({
      logs,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages: Math.ceil(total / parseInt(limit)),
      },
    });
  } catch (error) {
    console.error("Get audit logs error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

// Belirli bir audit log detayı
exports.getAuditLog = async (req, res) => {
  try {
    const { id } = req.params;

    const log = await prisma.auditLog.findUnique({
      where: { id: parseInt(id) },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true,
          },
        },
      },
    });

    if (!log) {
      return res.status(404).json({ message: "Audit log not found" });
    }

    res.json(log);
  } catch (error) {
    console.error("Get audit log error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

// Kullanıcıya ait audit logları
exports.getUserAuditLogs = async (req, res) => {
  try {
    const { userId } = req.params;
    const { page = 1, limit = 20 } = req.query;

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const logs = await prisma.auditLog.findMany({
      where: {
        userId: parseInt(userId),
      },
      skip,
      take: parseInt(limit),
      orderBy: {
        createdAt: "desc",
      },
    });

    const total = await prisma.auditLog.count({
      where: {
        userId: parseInt(userId),
      },
    });

    res.json({
      logs,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages: Math.ceil(total / parseInt(limit)),
      },
    });
  } catch (error) {
    console.error("Get user audit logs error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

// Audit log istatistikleri
exports.getAuditLogStats = async (req, res) => {
  try {
    const { days = 30 } = req.query;

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(days));

    // Toplam log sayısı
    const totalLogs = await prisma.auditLog.count({
      where: {
        createdAt: {
          gte: startDate,
        },
      },
    });

    // Action'a göre dağılım
    const actionDistribution = await prisma.auditLog.groupBy({
      by: ["action"],
      where: {
        createdAt: {
          gte: startDate,
        },
      },
      _count: true,
      orderBy: {
        _count: {
          action: "desc",
        },
      },
      take: 10,
    });

    // Entity type'a göre dağılım
    const entityDistribution = await prisma.auditLog.groupBy({
      by: ["entityType"],
      where: {
        createdAt: {
          gte: startDate,
        },
      },
      _count: true,
      orderBy: {
        _count: {
          entityType: "desc",
        },
      },
    });

    // Platform'a göre dağılım
    const platformDistribution = await prisma.auditLog.groupBy({
      by: ["platform"],
      where: {
        createdAt: {
          gte: startDate,
        },
      },
      _count: true,
    });

    // Günlük log sayısı trendi
    const dailyTrend = await getDailyLogTrend(parseInt(days));

    res.json({
      totalLogs,
      actionDistribution: actionDistribution.map((item) => ({
        action: item.action,
        count: item._count,
      })),
      entityDistribution: entityDistribution.map((item) => ({
        entityType: item.entityType,
        count: item._count,
      })),
      platformDistribution: platformDistribution.map((item) => ({
        platform: item.platform || "unknown",
        count: item._count,
      })),
      dailyTrend,
    });
  } catch (error) {
    console.error("Get audit log stats error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

// Yardımcı fonksiyon: Günlük log trendi
async function getDailyLogTrend(days) {
  const data = [];
  const now = new Date();

  for (let i = days - 1; i >= 0; i--) {
    const date = new Date(now);
    date.setDate(date.getDate() - i);
    date.setHours(0, 0, 0, 0);

    const nextDate = new Date(date);
    nextDate.setDate(nextDate.getDate() + 1);

    const count = await prisma.auditLog.count({
      where: {
        createdAt: {
          gte: date,
          lt: nextDate,
        },
      },
    });

    data.push({
      date: date.toISOString().split("T")[0],
      count,
    });
  }

  return data;
}

