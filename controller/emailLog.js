const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

// Get all email logs with filtering
exports.getEmailLogs = async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 20, 
      status, 
      userId, 
      startDate, 
      endDate,
      search 
    } = req.query;

    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Build where clause
    const where = {};

    if (status) where.status = status;
    if (userId) where.userId = parseInt(userId);
    
    if (startDate || endDate) {
      where.sentAt = {};
      if (startDate) where.sentAt.gte = new Date(startDate);
      if (endDate) where.sentAt.lte = new Date(endDate);
    }

    // Search in email recipient or subject
    if (search) {
      where.OR = [
        { to: { contains: search } },
        { subject: { contains: search } }
      ];
    }

    // Get email logs
    const [emailLogs, total] = await Promise.all([
      prisma.emailLog.findMany({
        where,
        skip,
        take: parseInt(limit),
        orderBy: { sentAt: "desc" },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            }
          }
        }
      }),
      prisma.emailLog.count({ where })
    ]);

    res.json({
      data: emailLogs,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error("Get email logs error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

// Get single email log
exports.getEmailLog = async (req, res) => {
  try {
    const { id } = req.params;

    const emailLog = await prisma.emailLog.findUnique({
      where: { id: parseInt(id) },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          }
        }
      }
    });

    if (!emailLog) {
      return res.status(404).json({ message: "Email log not found" });
    }

    res.json({ data: emailLog });
  } catch (error) {
    console.error("Get email log error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

// Get email log statistics
exports.getEmailLogStats = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    const where = {};
    if (startDate || endDate) {
      where.sentAt = {};
      if (startDate) where.sentAt.gte = new Date(startDate);
      if (endDate) where.sentAt.lte = new Date(endDate);
    }

    const [
      totalEmails,
      sentEmails,
      failedEmails,
      statusDistribution,
      recentEmails
    ] = await Promise.all([
      // Total emails
      prisma.emailLog.count({ where }),

      // Sent emails
      prisma.emailLog.count({
        where: { ...where, status: "SENT" }
      }),

      // Failed emails
      prisma.emailLog.count({
        where: { ...where, status: "FAILED" }
      }),

      // Status distribution
      prisma.emailLog.groupBy({
        by: ["status"],
        where,
        _count: true,
      }),

      // Recent emails
      prisma.emailLog.findMany({
        where,
        take: 10,
        orderBy: { sentAt: "desc" },
        include: {
          user: {
            select: {
              name: true,
              email: true
            }
          }
        }
      })
    ]);

    res.json({
      data: {
        overview: {
          totalEmails,
          sentEmails,
          failedEmails,
          successRate: totalEmails > 0 
            ? ((sentEmails / totalEmails) * 100).toFixed(2)
            : 0
        },
        statusDistribution,
        recentEmails
      }
    });
  } catch (error) {
    console.error("Get email log stats error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

// Get user email logs
exports.getUserEmailLogs = async (req, res) => {
  try {
    const { userId } = req.params;
    const { page = 1, limit = 10 } = req.query;

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [emailLogs, total] = await Promise.all([
      prisma.emailLog.findMany({
        where: { userId: parseInt(userId) },
        skip,
        take: parseInt(limit),
        orderBy: { sentAt: "desc" },
      }),
      prisma.emailLog.count({ where: { userId: parseInt(userId) } })
    ]);

    res.json({
      data: emailLogs,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error("Get user email logs error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

// Resend email (placeholder)
exports.resendEmail = async (req, res) => {
  try {
    const { id } = req.params;

    const emailLog = await prisma.emailLog.findUnique({
      where: { id: parseInt(id) },
      include: { user: true }
    });

    if (!emailLog) {
      return res.status(404).json({ message: "Email log not found" });
    }

    // TODO: Gerçek email gönderme implementasyonu
    // Resend veya başka bir email servisi kullanılmalı
    
    // Yeni log oluştur
    const newLog = await prisma.emailLog.create({
      data: {
        userId: emailLog.userId,
        to: emailLog.to,
        subject: emailLog.subject,
        body: emailLog.body,
        status: "SENT", // Gerçek implementasyonda servis response'una göre
        sentAt: new Date(),
      }
    });

    res.json({
      message: "Email resent successfully",
      data: newLog
    });
  } catch (error) {
    console.error("Resend email error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

