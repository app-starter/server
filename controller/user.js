const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
const bcrypt = require("bcrypt");

exports.profile = async (req, res) => {
  try {
    // Retrieve user profile using userId from token
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: {
        id: true,
        email: true,
        name: true,
        googleId: true,
        createdAt: true,
        verified: true,
        
        // Preferences
        notificationPushEnabled: true,
        notificationEmailEnabled: true,
        notificationSmsEnabled: true,
        notificationMarketing: true,
        notificationUpdates: true,
        notificationReminders: true,
        themeMode: true,
        preferredLanguage: true,
        timezone: true,
        
        roles: {
          select: {
            role: {
              select: {
                permissions: {
                  select: {
                    permission: {
                      select: {
                        name: true,
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Flatten permissions from all roles
    user.permissions = user.roles.flatMap((role) =>
      role.role.permissions.map((permission) => permission.permission.name)
    );

    delete user.roles;

    res.json({ user });
  } catch (error) {
    console.error("Profile error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

exports.getUsers = async (req, res) => {
  try {
    const users = await prisma.user.findMany({
      include: {
        roles: {
          select: {
            role: {
              select: {
                name: true,
              },
            },
          },
        },
      },
    });
    res.json(users);
  } catch (error) {
    res.status(500).send(error.message);
  }
};

exports.getUser = async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: parseInt(req.params.id) },
      include: {
        roles: {
          select: {
            roleId: true,
          },
        },
      },
    });

    user.allRoles = await prisma.role.findMany();

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.json(user);
  } catch (error) {
    res.status(500).send(error.message);
  }
};

exports.createUser = async (req, res) => {
  try {
    // Önce e-posta adresinin kullanılıp kullanılmadığını kontrol edelim
    const existingUser = await prisma.user.findUnique({
      where: { email: req.body.email },
    });

    if (existingUser) {
      return res.status(400).json({ message: "Bu e-posta adresi zaten kullanılıyor." });
    }

    const hashedPassword = await bcrypt.hash(req.body.password, 10);
    const user = await prisma.user.create({
      data: {
        name: req.body.name,
        email: req.body.email,
        password: hashedPassword,
        roles: {
          create: req.body.roles.map(roleId => ({
            role: { connect: { id: roleId } }
          }))
        }
      },
      include: {
        roles: {
          include: {
            role: true
          }
        }
      }
    });

    // Hassas bilgileri çıkaralım
    const { password, ...userWithoutPassword } = user;

    res.status(201).json(userWithoutPassword);
  } catch (error) {
    console.error("Kullanıcı oluşturma hatası:", error);
    res.status(500).json({ message: "Kullanıcı oluşturulurken bir hata oluştu." });
  }
};

exports.updateUser = async (req, res) => {
  try {
    await prisma.userRole.deleteMany({
      where: { userId: parseInt(req.params.id) },
    });

    await prisma.userRole.createMany({
      data: req.body.roles.map((userRole) => {
        return {
          userId: parseInt(req.params.id),
          roleId: parseInt(userRole),
        };
      }),
    });

    const user = await prisma.user.update({
      where: { id: parseInt(req.params.id) },
      data: {
        email: req.body.email,
        name: req.body.name,
      },
    });
    res.json(user);
  } catch (error) {
    res.status(500).send(error.message);
  }
};

exports.deleteUser = async (req, res) => {
  try {
    const userId = parseInt(req.params.id);

    // Önce kullanıcıya ait tüm UserRole kayıtlarını silelim
    await prisma.userRole.deleteMany({
      where: { userId: userId },
    });

    // Şimdi kullanıcıyı silebiliriz
    await prisma.user.delete({
      where: { id: userId },
    });

    res.json({ message: "Kullanıcı başarıyla silindi" });
  } catch (error) {
    console.error("Kullanıcı silme hatası:", error);
    res.status(500).json({ message: "Kullanıcı silinirken bir hata oluştu" });
  }
};

// Kullanıcının kendi hesabını silmesi (self-delete)
exports.deleteMyAccount = async (req, res) => {
  try {
    const userId = req.user.id; // JWT'den gelen user

    // RevenueCat logout
    // TODO: Cancel active subscriptions if needed

    // Audit log
    await prisma.auditLog.create({
      data: {
        userId: userId,
        action: 'DELETE_ACCOUNT',
        entityType: 'USER',
        entityId: userId,
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
        platform: 'mobile',
        metadata: JSON.stringify({ reason: req.body.reason || 'User requested' }),
      },
    });

    // Önce ilişkili kayıtları sil
    await prisma.userRole.deleteMany({ where: { userId } });
    await prisma.auditLog.deleteMany({ where: { userId } });
    await prisma.emailLog.deleteMany({ where: { userId } });
    await prisma.transaction.deleteMany({ where: { userId } });
    await prisma.notification.deleteMany({ where: { userId } });
    await prisma.userDevice.deleteMany({ where: { userId } });
    await prisma.subscription.deleteMany({ where: { userId } });

    // Son olarak kullanıcıyı sil
    await prisma.user.delete({
      where: { id: userId },
    });

    res.json({ message: "Hesabınız başarıyla silindi" });
  } catch (error) {
    console.error("Hesap silme hatası:", error);
    res.status(500).json({ message: "Hesap silinirken bir hata oluştu" });
  }
};

// Kullanıcı tercihlerini güncelleme
exports.updatePreferences = async (req, res) => {
  try {
    const userId = req.user.id;
    const {
      notificationPushEnabled,
      notificationEmailEnabled,
      notificationSmsEnabled,
      notificationMarketing,
      notificationUpdates,
      notificationReminders,
      themeMode,
      preferredLanguage,
      timezone,
    } = req.body;

    const user = await prisma.user.update({
      where: { id: userId },
      data: {
        notificationPushEnabled,
        notificationEmailEnabled,
        notificationSmsEnabled,
        notificationMarketing,
        notificationUpdates,
        notificationReminders,
        themeMode,
        preferredLanguage,
        timezone,
      },
      select: {
        id: true,
        email: true,
        name: true,
        notificationPushEnabled: true,
        notificationEmailEnabled: true,
        notificationSmsEnabled: true,
        notificationMarketing: true,
        notificationUpdates: true,
        notificationReminders: true,
        themeMode: true,
        preferredLanguage: true,
        timezone: true,
      },
    });

    // Audit log
    await prisma.auditLog.create({
      data: {
        userId: userId,
        action: 'UPDATE_PREFERENCES',
        entityType: 'USER',
        entityId: userId,
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
        platform: req.body.platform || 'unknown',
        metadata: JSON.stringify(req.body),
      },
    });

    res.json(user);
  } catch (error) {
    console.error("Tercihler güncelleme hatası:", error);
    res.status(500).json({ message: "Tercihler güncellenirken bir hata oluştu" });
  }
};

// Kullanıcı tercihlerini getirme
exports.getPreferences = async (req, res) => {
  try {
    const userId = req.user.id;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        notificationPushEnabled: true,
        notificationEmailEnabled: true,
        notificationSmsEnabled: true,
        notificationMarketing: true,
        notificationUpdates: true,
        notificationReminders: true,
        themeMode: true,
        preferredLanguage: true,
        timezone: true,
      },
    });

    res.json(user);
  } catch (error) {
    console.error("Tercihler getirme hatası:", error);
    res.status(500).json({ message: "Tercihler getirilirken bir hata oluştu" });
  }
};

// User status değiştirme
exports.updateUserStatus = async (req, res) => {
  try {
    const userId = parseInt(req.params.id);
    const { status, reason } = req.body;

    // Geçerli status değerleri: ACTIVE, INACTIVE, SUSPENDED, BANNED
    const validStatuses = ["ACTIVE", "INACTIVE", "SUSPENDED", "BANNED"];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ message: "Invalid status value" });
    }

    const user = await prisma.user.update({
      where: { id: userId },
      data: { status },
    });

    // Audit log ekle
    await prisma.auditLog.create({
      data: {
        userId: req.user.id,
        action: `USER_STATUS_${status}`,
        entityType: "USER",
        entityId: userId,
        ipAddress: req.ip || req.headers["x-forwarded-for"] || req.connection.remoteAddress,
        userAgent: req.headers["user-agent"],
        platform: req.headers["x-platform"] || "admin",
        metadata: JSON.stringify({ 
          previousStatus: user.status,
          newStatus: status,
          reason: reason || null
        }),
      },
    });

    res.json({ 
      message: `User status updated to ${status}`,
      user 
    });
  } catch (error) {
    console.error("Update user status error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

// User suspend
exports.suspendUser = async (req, res) => {
  try {
    const userId = parseInt(req.params.id);
    const { reason } = req.body;

    const user = await prisma.user.update({
      where: { id: userId },
      data: { status: "SUSPENDED" },
    });

    // Audit log
    await prisma.auditLog.create({
      data: {
        userId: req.user.id,
        action: "USER_SUSPEND",
        entityType: "USER",
        entityId: userId,
        ipAddress: req.ip,
        userAgent: req.headers["user-agent"],
        platform: "admin",
        metadata: JSON.stringify({ reason }),
      },
    });

    res.json({ 
      message: "User suspended successfully",
      user 
    });
  } catch (error) {
    console.error("Suspend user error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

// User ban
exports.banUser = async (req, res) => {
  try {
    const userId = parseInt(req.params.id);
    const { reason } = req.body;

    const user = await prisma.user.update({
      where: { id: userId },
      data: { status: "BANNED" },
    });

    // Audit log
    await prisma.auditLog.create({
      data: {
        userId: req.user.id,
        action: "USER_BAN",
        entityType: "USER",
        entityId: userId,
        ipAddress: req.ip,
        userAgent: req.headers["user-agent"],
        platform: "admin",
        metadata: JSON.stringify({ reason }),
      },
    });

    res.json({ 
      message: "User banned successfully",
      user 
    });
  } catch (error) {
    console.error("Ban user error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

// User activate
exports.activateUser = async (req, res) => {
  try {
    const userId = parseInt(req.params.id);

    const user = await prisma.user.update({
      where: { id: userId },
      data: { status: "ACTIVE" },
    });

    // Audit log
    await prisma.auditLog.create({
      data: {
        userId: req.user.id,
        action: "USER_ACTIVATE",
        entityType: "USER",
        entityId: userId,
        ipAddress: req.ip,
        userAgent: req.headers["user-agent"],
        platform: "admin",
      },
    });

    res.json({ 
      message: "User activated successfully",
      user 
    });
  } catch (error) {
    console.error("Activate user error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

// User login history
exports.getUserLoginHistory = async (req, res) => {
  try {
    const userId = parseInt(req.params.id);

    // Audit loglardan login bilgilerini çek
    const loginHistory = await prisma.auditLog.findMany({
      where: {
        userId: userId,
        action: { in: ["USER_LOGIN", "LOGIN"] },
      },
      orderBy: {
        createdAt: "desc",
      },
      take: 50, // Son 50 login
    });

    // User'ın lastLoginAt bilgisini de ekle
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        lastLoginAt: true,
        lastLoginIp: true,
        lastLoginPlatform: true,
      },
    });

    res.json({
      currentLogin: user,
      history: loginHistory,
    });
  } catch (error) {
    console.error("Get login history error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

// Bulk user status update
exports.bulkUpdateUserStatus = async (req, res) => {
  try {
    const { userIds, status, reason } = req.body;

    // Validate
    if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
      return res.status(400).json({ message: "User IDs array is required" });
    }

    const validStatuses = ["ACTIVE", "INACTIVE", "SUSPENDED", "BANNED"];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ message: "Invalid status value" });
    }

    // Update all users
    const result = await prisma.user.updateMany({
      where: {
        id: { in: userIds.map(id => parseInt(id)) }
      },
      data: { status }
    });

    // Create audit logs for each user
    const auditLogs = userIds.map(userId => ({
      userId: req.user.id,
      action: `BULK_USER_STATUS_${status}`,
      entityType: "USER",
      entityId: parseInt(userId),
      ipAddress: req.ip,
      userAgent: req.headers["user-agent"],
      platform: "admin",
      metadata: JSON.stringify({ 
        status,
        reason: reason || null,
        bulkOperation: true
      }),
    }));

    await prisma.auditLog.createMany({
      data: auditLogs,
    });

    res.json({ 
      message: `${result.count} users updated to ${status}`,
      count: result.count
    });
  } catch (error) {
    console.error("Bulk update user status error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

// Bulk send email (placeholder - gerçek email gönderme için email servisi entegre edilmeli)
exports.bulkSendEmail = async (req, res) => {
  try {
    const { userIds, subject, message } = req.body;

    // Validate
    if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
      return res.status(400).json({ message: "User IDs array is required" });
    }

    if (!subject || !message) {
      return res.status(400).json({ message: "Subject and message are required" });
    }

    // Get users
    const users = await prisma.user.findMany({
      where: {
        id: { in: userIds.map(id => parseInt(id)) }
      },
      select: {
        id: true,
        email: true,
        name: true,
      }
    });

    // TODO: Gerçek email gönderme implementasyonu
    // Bu bir placeholder - production'da gerçek email servisi kullanılmalı
    
    // Email log'ları oluştur
    const emailLogs = users.map(user => ({
      userId: user.id,
      to: user.email,
      subject: subject,
      body: message,
      status: "SENT", // Gerçek implementasyonda email servisinden gelen status kullanılmalı
      sentAt: new Date(),
    }));

    await prisma.emailLog.createMany({
      data: emailLogs,
    });

    // Audit log
    await prisma.auditLog.create({
      data: {
        userId: req.user.id,
        action: "BULK_EMAIL_SEND",
        entityType: "USER",
        entityId: 0, // Bulk operation
        ipAddress: req.ip,
        userAgent: req.headers["user-agent"],
        platform: "admin",
        metadata: JSON.stringify({ 
          subject,
          recipientCount: users.length,
          bulkOperation: true
        }),
      },
    });

    res.json({ 
      message: `Email sent to ${users.length} users`,
      count: users.length,
      recipients: users.map(u => ({ id: u.id, email: u.email }))
    });
  } catch (error) {
    console.error("Bulk send email error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};
