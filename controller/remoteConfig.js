const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

// Get all remote configs
exports.getRemoteConfigs = async (req, res) => {
  try {
    const { platform } = req.query;

    const where = {};
    if (platform) where.platform = platform;

    const configs = await prisma.remoteConfig.findMany({
      where,
      orderBy: { createdAt: "desc" },
    });

    res.json({ data: configs });
  } catch (error) {
    console.error("Get remote configs error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

// Get single remote config
exports.getRemoteConfig = async (req, res) => {
  try {
    const { id } = req.params;

    const config = await prisma.remoteConfig.findUnique({
      where: { id: parseInt(id) }
    });

    if (!config) {
      return res.status(404).json({ message: "Remote config not found" });
    }

    res.json({ data: config });
  } catch (error) {
    console.error("Get remote config error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

// Create remote config
exports.createRemoteConfig = async (req, res) => {
  try {
    const { 
      key, 
      value, 
      valueType, 
      description, 
      platform 
    } = req.body;

    // Validate
    if (!key || value === undefined) {
      return res.status(400).json({ 
        message: "Key and value are required" 
      });
    }

    // Check if key already exists
    const existingConfig = await prisma.remoteConfig.findUnique({
      where: { key }
    });

    if (existingConfig) {
      return res.status(400).json({ 
        message: "Remote config with this key already exists" 
      });
    }

    const config = await prisma.remoteConfig.create({
      data: {
        key,
        value: String(value),
        valueType: valueType || "string",
        description: description || null,
        platform: platform || "all",
      }
    });

    // Create audit log
    await prisma.auditLog.create({
      data: {
        userId: req.user.id,
        action: "REMOTE_CONFIG_CREATE",
        entityType: "REMOTE_CONFIG",
        entityId: config.id,
        ipAddress: req.ip,
        userAgent: req.headers["user-agent"],
        platform: "admin",
        metadata: JSON.stringify({ key }),
      },
    });

    res.status(201).json({
      message: "Remote config created successfully",
      data: config
    });
  } catch (error) {
    console.error("Create remote config error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

// Update remote config
exports.updateRemoteConfig = async (req, res) => {
  try {
    const { id } = req.params;
    const { value, valueType, description, platform } = req.body;

    const config = await prisma.remoteConfig.update({
      where: { id: parseInt(id) },
      data: {
        ...(value !== undefined && { value: String(value) }),
        ...(valueType !== undefined && { valueType }),
        ...(description !== undefined && { description }),
        ...(platform !== undefined && { platform }),
      }
    });

    // Create audit log
    await prisma.auditLog.create({
      data: {
        userId: req.user.id,
        action: "REMOTE_CONFIG_UPDATE",
        entityType: "REMOTE_CONFIG",
        entityId: parseInt(id),
        ipAddress: req.ip,
        userAgent: req.headers["user-agent"],
        platform: "admin",
      },
    });

    res.json({
      message: "Remote config updated successfully",
      data: config
    });
  } catch (error) {
    console.error("Update remote config error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

// Delete remote config
exports.deleteRemoteConfig = async (req, res) => {
  try {
    const { id } = req.params;

    await prisma.remoteConfig.delete({
      where: { id: parseInt(id) }
    });

    // Create audit log
    await prisma.auditLog.create({
      data: {
        userId: req.user.id,
        action: "REMOTE_CONFIG_DELETE",
        entityType: "REMOTE_CONFIG",
        entityId: parseInt(id),
        ipAddress: req.ip,
        userAgent: req.headers["user-agent"],
        platform: "admin",
      },
    });

    res.json({ message: "Remote config deleted successfully" });
  } catch (error) {
    console.error("Delete remote config error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

// Get remote configs for client (mobile app)
exports.getClientRemoteConfigs = async (req, res) => {
  try {
    const { platform = "all" } = req.query;

    const configs = await prisma.remoteConfig.findMany({
      where: {
        OR: [
          { platform: platform },
          { platform: "all" }
        ]
      },
      select: {
        key: true,
        value: true,
        valueType: true
      }
    });

    // Convert to key-value object and parse values by type
    const configsObject = configs.reduce((acc, config) => {
      let parsedValue = config.value;
      
      try {
        switch(config.valueType) {
          case "number":
            parsedValue = Number(config.value);
            break;
          case "boolean":
            parsedValue = config.value === "true";
            break;
          case "json":
            parsedValue = JSON.parse(config.value);
            break;
          default:
            parsedValue = config.value;
        }
      } catch (e) {
        // If parsing fails, return string value
        parsedValue = config.value;
      }

      acc[config.key] = parsedValue;
      return acc;
    }, {});

    res.json({ data: configsObject });
  } catch (error) {
    console.error("Get client remote configs error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

