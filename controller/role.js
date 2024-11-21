const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

exports.getRoles = async (req, res) => {
  try {
    const roles = await prisma.role.findMany({
      include: {
        _count: {
          select: { permissions: true }
        }
      }
    });

    const formattedRoles = roles.map(role => ({
      id: role.id,
      name: role.name,
      permissionCount: role._count.permissions
    }));

    res.json( formattedRoles );
  } catch (error) {
    res.status(500).json({ message: "Roller alınırken bir hata oluştu", error: error.message });
  }
};

exports.getRole = async (req, res) => {
  console.log("GET ROLE", req.params.id);
  try {
    const role = await prisma.role.findUnique({
      where: { id: parseInt(req.params.id) },
      include: { permissions: true },
    });

    role.allPermissions = await prisma.permission.findMany();

    res.json(role);
  } catch (error) {
    res.status(500).send(error.message);
  }
};

exports.createRole = async (req, res) => {
  try {
    const role = await prisma.role.create({
      data: {
        name: req.body.name,
      },
    });

    req.body.permissions.forEach(async (permission) => {
      await prisma.rolePermission.create({
        data: {
          roleId: role.id,
          permissionId: parseInt(permission),
        },
      });
    });

    res.json(role);
  } catch (error) {
    res.status(500).send(error.message);
  }
};

exports.updateRole = async (req, res) => {
  try {
    await prisma.$transaction(async (prismax) => {
      // First, disconnect all existing permissions

      await prismax.rolePermission.deleteMany({
        where: { roleId: parseInt(req.params.id) },
      });

      await prismax.role.update({
        where: { id: parseInt(req.params.id) },
        data: {
          name: req.body.name,
        },
      });
      await prismax.rolePermission.createMany({
        data: req.body.permissions.map((rolePermission) => {
          return {
            roleId: parseInt(req.params.id),
            permissionId: parseInt(rolePermission),
          };
        }),
      });
    });
    res.json({ message: "Role updated" });
  } catch (error) {
    res.status(500).send(error.message);
  }
};

exports.deleteRole = async (req, res) => {
  try {
    const role = await prisma.role.findUnique({
      where: {
        id: parseInt(req.params.id),
      },
    });
    if (role.isDefault) {
      return res.status(400).send("Cannot delete default role");
    }

    await prisma.$transaction([
      prisma.rolePermission.deleteMany({
        where: {
          roleId: parseInt(req.params.id),
        },
      }),
      prisma.role.deleteMany({
        where: {
          id: parseInt(req.params.id),
          isDefault: false,
        },
      }),
    ]);

    await prisma.$disconnect();

    res.json({ message: "Role deleted" });
  } catch (error) {
    res.status(500).send(error.message);
  }
};
