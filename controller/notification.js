const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

// Get all notifications with filtering
exports.getNotifications = async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 20, 
      type, 
      read, 
      userId,
      startDate,
      endDate 
    } = req.query;

    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Build where clause
    const where = {};

    if (type) where.type = type;
    if (read !== undefined) where.read = read === "true";
    if (userId) where.userId = parseInt(userId);

    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = new Date(startDate);
      if (endDate) where.createdAt.lte = new Date(endDate);
    }

    // Get notifications
    const [notifications, total] = await Promise.all([
      prisma.notification.findMany({
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
          }
        }
      }),
      prisma.notification.count({ where })
    ]);

    res.json({
      data: notifications,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error("Get notifications error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

// Get single notification
exports.getNotification = async (req, res) => {
  try {
    const { id } = req.params;

    const notification = await prisma.notification.findUnique({
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

    if (!notification) {
      return res.status(404).json({ message: "Notification not found" });
    }

    res.json({ data: notification });
  } catch (error) {
    console.error("Get notification error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

// Create notification
exports.createNotification = async (req, res) => {
  try {
    const { userId, title, message, type, actionUrl, metadata } = req.body;

    // Validate
    if (!userId || !title || !message) {
      return res.status(400).json({ 
        message: "User ID, title, and message are required" 
      });
    }

    // Check if user exists
    const user = await prisma.user.findUnique({
      where: { id: parseInt(userId) }
    });

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const notification = await prisma.notification.create({
      data: {
        userId: parseInt(userId),
        title,
        message,
        type: type || "INFO",
        actionUrl: actionUrl || null,
        metadata: metadata ? JSON.stringify(metadata) : null,
      }
    });

    // Create audit log
    await prisma.auditLog.create({
      data: {
        userId: req.user.id,
        action: "NOTIFICATION_CREATE",
        entityType: "NOTIFICATION",
        entityId: notification.id,
        ipAddress: req.ip,
        userAgent: req.headers["user-agent"],
        platform: "admin",
        metadata: JSON.stringify({ 
          recipientId: userId,
          type,
          title
        }),
      },
    });

    res.status(201).json({
      message: "Notification created successfully",
      data: notification
    });
  } catch (error) {
    console.error("Create notification error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

// Bulk create notifications
exports.bulkCreateNotifications = async (req, res) => {
  try {
    const { userIds, title, message, type, actionUrl } = req.body;

    // Validate
    if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
      return res.status(400).json({ message: "User IDs array is required" });
    }

    if (!title || !message) {
      return res.status(400).json({ message: "Title and message are required" });
    }

    // Create notifications
    const notifications = userIds.map(userId => ({
      userId: parseInt(userId),
      title,
      message,
      type: type || "INFO",
      actionUrl: actionUrl || null,
    }));

    const result = await prisma.notification.createMany({
      data: notifications,
    });

    // Create audit log
    await prisma.auditLog.create({
      data: {
        userId: req.user.id,
        action: "NOTIFICATION_BULK_CREATE",
        entityType: "NOTIFICATION",
        entityId: 0,
        ipAddress: req.ip,
        userAgent: req.headers["user-agent"],
        platform: "admin",
        metadata: JSON.stringify({ 
          recipientCount: userIds.length,
          type,
          title
        }),
      },
    });

    res.status(201).json({
      message: `${result.count} notifications created successfully`,
      count: result.count
    });
  } catch (error) {
    console.error("Bulk create notifications error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

// Mark notification as read
exports.markAsRead = async (req, res) => {
  try {
    const { id } = req.params;

    const notification = await prisma.notification.update({
      where: { id: parseInt(id) },
      data: {
        read: true,
        readAt: new Date(),
      }
    });

    res.json({
      message: "Notification marked as read",
      data: notification
    });
  } catch (error) {
    console.error("Mark as read error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

// Mark all user notifications as read
exports.markAllAsRead = async (req, res) => {
  try {
    const { userId } = req.params;

    const result = await prisma.notification.updateMany({
      where: {
        userId: parseInt(userId),
        read: false,
      },
      data: {
        read: true,
        readAt: new Date(),
      }
    });

    res.json({
      message: `${result.count} notifications marked as read`,
      count: result.count
    });
  } catch (error) {
    console.error("Mark all as read error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

// Delete notification
exports.deleteNotification = async (req, res) => {
  try {
    const { id } = req.params;

    await prisma.notification.delete({
      where: { id: parseInt(id) }
    });

    res.json({ message: "Notification deleted successfully" });
  } catch (error) {
    console.error("Delete notification error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

// Get notification statistics
exports.getNotificationStats = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    const where = {};
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = new Date(startDate);
      if (endDate) where.createdAt.lte = new Date(endDate);
    }

    const [
      totalNotifications,
      readNotifications,
      unreadNotifications,
      typeDistribution,
      recentNotifications
    ] = await Promise.all([
      // Total notifications
      prisma.notification.count({ where }),

      // Read notifications
      prisma.notification.count({
        where: { ...where, read: true }
      }),

      // Unread notifications
      prisma.notification.count({
        where: { ...where, read: false }
      }),

      // Type distribution
      prisma.notification.groupBy({
        by: ["type"],
        where,
        _count: true,
      }),

      // Recent notifications
      prisma.notification.findMany({
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
          totalNotifications,
          readNotifications,
          unreadNotifications,
          readRate: totalNotifications > 0 
            ? ((readNotifications / totalNotifications) * 100).toFixed(2)
            : 0
        },
        typeDistribution,
        recentNotifications
      }
    });
  } catch (error) {
    console.error("Get notification stats error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

// Get user notifications
exports.getUserNotifications = async (req, res) => {
  try {
    const { userId } = req.params;
    const { page = 1, limit = 10, read } = req.query;

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const where = { userId: parseInt(userId) };
    if (read !== undefined) where.read = read === "true";

    const [notifications, total] = await Promise.all([
      prisma.notification.findMany({
        where,
        skip,
        take: parseInt(limit),
        orderBy: { createdAt: "desc" },
      }),
      prisma.notification.count({ where })
    ]);

    res.json({
      data: notifications,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error("Get user notifications error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

