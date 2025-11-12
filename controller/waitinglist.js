const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

exports.addToWaitingList = async (req, res) => {
  const { email, name } = req.body;

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
      data: { 
        email,
        name: name || null
      },
    });

    res.status(201).json(waitingListEntry);
  } catch (error) {
    console.error("Bekleme listesine ekleme hatası:", error);
    res.status(500).json({ message: "Bir hata oluştu" });
  }
};

exports.getWaitingList = async (req, res) => {
  try {
    const { page = 1, limit = 50, search } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const where = {};
    if (search) {
      where.OR = [
        { email: { contains: search, mode: 'insensitive' } },
        { name: { contains: search, mode: 'insensitive' } }
      ];
    }

    const [waitingList, total] = await Promise.all([
      prisma.waitingList.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: parseInt(limit),
      }),
      prisma.waitingList.count({ where })
    ]);

    res.json({
      data: waitingList,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error("Bekleme listesi getirme hatası:", error);
    res.status(500).json({ message: "Bir hata oluştu" });
  }
};

// Bulk email to waiting list
exports.sendBulkEmailToWaitingList = async (req, res) => {
  try {
    const { subject, message, selectedIds } = req.body;

    if (!subject || !message) {
      return res.status(400).json({ message: "Konu ve mesaj gereklidir" });
    }

    // Get waiting list entries
    const where = selectedIds && selectedIds.length > 0 
      ? { id: { in: selectedIds.map(id => parseInt(id)) } }
      : {};

    const waitingListEntries = await prisma.waitingList.findMany({
      where,
      select: {
        id: true,
        email: true,
        name: true,
      }
    });

    if (waitingListEntries.length === 0) {
      return res.status(404).json({ message: "Alıcı bulunamadı" });
    }

    // TODO: Gerçek email gönderme implementasyonu
    // Bu bir placeholder - production'da gerçek email servisi kullanılmalı
    
    // Email log'ları oluştur (user yok, sadece email var)
    const emailLogs = waitingListEntries.map(entry => ({
      userId: null, // Waiting list'teki kişiler henüz user değil
      to: entry.email,
      subject: subject,
      body: message.replace('{{name}}', entry.name || 'Değerli Kullanıcı'),
      status: "SENT",
      sentAt: new Date(),
    }));

    await prisma.emailLog.createMany({
      data: emailLogs,
    });

    // Audit log
    await prisma.auditLog.create({
      data: {
        userId: req.user.id,
        action: "WAITING_LIST_BULK_EMAIL",
        entityType: "WAITING_LIST",
        entityId: 0,
        ipAddress: req.ip,
        userAgent: req.headers["user-agent"],
        platform: "admin",
        metadata: JSON.stringify({ 
          subject,
          recipientCount: waitingListEntries.length,
          selectedIds: selectedIds || "all"
        }),
      },
    });

    res.json({ 
      message: `${waitingListEntries.length} kişiye email gönderildi`,
      count: waitingListEntries.length,
      recipients: waitingListEntries.map(e => e.email)
    });
  } catch (error) {
    console.error("Toplu email gönderme hatası:", error);
    res.status(500).json({ message: "Bir hata oluştu" });
  }
};

// Delete from waiting list
exports.deleteFromWaitingList = async (req, res) => {
  try {
    const { id } = req.params;

    await prisma.waitingList.delete({
      where: { id: parseInt(id) }
    });

    res.json({ message: "Bekleme listesinden silindi" });
  } catch (error) {
    console.error("Silme hatası:", error);
    res.status(500).json({ message: "Bir hata oluştu" });
  }
};

// Get waiting list statistics
exports.getWaitingListStats = async (req, res) => {
  try {
    const [
      totalEntries,
      todayEntries,
      thisWeekEntries,
      thisMonthEntries
    ] = await Promise.all([
      prisma.waitingList.count(),
      prisma.waitingList.count({
        where: {
          createdAt: {
            gte: new Date(new Date().setHours(0, 0, 0, 0))
          }
        }
      }),
      prisma.waitingList.count({
        where: {
          createdAt: {
            gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
          }
        }
      }),
      prisma.waitingList.count({
        where: {
          createdAt: {
            gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
          }
        }
      })
    ]);

    res.json({
      data: {
        totalEntries,
        todayEntries,
        thisWeekEntries,
        thisMonthEntries
      }
    });
  } catch (error) {
    console.error("İstatistik hatası:", error);
    res.status(500).json({ message: "Bir hata oluştu" });
  }
};