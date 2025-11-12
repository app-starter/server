const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

// Get all transactions with filtering
exports.getTransactions = async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 20, 
      status, 
      platform, 
      userId, 
      startDate, 
      endDate,
      search 
    } = req.query;

    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Build where clause
    const where = {};

    if (status) where.status = status;
    if (platform) where.platform = platform;
    if (userId) where.userId = parseInt(userId);
    
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = new Date(startDate);
      if (endDate) where.createdAt.lte = new Date(endDate);
    }

    // Search in transaction ID or user email
    if (search) {
      where.OR = [
        { transactionId: { contains: search } },
        { user: { email: { contains: search } } }
      ];
    }

    // Get transactions
    const [transactions, total] = await Promise.all([
      prisma.transaction.findMany({
        where,
        skip,
        take: parseInt(limit),
        orderBy: { createdAt: "desc" },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            }
          },
          subscription: {
            select: {
              id: true,
              plan: {
                select: {
                  name: true,
                  price: true,
                }
              }
            }
          }
        }
      }),
      prisma.transaction.count({ where })
    ]);

    res.json({
      data: transactions,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error("Get transactions error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

// Get single transaction
exports.getTransaction = async (req, res) => {
  try {
    const { id } = req.params;

    const transaction = await prisma.transaction.findUnique({
      where: { id: parseInt(id) },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            status: true,
          }
        },
        subscription: {
          include: {
            plan: true
          }
        }
      }
    });

    if (!transaction) {
      return res.status(404).json({ message: "Transaction not found" });
    }

    res.json({ data: transaction });
  } catch (error) {
    console.error("Get transaction error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

// Process refund
exports.processRefund = async (req, res) => {
  try {
    const { id } = req.params;
    const { reason, amount } = req.body;

    // Get transaction
    const transaction = await prisma.transaction.findUnique({
      where: { id: parseInt(id) },
      include: { user: true }
    });

    if (!transaction) {
      return res.status(404).json({ message: "Transaction not found" });
    }

    if (transaction.status === "REFUNDED") {
      return res.status(400).json({ message: "Transaction already refunded" });
    }

    if (transaction.status !== "COMPLETED") {
      return res.status(400).json({ message: "Only completed transactions can be refunded" });
    }

    const refundAmount = amount || transaction.amount;

    // Update transaction
    const updatedTransaction = await prisma.transaction.update({
      where: { id: parseInt(id) },
      data: {
        status: "REFUNDED",
        refundedAt: new Date(),
        refundAmount: parseFloat(refundAmount),
        refundReason: reason,
      }
    });

    // Create audit log
    await prisma.auditLog.create({
      data: {
        userId: req.user.id,
        action: "TRANSACTION_REFUND",
        entityType: "TRANSACTION",
        entityId: parseInt(id),
        ipAddress: req.ip,
        userAgent: req.headers["user-agent"],
        platform: "admin",
        metadata: JSON.stringify({
          transactionId: transaction.transactionId,
          originalAmount: transaction.amount,
          refundAmount,
          reason,
          userId: transaction.userId
        }),
      },
    });

    // TODO: Gerçek ödeme sağlayıcısı entegrasyonu
    // Stripe/PayPal refund API çağrısı yapılmalı

    res.json({
      message: "Refund processed successfully",
      data: updatedTransaction
    });
  } catch (error) {
    console.error("Process refund error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

// Get transaction statistics
exports.getTransactionStats = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    const where = {};
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = new Date(startDate);
      if (endDate) where.createdAt.lte = new Date(endDate);
    }

    const [
      totalTransactions,
      completedTransactions,
      refundedTransactions,
      failedTransactions,
      totalRevenue,
      totalRefunded,
      platformDistribution,
      recentTransactions
    ] = await Promise.all([
      // Total transactions
      prisma.transaction.count({ where }),

      // Completed transactions
      prisma.transaction.count({
        where: { ...where, status: "COMPLETED" }
      }),

      // Refunded transactions
      prisma.transaction.count({
        where: { ...where, status: "REFUNDED" }
      }),

      // Failed transactions
      prisma.transaction.count({
        where: { ...where, status: "FAILED" }
      }),

      // Total revenue
      prisma.transaction.aggregate({
        where: { ...where, status: "COMPLETED" },
        _sum: { amount: true }
      }),

      // Total refunded amount
      prisma.transaction.aggregate({
        where: { ...where, status: "REFUNDED" },
        _sum: { refundAmount: true }
      }),

      // Platform distribution
      prisma.transaction.groupBy({
        by: ["platform"],
        where,
        _count: true,
        _sum: { amount: true }
      }),

      // Recent transactions
      prisma.transaction.findMany({
        where,
        take: 10,
        orderBy: { createdAt: "desc" },
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
          totalTransactions,
          completedTransactions,
          refundedTransactions,
          failedTransactions,
          totalRevenue: totalRevenue._sum.amount || 0,
          totalRefunded: totalRefunded._sum.refundAmount || 0,
          netRevenue: (totalRevenue._sum.amount || 0) - (totalRefunded._sum.refundAmount || 0),
          successRate: totalTransactions > 0 
            ? ((completedTransactions / totalTransactions) * 100).toFixed(2)
            : 0
        },
        platformDistribution,
        recentTransactions
      }
    });
  } catch (error) {
    console.error("Get transaction stats error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

// Get user transactions
exports.getUserTransactions = async (req, res) => {
  try {
    const { userId } = req.params;
    const { page = 1, limit = 10 } = req.query;

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [transactions, total] = await Promise.all([
      prisma.transaction.findMany({
        where: { userId: parseInt(userId) },
        skip,
        take: parseInt(limit),
        orderBy: { createdAt: "desc" },
        include: {
          subscription: {
            include: {
              plan: true
            }
          }
        }
      }),
      prisma.transaction.count({ where: { userId: parseInt(userId) } })
    ]);

    res.json({
      data: transactions,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error("Get user transactions error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

