const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

exports.addToWaitingList = async (req, res) => {
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({ message: "E-posta adresi gereklidir" });
  }

  // Check if the email is already in the waiting list
  const existingEntry = await prisma.waitingList.findUnique({
    where: { email },
  });

  if (existingEntry) {
    return res.status(400).json({ message: "E-posta adresi zaten bekleme listesinde" });
  }

  try {
    const waitingListEntry = await prisma.waitingList.create({
      data: { email },
    });

    res.status(201).json(waitingListEntry);
  } catch (error) {
    console.error("Bekleme listesine ekleme hatası:", error);
    res.status(500).json({ message: "Bir hata oluştu" });
  }
};

exports.getWaitingList = async (req, res) => {
  try {
    const waitingList = await prisma.waitingList.findMany({
      orderBy: { createdAt: 'desc' },
     
    });

    res.json(waitingList);
  } catch (error) {
    console.error("Bekleme listesi getirme hatası:", error);
    res.status(500).json({ message: "Bir hata oluştu" });
  }
};