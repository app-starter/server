const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

// Get all feature flags
exports.getFeatureFlags = async (req, res) => {
  try {
    const { platform } = req.query;

    const where = {};
    if (platform) where.platform = platform;

    const flags = await prisma.featureFlag.findMany({
      where,
      orderBy: { createdAt: "desc" },
    });

    res.json({ data: flags });
  } catch (error) {
    console.error("Get feature flags error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

// Get single feature flag
exports.getFeatureFlag = async (req, res) => {
  try {
    const { id } = req.params;

    const flag = await prisma.featureFlag.findUnique({
      where: { id: parseInt(id) }
    });

    if (!flag) {
      return res.status(404).json({ message: "Feature flag not found" });
    }

    res.json({ data: flag });
  } catch (error) {
    console.error("Get feature flag error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

// Create feature flag
exports.createFeatureFlag = async (req, res) => {
  try {
    const { 
      key, 
      name, 
      description, 
      isEnabled, 
      platform,
      metadata 
    } = req.body;

    // Validate
    if (!key || !name) {
      return res.status(400).json({ 
        message: "Key and name are required" 
      });
    }

    // Check if key already exists
    const existingFlag = await prisma.featureFlag.findUnique({
      where: { key }
    });

    if (existingFlag) {
      return res.status(400).json({ 
        message: "Feature flag with this key already exists" 
      });
    }

    const flag = await prisma.featureFlag.create({
      data: {
        key,
        name,
        description: description || null,
        isEnabled: isEnabled || false,
        platform: platform || "all",
        metadata: metadata ? JSON.stringify(metadata) : null,
      }
    });

    // Create audit log
    await prisma.auditLog.create({
      data: {
        userId: req.user.id,
        action: "FEATURE_FLAG_CREATE",
        entityType: "FEATURE_FLAG",
        entityId: flag.id,
        ipAddress: req.ip,
        userAgent: req.headers["user-agent"],
        platform: "admin",
        metadata: JSON.stringify({ key, name }),
      },
    });

    res.status(201).json({
      message: "Feature flag created successfully",
      data: flag
    });
  } catch (error) {
    console.error("Create feature flag error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

// Update feature flag
exports.updateFeatureFlag = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, isEnabled, platform, metadata } = req.body;

    const flag = await prisma.featureFlag.update({
      where: { id: parseInt(id) },
      data: {
        ...(name !== undefined && { name }),
        ...(description !== undefined && { description }),
        ...(isEnabled !== undefined && { isEnabled }),
        ...(platform !== undefined && { platform }),
        ...(metadata !== undefined && { metadata: JSON.stringify(metadata) }),
      }
    });

    // Create audit log
    await prisma.auditLog.create({
      data: {
        userId: req.user.id,
        action: "FEATURE_FLAG_UPDATE",
        entityType: "FEATURE_FLAG",
        entityId: parseInt(id),
        ipAddress: req.ip,
        userAgent: req.headers["user-agent"],
        platform: "admin",
      },
    });

    res.json({
      message: "Feature flag updated successfully",
      data: flag
    });
  } catch (error) {
    console.error("Update feature flag error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

// Toggle feature flag
exports.toggleFeatureFlag = async (req, res) => {
  try {
    const { id } = req.params;

    const currentFlag = await prisma.featureFlag.findUnique({
      where: { id: parseInt(id) }
    });

    if (!currentFlag) {
      return res.status(404).json({ message: "Feature flag not found" });
    }

    const flag = await prisma.featureFlag.update({
      where: { id: parseInt(id) },
      data: {
        isEnabled: !currentFlag.isEnabled
      }
    });

    // Create audit log
    await prisma.auditLog.create({
      data: {
        userId: req.user.id,
        action: "FEATURE_FLAG_TOGGLE",
        entityType: "FEATURE_FLAG",
        entityId: parseInt(id),
        ipAddress: req.ip,
        userAgent: req.headers["user-agent"],
        platform: "admin",
        metadata: JSON.stringify({ 
          key: flag.key,
          previousState: currentFlag.isEnabled,
          newState: flag.isEnabled
        }),
      },
    });

    res.json({
      message: `Feature flag ${flag.isEnabled ? 'enabled' : 'disabled'} successfully`,
      data: flag
    });
  } catch (error) {
    console.error("Toggle feature flag error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

// Delete feature flag
exports.deleteFeatureFlag = async (req, res) => {
  try {
    const { id } = req.params;

    await prisma.featureFlag.delete({
      where: { id: parseInt(id) }
    });

    // Create audit log
    await prisma.auditLog.create({
      data: {
        userId: req.user.id,
        action: "FEATURE_FLAG_DELETE",
        entityType: "FEATURE_FLAG",
        entityId: parseInt(id),
        ipAddress: req.ip,
        userAgent: req.headers["user-agent"],
        platform: "admin",
      },
    });

    res.json({ message: "Feature flag deleted successfully" });
  } catch (error) {
    console.error("Delete feature flag error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

// Get feature flags for client (mobile app)
exports.getClientFeatureFlags = async (req, res) => {
  try {
    const { platform = "all" } = req.query;

    const flags = await prisma.featureFlag.findMany({
      where: {
        OR: [
          { platform: platform },
          { platform: "all" }
        ]
      },
      select: {
        key: true,
        isEnabled: true,
        metadata: true
      }
    });

    // Convert to key-value object for easier client consumption
    const flagsObject = flags.reduce((acc, flag) => {
      acc[flag.key] = {
        enabled: flag.isEnabled,
        metadata: flag.metadata ? JSON.parse(flag.metadata) : null
      };
      return acc;
    }, {});

    res.json({ data: flagsObject });
  } catch (error) {
    console.error("Get client feature flags error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

