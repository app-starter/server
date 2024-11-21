const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

exports.getEmailTemplates = async (req, res) => {
  try {
    const templates = await prisma.emailTemplate.findMany();
    res.json(templates);
  } catch (error) {
    res
      .status(500)
      .json({
        message: "Error fetching email templates",
        error: error.message,
      });
  }
};

exports.getEmailTemplate = async (req, res) => {
  try {
    const template = await prisma.emailTemplate.findUnique({
      where: { id: parseInt(req.params.id) },
    });
    if (!template) {
      return res.status(404).json({ message: "Email template not found" });
    }
    res.json(template);
  } catch (error) {
    res
      .status(500)
      .json({ message: "Error fetching email template", error: error.message });
  }
};

exports.createEmailTemplate = async (req, res) => {
  try {
    const { name, subject, content } = req.body;
    const template = await prisma.emailTemplate.create({
      data: { name, subject, content },
    });
    res.status(201).json(template);
  } catch (error) {
    res
      .status(500)
      .json({ message: "Error creating email template", error: error.message });
  }
};

exports.updateEmailTemplate = async (req, res) => {
  try {
    const { name, subject, content } = req.body;
    const template = await prisma.emailTemplate.update({
      where: { id: parseInt(req.params.id) },
      data: { name, subject, content },
    });
    res.json(template);
  } catch (error) {
    res
      .status(500)
      .json({ message: "Error updating email template", error: error.message });
  }
};

exports.deleteEmailTemplate = async (req, res) => {
  try {
    await prisma.emailTemplate.delete({
      where: { id: parseInt(req.params.id) },
    });
    res.json({ message: "Email template deleted successfully" });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Error deleting email template", error: error.message });
  }
};
