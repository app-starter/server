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

    user.permissions = user.roles.map((role) =>
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
