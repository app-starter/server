const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
const { Resend } = require("resend");
const resend = new Resend(process.env.RESEND_API_KEY);

async function sendEmail(to, templateName, data) {
  try {
    const template = await prisma.emailTemplate.findFirst({
      where: { name: templateName },
    });

    if (!template) {
      throw new Error(`Email template '${templateName}' not found`);
    }

    let subject = template.subject;
    let content = template.content;

    // Replace placeholders in subject and content
    Object.keys(data).forEach((key) => {
      const regex = new RegExp(`{{${key}}}`, "g");
      subject = subject.replace(regex, data[key]);
      content = content.replace(regex, data[key]);
    });

    const response = await resend.emails.send({
      from: "App Starter <info@eymel.co>",
      to: to,
      subject: subject,
      html: content,
    });

    console.log("Email sent successfully:", response);
    return response;
  } catch (error) {
    console.error("Error sending email:", error);
    throw error;
  }
}

module.exports = { sendEmail };
