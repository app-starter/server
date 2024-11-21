const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

exports.getPermissions = async (req, res) => {
  try {
    const permissions = await prisma.permission.findMany();
    res.json(permissions);
  } catch (error) {
    res.status(500).send(error.message);
  }
};
