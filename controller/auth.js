const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const { PrismaClient } = require("@prisma/client");
const { sendEmail } = require("./email");
const prisma = new PrismaClient();

exports.login = async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: "Email ve şifre boş olamaz" });
  }

  try {
    const user = await prisma.user.findUnique({ where: { email } });

    if (!user) {
      return res.status(401).json({ message: "Geçersiz email veya şifre" });
    }

    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      return res.status(401).json({ message: "Geçersiz email veya şifre" });
    }

    const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET, {
      expiresIn: "60d",
    });

    return res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
      },
    });
  } catch (error) {
    console.error("Login hatası:", error);
    res.status(500).json({ message: "Sunucu hatası" });
  }
};

exports.register = async (req, res) => {
  const { email, password, name } = req.body;

  if (!email || !password || !name) {
    return res.status(400).json({ message: "Email, isim ve şifre boş olamaz" });
  }

  try {
    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return res
        .status(409)
        .json({ message: "Bu email adresi zaten kullanımda" });
    }

    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    const user = await prisma.user.create({
      data: {
        email,
        name,
        password: hashedPassword,
        roles: {
          create: {
            role: {
              connect: {
                name: "MEMBER",
              },
            },
          },
        },
      },
    });

    // Kullanıcı oluşturulduktan sonra token oluştur
    const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET, {
      expiresIn: "60d",
    });

    // Token ve kullanıcı bilgilerini döndür
    return res.status(201).json({
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
      },
    });
  } catch (error) {
    console.error("Kayıt hatası:", error);
    return res
      .status(500)
      .json({ message: "Kayıt işlemi sırasında bir hata oluştu" });
  }
};

exports.changePassword = async (req, res) => {
  const { oldPassword, newPassword } = req.body;
  const userId = req.user.id;

  try {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      return res.status(404).json({ message: "Kullanıcı bulunamadı" });
    }

    const isValidPassword = await bcrypt.compare(oldPassword, user.password);
    if (!isValidPassword) {
      return res.status(400).json({ message: "Mevcut şifre yanlış" });
    }

    const saltRounds = 10;
    const hashedNewPassword = await bcrypt.hash(newPassword, saltRounds);

    await prisma.user.update({
      where: { id: userId },
      data: { password: hashedNewPassword },
    });

    res.json({ message: "Şifre başarıyla değiştirildi" });
  } catch (error) {
    console.error("Şifre değiştirme hatası:", error);
    res.status(500).json({ message: "Şifre değiştirilirken bir hata oluştu" });
  }
};
exports.forgotPassword = async (req, res) => {
  const { email } = req.body;

  try {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return res.status(404).json({ message: "Kullanıcı bulunamadı" });
    }

    const resetToken = crypto.randomBytes(20).toString("hex");
    const resetTokenExpiry = Date.now() + 3600000; // 1 hour from now

    await prisma.user.update({
      where: { id: user.id },
      data: { resetToken, resetTokenExpiry: new Date(resetTokenExpiry) },
    });

    const resetUrl = `${process.env.CLIENT_DOMAIN}/reset-password?token=${resetToken}`;

    await sendEmail(user.email, "PASSWORD_RESET", {
      name: user.name,
      resetUrl: resetUrl,
    });

    res.json({ message: "Şifre sıfırlama e-postası gönderildi" });
  } catch (error) {
    console.error("Şifre sıfırlama hatası:", error);
    res
      .status(500)
      .json({ message: "Şifre sıfırlama işlemi sırasında bir hata oluştu" });
  }
};

exports.resetPassword = async (req, res) => {
  const { token, password } = req.body;

  console.log(token, password);
  try {
    const user = await prisma.user.findFirst({
      where: { resetToken: token, resetTokenExpiry: { gt: new Date() } },
    });

    if (!user) {
      return res
        .status(400)
        .json({ message: "Geçersiz veya süresi dolmuş token" });
    }

    const saltRounds = 10;
    const hashedNewPassword = await bcrypt.hash(password, saltRounds);

    await prisma.user.update({
      where: { id: user.id },
      data: {
        password: hashedNewPassword,
        resetToken: null,
        resetTokenExpiry: null,
      },
    });

    res.json({ message: "Şifre başarıyla değiştirildi" });
  } catch (error) {
    console.error("Şifre değiştirme hatası:", error);
    res.status(500).json({ message: "Şifre değiştirilirken bir hata oluştu" });
  }
};

exports.socialLogin = async (req, res) => {
  const { provider, userData } = req.body;

  try {
    let user;

    if (provider === "google") {
      user = await handleGoogleLogin(userData);
    } else if (provider === "apple") {
      user = await handleAppleLogin(userData);
    } else {
      return res.status(400).json({ message: "Unsupported login provider" });
    }

    const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET, {
      expiresIn: "60d",
    });

    return res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
      },
    });
  } catch (error) {
    console.error("Social login error:", error);
    res.status(500).json({ message: "An error occurred during social login" });
  }
};
async function handleAppleLogin(userData) {
  let user = await prisma.user.findFirst({
    where: {
      OR: [{ appleId: userData.id }, { email: userData.email }],
    },
  });

  if (!user) {
    user = await prisma.user.create({
      data: {
        appleId: userData.id,
        email: userData.email,
        name: userData.name || "Apple User", // Apple might not provide the name
        roles: {
          create: {
            role: {
              connect: {
                name: "MEMBER",
              },
            },
          },
        },
      },
    });
  } else if (!user.appleId) {
    user = await prisma.user.update({
      where: { id: user.id },
      data: { appleId: userData.id },
    });
  }

  return user;
}
