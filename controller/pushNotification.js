const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

// Get all push notifications
exports.getPushNotifications = async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 20, 
      status,
      platform,
      startDate,
      endDate
    } = req.query;

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const where = {};
    if (status) where.status = status;
    if (platform) where.platform = platform;
    
    if (startDate || endDate) {
      where.sentAt = {};
      if (startDate) where.sentAt.gte = new Date(startDate);
      if (endDate) where.sentAt.lte = new Date(endDate);
    }

    const [notifications, total] = await Promise.all([
      prisma.pushNotification.findMany({
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
      prisma.pushNotification.count({ where })
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
    console.error("Get push notifications error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

// Get single push notification
exports.getPushNotification = async (req, res) => {
  try {
    const { id } = req.params;

    const notification = await prisma.pushNotification.findUnique({
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
      return res.status(404).json({ message: "Push notification not found" });
    }

    res.json({ data: notification });
  } catch (error) {
    console.error("Get push notification error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

// Send push notification
exports.sendPushNotification = async (req, res) => {
  try {
    const { userId, title, body, data, platform } = req.body;

    // Validate
    if (!userId || !title || !body) {
      return res.status(400).json({ 
        message: "User ID, title, and body are required" 
      });
    }

    // Get user's devices
    const devices = await prisma.userDevice.findMany({
      where: {
        userId: parseInt(userId),
        ...(platform && { platform }),
      }
    });

    if (devices.length === 0) {
      return res.status(404).json({ 
        message: "No devices found for this user" 
      });
    }

    // TODO: Gerçek push notification servisi entegrasyonu
    // Firebase Cloud Messaging (FCM) veya Apple Push Notification service (APNs)
    
    // Create push notification record
    const notification = await prisma.pushNotification.create({
      data: {
        userId: parseInt(userId),
        title,
        body,
        data: data ? JSON.stringify(data) : null,
        platform: platform || "all",
        status: "SENT", // Gerçek implementasyonda servis response'una göre
        sentAt: new Date(),
        deviceCount: devices.length,
      }
    });

    // Create audit log
    await prisma.auditLog.create({
      data: {
        userId: req.user.id,
        action: "PUSH_NOTIFICATION_SEND",
        entityType: "PUSH_NOTIFICATION",
        entityId: notification.id,
        ipAddress: req.ip,
        userAgent: req.headers["user-agent"],
        platform: "admin",
        metadata: JSON.stringify({ 
          recipientId: userId,
          title,
          deviceCount: devices.length
        }),
      },
    });

    res.status(201).json({
      message: "Push notification sent successfully",
      data: notification
    });
  } catch (error) {
    console.error("Send push notification error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

// Bulk send push notifications
exports.bulkSendPushNotifications = async (req, res) => {
  try {
    const { userIds, title, body, data, platform } = req.body;

    // Validate
    if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
      return res.status(400).json({ message: "User IDs array is required" });
    }

    if (!title || !body) {
      return res.status(400).json({ message: "Title and body are required" });
    }

    // Get devices for all users
    const devices = await prisma.userDevice.findMany({
      where: {
        userId: { in: userIds.map(id => parseInt(id)) },
        ...(platform && { platform }),
      }
    });

    if (devices.length === 0) {
      return res.status(404).json({ 
        message: "No devices found for selected users" 
      });
    }

    // TODO: Gerçek push notification servisi entegrasyonu
    
    // Create notification records
    const notifications = userIds.map(userId => ({
      userId: parseInt(userId),
      title,
      body,
      data: data ? JSON.stringify(data) : null,
      platform: platform || "all",
      status: "SENT",
      sentAt: new Date(),
    }));

    const result = await prisma.pushNotification.createMany({
      data: notifications,
    });

    // Create audit log
    await prisma.auditLog.create({
      data: {
        userId: req.user.id,
        action: "PUSH_NOTIFICATION_BULK_SEND",
        entityType: "PUSH_NOTIFICATION",
        entityId: 0,
        ipAddress: req.ip,
        userAgent: req.headers["user-agent"],
        platform: "admin",
        metadata: JSON.stringify({ 
          recipientCount: userIds.length,
          title,
          deviceCount: devices.length
        }),
      },
    });

    res.status(201).json({
      message: `Push notifications sent to ${result.count} users`,
      count: result.count,
      deviceCount: devices.length
    });
  } catch (error) {
    console.error("Bulk send push notifications error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

// Get push notification statistics
exports.getPushNotificationStats = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    const where = {};
    if (startDate || endDate) {
      where.sentAt = {};
      if (startDate) where.sentAt.gte = new Date(startDate);
      if (endDate) where.sentAt.lte = new Date(endDate);
    }

    const [
      totalNotifications,
      sentNotifications,
      failedNotifications,
      platformDistribution,
      recentNotifications
    ] = await Promise.all([
      prisma.pushNotification.count({ where }),
      prisma.pushNotification.count({ where: { ...where, status: "SENT" } }),
      prisma.pushNotification.count({ where: { ...where, status: "FAILED" } }),
      prisma.pushNotification.groupBy({
        by: ["platform"],
        where,
        _count: true,
      }),
      prisma.pushNotification.findMany({
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
          totalNotifications,
          sentNotifications,
          failedNotifications,
          successRate: totalNotifications > 0 
            ? ((sentNotifications / totalNotifications) * 100).toFixed(2)
            : 0
        },
        platformDistribution,
        recentNotifications
      }
    });
  } catch (error) {
    console.error("Get push notification stats error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

