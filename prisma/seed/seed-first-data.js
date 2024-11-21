const { PrismaClient } = require("@prisma/client");
const { permissionsData } = require("../../config/permission");

require("dotenv").config({ path: "../../.env" });

const bcrypt = require("bcrypt");

const prisma = new PrismaClient();

async function seedPermissions() {
  console.log(`Start seeding...`);
  for (const permission of permissionsData) {
    const exists = await prisma.permission.findUnique({
      where: {
        name: permission.name,
      },
    });

    if (!exists) {
      await prisma.permission.create({
        data: {
          name: permission.name,
        },
      });
      console.log(`Permission '${permission.name}' created.`);
    }
  }
  console.log(`Seeding finished.`);
}

async function createAdmin() {
  const userCount = await prisma.user.count();

  if (userCount === 0) {
    console.log(process.env.ADMIN_EMAIL, process.env.ADMIN_PASSWORD);
    const adminEmail = process.env.ADMIN_EMAIL;
    const adminPassword = process.env.ADMIN_PASSWORD;
    const hashedPassword = await bcrypt.hash(adminPassword, 10);

    const adminUser = await prisma.user.create({
      data: {
        email: adminEmail,
        password: hashedPassword,
        name: "Admin",
      },
    });

    console.log("Admin user created:", adminUser);
  } else {
    console.log(
      "Admin user already exists or users are present. No seed required."
    );
  }
}
async function seedAdminPermissionForAdminRole() {
  const exists = await prisma.role.findUnique({
    where: {
      name: "ADMIN",
    },
  });
  if (!exists) {
    console.error("Admin role not found.");

    await prisma.role.create({
      data: {
        name: "ADMIN",
        isDefault: true,
      },
    });
  }

  const adminRole = await prisma.role.findUnique({
    where: {
      name: "ADMIN",
    },
    select: {
      id: true,
    },
  });

  const adminUser = await prisma.user.findUnique({
    where: {
      email: process.env.ADMIN_EMAIL,
    },
    select: {
      id: true,
    },
  });

  if (adminUser) {
    const exits = await prisma.userRole.findFirst({
      where: {
        userId: adminUser.id,
        roleId: adminRole.id,
      },
    });
    if (!exits) {
      await prisma.userRole.create({
        data: {
          roleId: adminRole.id,
          userId: adminUser.id,
        },
      });
    }
  }

  const permissions = await prisma.permission.findUnique({
    where: {
      name: "ADMIN",
    },
    select: {
      id: true,
    },
  });

  const isRolePermissionExists = await prisma.rolePermission.findFirst({
    where: {
      roleId: adminRole.id,
      permissionId: permissions.id,
    },
  });

  if (!isRolePermissionExists) {
    await prisma.rolePermission.create({
      data: {
        permissionId: permissions.id,
        roleId: adminRole.id,
      },
    });
  }

  console.log("Admin role permissions seeded.");
}
async function seedMemberPermissionForMemberRole() {
  const memberExits = await prisma.role.findUnique({
    where: {
      name: "MEMBER",
    },
    select: {
      id: true,
    },
  });
  if (!memberExits) {
    await prisma.role.create({
      data: {
        name: "MEMBER",
        isDefault: true,
      },
    });
  }
  const memberRole = await prisma.role.findUnique({
    where: {
      name: "MEMBER",
    },
    select: {
      id: true,
    },
  });

  const permissions = await prisma.permission.findMany({
    where: {
      name: {
        in: ["PROFILE_READ"],
      },
    },
    select: {
      id: true,
    },
  });

  for (const permission of permissions) {
    const isRolePermissionExists = await prisma.rolePermission.findFirst({
      where: {
        roleId: memberRole.id,
        permissionId: permission.id,
      },
    });

    if (!isRolePermissionExists) {
      await prisma.rolePermission.create({
        data: {
          permissionId: permission.id,
          roleId: memberRole.id,
        },
      });
    }
  }
}

async function seedSettings() {
  console.log(`Ayarlar ekleniyor...`);
  const defaultSettings = [
    { key: "site_title", value: "App Starter" },
    {
      key: "site_description",
      value:
        "Modern web uygulamalarınızı geliştirmek için ihtiyacınız olan her şey",
    },
    { key: "site_icon", value: "/default-icon.png" },
  ];

  for (const setting of defaultSettings) {
    const exists = await prisma.setting.findUnique({
      where: {
        key: setting.key,
      },
    });

    if (!exists) {
      await prisma.setting.create({
        data: setting,
      });
      console.log(`Ayar '${setting.key}' oluşturuldu.`);
    } else {
      console.log(`Ayar '${setting.key}' zaten mevcut.`);
    }
  }
  console.log(`Ayarlar ekleme işlemi tamamlandı.`);
}

async function seedEmailTemplates() {
  const passwordResetTemplate = await prisma.emailTemplate.upsert({
    where: { name: "PASSWORD_RESET" },
    update: {},
    create: {
      name: "PASSWORD_RESET",
      subject: "Şifre Sıfırlama İsteği",
      content: `
        <html>
          <body>
            <h1>Merhaba {{name}},</h1>
            <p>Şifrenizi sıfırlamak için bir istek aldık. Eğer bu isteği siz yaptıysanız, aşağıdaki bağlantıya tıklayarak şifrenizi sıfırlayabilirsiniz:</p>
            <p><a href="{{resetUrl}}">Şifremi Sıfırla</a></p>
            <p>Bu bağlantı 1 saat boyunca geçerli olacaktır.</p>
            <p>Eğer şifre sıfırlama isteğinde bulunmadıysanız, bu e-postayı görmezden gelebilirsiniz.</p>
            <p>Saygılarımızla,<br>App Starter Ekibi</p>
          </body>
        </html>
      `,
    },
  });

  console.log("Password reset email template seeded:", passwordResetTemplate);
}

async function main() {
  await createAdmin();
  await seedPermissions();
  await seedAdminPermissionForAdminRole();
  await seedMemberPermissionForMemberRole();
  await seedSettings();
  await seedEmailTemplates(); // Add this line
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
