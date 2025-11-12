const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

// Get all devices
exports.getDevices = async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 20, 
      platform,
      userId,
      search
    } = req.query;

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const where = {};
    if (platform) where.platform = platform;
    if (userId) where.userId = parseInt(userId);
    
    if (search) {
      where.OR = [
        { deviceId: { contains: search } },
        { deviceName: { contains: search } },
        { user: { email: { contains: search } } }
      ];
    }

    const [devices, total] = await Promise.all([
      prisma.userDevice.findMany({
        where,
        skip,
        take: parseInt(limit),
        orderBy: { lastActiveAt: "desc" },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            }
          },
          ban: {
            select: {
              id: true,
              reason: true,
              bannedAt: true,
            }
          }
        }
      }),
      prisma.userDevice.count({ where })
    ]);

    res.json({
      data: devices,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error("Get devices error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

// Get single device
exports.getDevice = async (req, res) => {
  try {
    const { id } = req.params;

    const device = await prisma.userDevice.findUnique({
      where: { id: parseInt(id) },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          }
        },
        ban: {
          select: {
            id: true,
            reason: true,
            bannedAt: true,
          }
        }
      }
    });

    if (!device) {
      return res.status(404).json({ message: "Device not found" });
    }

    res.json({ data: device });
  } catch (error) {
    console.error("Get device error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

// Get user devices
exports.getUserDevices = async (req, res) => {
  try {
    const { userId } = req.params;

    const devices = await prisma.userDevice.findMany({
      where: { userId: parseInt(userId) },
      orderBy: { lastActiveAt: "desc" },
      include: {
        ban: {
          select: {
            id: true,
            reason: true,
            bannedAt: true,
          }
        }
      }
    });

    res.json({ data: devices });
  } catch (error) {
    console.error("Get user devices error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

// Ban device
exports.banDevice = async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    const device = await prisma.userDevice.findUnique({
      where: { id: parseInt(id) }
    });

    if (!device) {
      return res.status(404).json({ message: "Device not found" });
    }

    // Check if already banned
    const existingBan = await prisma.deviceBan.findUnique({
      where: { deviceId: parseInt(id) }
    });

    if (existingBan) {
      return res.status(400).json({ message: "Device is already banned" });
    }

    // Create ban record
    const ban = await prisma.deviceBan.create({
      data: {
        deviceId: parseInt(id),
        reason: reason || "No reason provided",
        bannedBy: req.user.id,
      }
    });

    // Create audit log
    await prisma.auditLog.create({
      data: {
        userId: req.user.id,
        action: "DEVICE_BAN",
        entityType: "DEVICE",
        entityId: parseInt(id),
        ipAddress: req.ip,
        userAgent: req.headers["user-agent"],
        platform: "admin",
        metadata: JSON.stringify({ 
          deviceId: device.deviceId,
          userId: device.userId,
          reason
        }),
      },
    });

    res.json({
      message: "Device banned successfully",
      data: ban
    });
  } catch (error) {
    console.error("Ban device error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

// Unban device
exports.unbanDevice = async (req, res) => {
  try {
    const { id } = req.params;

    const device = await prisma.userDevice.findUnique({
      where: { id: parseInt(id) }
    });

    if (!device) {
      return res.status(404).json({ message: "Device not found" });
    }

    // Delete ban record
    await prisma.deviceBan.delete({
      where: { deviceId: parseInt(id) }
    });

    // Create audit log
    await prisma.auditLog.create({
      data: {
        userId: req.user.id,
        action: "DEVICE_UNBAN",
        entityType: "DEVICE",
        entityId: parseInt(id),
        ipAddress: req.ip,
        userAgent: req.headers["user-agent"],
        platform: "admin",
        metadata: JSON.stringify({ 
          deviceId: device.deviceId,
          userId: device.userId
        }),
      },
    });

    res.json({ message: "Device unbanned successfully" });
  } catch (error) {
    console.error("Unban device error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

// Delete device
exports.deleteDevice = async (req, res) => {
  try {
    const { id } = req.params;

    // Delete ban if exists
    await prisma.deviceBan.deleteMany({
      where: { deviceId: parseInt(id) }
    });

    // Delete device
    await prisma.userDevice.delete({
      where: { id: parseInt(id) }
    });

    res.json({ message: "Device deleted successfully" });
  } catch (error) {
    console.error("Delete device error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

// Get device statistics
exports.getDeviceStats = async (req, res) => {
  try {
    const [
      totalDevices,
      activeDevices,
      bannedDevices,
      platformDistribution,
      recentDevices
    ] = await Promise.all([
      prisma.userDevice.count(),
      prisma.userDevice.count({
        where: {
          lastActiveAt: {
            gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) // Last 30 days
          }
        }
      }),
      prisma.deviceBan.count(),
      prisma.userDevice.groupBy({
        by: ["platform"],
        _count: true,
      }),
      prisma.userDevice.findMany({
        take: 10,
        orderBy: { createdAt: "desc" },
        include: {
          user: {
            select: {
              name: true,
              email: true
            }
          },
          ban: {
            select: {
              id: true,
              reason: true,
              bannedAt: true,
            }
          }
        }
      })
    ]);

    res.json({
      data: {
        overview: {
          totalDevices,
          activeDevices,
          bannedDevices,
        },
        platformDistribution,
        recentDevices
      }
    });
  } catch (error) {
    console.error("Get device stats error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

