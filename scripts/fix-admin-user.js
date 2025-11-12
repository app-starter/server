const { PrismaClient } = require("@prisma/client");
require("dotenv").config();

const prisma = new PrismaClient();

async function fixAdminUser() {
  try {
    console.log("Checking admin user...");
    
    // Admin kullanıcısını bul
    const adminEmail = process.env.ADMIN_EMAIL || "admin@example.com";
    const adminUser = await prisma.user.findUnique({
      where: { email: adminEmail },
      include: {
        roles: {
          include: {
            role: true
          }
        }
      }
    });

    if (!adminUser) {
      console.error(`❌ Admin user not found with email: ${adminEmail}`);
      console.log("Please check your .env file ADMIN_EMAIL");
      return;
    }

    console.log(`✓ Found admin user: ${adminUser.email} (ID: ${adminUser.id})`);
    console.log(`  Current roles:`, adminUser.roles.map(r => r.role.name));

    // ADMIN role'ünü bul
    const adminRole = await prisma.role.findUnique({
      where: { name: "ADMIN" },
    });

    if (!adminRole) {
      console.error("❌ ADMIN role not found!");
      console.log("Creating ADMIN role...");
      
      const newAdminRole = await prisma.role.create({
        data: {
          name: "ADMIN",
          isDefault: false,
        }
      });
      console.log(`✓ Created ADMIN role (ID: ${newAdminRole.id})`);
    }

    const adminRoleId = adminRole ? adminRole.id : (await prisma.role.findUnique({ where: { name: "ADMIN" } })).id;
    
    // Admin kullanıcısının ADMIN role'ü var mı kontrol et
    const hasAdminRole = await prisma.userRole.findUnique({
      where: {
        userId_roleId: {
          userId: adminUser.id,
          roleId: adminRoleId,
        }
      }
    });

    if (!hasAdminRole) {
      console.log("Adding ADMIN role to admin user...");
      await prisma.userRole.create({
        data: {
          userId: adminUser.id,
          roleId: adminRoleId,
        }
      });
      console.log("✅ ADMIN role added to admin user!");
    } else {
      console.log("✓ Admin user already has ADMIN role");
    }

    // User status'ü kontrol et ve ACTIVE yap
    if (adminUser.status !== "ACTIVE") {
      await prisma.user.update({
        where: { id: adminUser.id },
        data: { status: "ACTIVE" }
      });
      console.log("✓ Admin user status set to ACTIVE");
    }

    // Tüm permissionları ADMIN role'e ekle (emin olmak için)
    const allPermissions = await prisma.permission.findMany();
    console.log(`\nFound ${allPermissions.length} permissions in database`);
    
    let addedCount = 0;
    for (const permission of allPermissions) {
      const exists = await prisma.rolePermission.findUnique({
        where: {
          roleId_permissionId: {
            roleId: adminRoleId,
            permissionId: permission.id,
          }
        }
      });

      if (!exists) {
        await prisma.rolePermission.create({
          data: {
            roleId: adminRoleId,
            permissionId: permission.id,
          }
        });
        addedCount++;
      }
    }

    console.log(`✓ Added ${addedCount} missing permissions to ADMIN role`);
    
    // Final kontrol
    const updatedUser = await prisma.user.findUnique({
      where: { email: adminEmail },
      include: {
        roles: {
          include: {
            role: {
              include: {
                permissions: {
                  include: {
                    permission: true
                  }
                }
              }
            }
          }
        }
      }
    });

    console.log("\n✅ Admin user is now fully configured!");
    console.log(`  Email: ${updatedUser.email}`);
    console.log(`  Status: ${updatedUser.status}`);
    console.log(`  Roles: ${updatedUser.roles.map(r => r.role.name).join(", ")}`);
    console.log(`  Permissions: ${updatedUser.roles[0]?.role.permissions.length || 0}`);
    
  } catch (error) {
    console.error("❌ Error:", error);
  } finally {
    await prisma.$disconnect();
  }
}

fixAdminUser();

