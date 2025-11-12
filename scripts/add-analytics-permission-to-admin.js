const { PrismaClient } = require("@prisma/client");
require("dotenv").config();

const prisma = new PrismaClient();

async function addAnalyticsPermissionToAdmin() {
  try {
    // Admin rolünü bul
    const adminRole = await prisma.role.findUnique({
      where: { name: "ADMIN" },
    });

    if (!adminRole) {
      console.error("Admin role not found!");
      return;
    }

    console.log("Admin role found:", adminRole.id);

    // Yeni permissionları bul
    const newPermissions = [
      "ANALYTICS_READ",
      "AUDIT_LOG_READ",
      "TRANSACTION_READ",
      "TRANSACTION_REFUND",
      "EMAIL_LOG_READ",
      "NOTIFICATION_READ",
      "USER_SUSPEND",
      "USER_BAN",
      "SUBSCRIPTION_CANCEL",
      "BULK_OPERATIONS",
      "PUSH_NOTIFICATION_SEND",
      "PUSH_NOTIFICATION_READ",
      "DEVICE_READ",
      "DEVICE_BAN",
      "APP_VERSION_CREATE",
      "APP_VERSION_UPDATE",
      "APP_VERSION_DELETE",
      "FEATURE_FLAG_CREATE",
      "FEATURE_FLAG_UPDATE",
      "FEATURE_FLAG_DELETE",
      "FEATURE_FLAG_TOGGLE",
      "REMOTE_CONFIG_UPDATE",
      "REMOTE_CONFIG_READ",
      "ANNOUNCEMENT_CREATE",
      "ANNOUNCEMENT_UPDATE",
      "ANNOUNCEMENT_DELETE",
      "MOBILE_ANALYTICS_READ",
      "CRASH_REPORT_READ",
    ];

    for (const permName of newPermissions) {
      const permission = await prisma.permission.findUnique({
        where: { name: permName },
      });

      if (permission) {
        // Bu permission zaten admin'de var mı kontrol et
        const exists = await prisma.rolePermission.findUnique({
          where: {
            roleId_permissionId: {
              roleId: adminRole.id,
              permissionId: permission.id,
            },
          },
        });

        if (!exists) {
          await prisma.rolePermission.create({
            data: {
              roleId: adminRole.id,
              permissionId: permission.id,
            },
          });
          console.log(`✓ Added ${permName} to Admin role`);
        } else {
          console.log(`- ${permName} already exists`);
        }
      } else {
        console.log(`✗ Permission ${permName} not found in database`);
      }
    }

    console.log("\n✅ Done! Admin role now has all new permissions.");
  } catch (error) {
    console.error("Error:", error);
  } finally {
    await prisma.$disconnect();
  }
}

addAnalyticsPermissionToAdmin();

