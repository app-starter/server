const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

// Get all app versions
exports.getAppVersions = async (req, res) => {
  try {
    const { platform } = req.query;

    const where = {};
    if (platform) where.platform = platform;

    const versions = await prisma.appVersion.findMany({
      where,
      orderBy: { createdAt: "desc" },
    });

    res.json({ data: versions });
  } catch (error) {
    console.error("Get app versions error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

// Get single app version
exports.getAppVersion = async (req, res) => {
  try {
    const { id } = req.params;

    const version = await prisma.appVersion.findUnique({
      where: { id: parseInt(id) }
    });

    if (!version) {
      return res.status(404).json({ message: "App version not found" });
    }

    res.json({ data: version });
  } catch (error) {
    console.error("Get app version error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

// Create app version
exports.createAppVersion = async (req, res) => {
  try {
    const { 
      version, 
      buildNumber, 
      platform, 
      releaseNotes, 
      forceUpdate,
      isActive,
      releaseDate
    } = req.body;

    // Validate
    if (!version || !buildNumber || !platform) {
      return res.status(400).json({ 
        message: "Version, build number, and platform are required" 
      });
    }

    // Check if version already exists
    const existingVersion = await prisma.appVersion.findFirst({
      where: {
        version,
        platform
      }
    });

    if (existingVersion) {
      return res.status(400).json({ 
        message: "This version already exists for this platform" 
      });
    }

    const appVersion = await prisma.appVersion.create({
      data: {
        version,
        buildNumber: buildNumber.toString(),
        platform,
        releaseNotes: releaseNotes || null,
        isForceUpdate: forceUpdate || false,
        releaseDate: releaseDate ? new Date(releaseDate) : new Date(),
        isActive: isActive !== undefined ? isActive : true,
      }
    });

    // Create audit log
    await prisma.auditLog.create({
      data: {
        userId: req.user.id,
        action: "APP_VERSION_CREATE",
        entityType: "APP_VERSION",
        entityId: appVersion.id,
        ipAddress: req.ip,
        userAgent: req.headers["user-agent"],
        platform: "admin",
        metadata: JSON.stringify({ 
          version,
          platform,
          forceUpdate
        }),
      },
    });

    res.status(201).json({
      message: "App version created successfully",
      data: appVersion
    });
  } catch (error) {
    console.error("Create app version error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

// Update app version
exports.updateAppVersion = async (req, res) => {
  try {
    const { id } = req.params;
    const { releaseNotes, forceUpdate, isActive, releaseDate } = req.body;

    const appVersion = await prisma.appVersion.update({
      where: { id: parseInt(id) },
      data: {
        ...(releaseNotes !== undefined && { releaseNotes }),
        ...(forceUpdate !== undefined && { isForceUpdate: forceUpdate }),
        ...(isActive !== undefined && { isActive }),
        ...(releaseDate !== undefined && { releaseDate: new Date(releaseDate) }),
      }
    });

    // Create audit log
    await prisma.auditLog.create({
      data: {
        userId: req.user.id,
        action: "APP_VERSION_UPDATE",
        entityType: "APP_VERSION",
        entityId: parseInt(id),
        ipAddress: req.ip,
        userAgent: req.headers["user-agent"],
        platform: "admin",
      },
    });

    res.json({
      message: "App version updated successfully",
      data: appVersion
    });
  } catch (error) {
    console.error("Update app version error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

// Delete app version
exports.deleteAppVersion = async (req, res) => {
  try {
    const { id } = req.params;

    await prisma.appVersion.delete({
      where: { id: parseInt(id) }
    });

    // Create audit log
    await prisma.auditLog.create({
      data: {
        userId: req.user.id,
        action: "APP_VERSION_DELETE",
        entityType: "APP_VERSION",
        entityId: parseInt(id),
        ipAddress: req.ip,
        userAgent: req.headers["user-agent"],
        platform: "admin",
      },
    });

    res.json({ message: "App version deleted successfully" });
  } catch (error) {
    console.error("Delete app version error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

// Get latest version for platform
exports.getLatestVersion = async (req, res) => {
  try {
    const { platform } = req.params;

    const latestVersion = await prisma.appVersion.findFirst({
      where: {
        platform,
        isActive: true
      },
      orderBy: {
        buildNumber: "desc"
      }
    });

    if (!latestVersion) {
      return res.status(404).json({ 
        message: "No active version found for this platform" 
      });
    }

    res.json({ data: latestVersion });
  } catch (error) {
    console.error("Get latest version error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

// Check if update is required
exports.checkUpdate = async (req, res) => {
  try {
    const { platform, currentVersion, currentBuildNumber } = req.query;

    if (!platform || !currentVersion || !currentBuildNumber) {
      return res.status(400).json({ 
        message: "Platform, current version, and build number are required" 
      });
    }

    const latestVersion = await prisma.appVersion.findFirst({
      where: {
        platform,
        isActive: true
      },
      orderBy: {
        buildNumber: "desc"
      }
    });

    if (!latestVersion) {
      return res.json({
        updateAvailable: false,
        message: "No updates available"
      });
    }

    const updateAvailable = parseInt(currentBuildNumber) < latestVersion.buildNumber;

    res.json({
      updateAvailable,
      forceUpdate: updateAvailable && latestVersion.isForceUpdate,
      latestVersion: latestVersion.version,
      latestBuildNumber: latestVersion.buildNumber,
      releaseNotes: latestVersion.releaseNotes,
    });
  } catch (error) {
    console.error("Check update error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

