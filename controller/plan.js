const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

exports.getPlans = async (req, res) => {
  try {
    const plans = await prisma.plan.findMany({});
    res.json(plans);
  } catch (error) {
    res.status(500).send(error.message);
  }
};

exports.getPlan = async (req, res) => {
  try {
    const plan = await prisma.plan.findUnique({
      where: { id: parseInt(req.params.id) },
      include: {
        planRole: {
          select: {
            role: true,
          },
        },
        features: true, 
      },
    });

    if (!plan) {
      return res.status(404).json({ message: "Plan bulunamadı" });
    }

    plan.allRoles = await prisma.role.findMany();

    res.json(plan);
  } catch (error) {
    res.status(500).send(error.message);
  }
};
exports.getActivePlans = async (req, res) => {
  try {
    const plans = await prisma.plan.findMany({
      where: { isActive: true },
      include: {
        planRole: {
          select: {
            role: true,
          },
        },
        features: true
      },
    });
    res.json(plans);
  } catch (error) {
    res.status(500).send(error.message);
  }
};

exports.createPlan = async (req, res) => {
  try {
    const plan = await prisma.plan.create({
      data: {
        name: req.body.name,
        description: req.body.description,
        price: parseFloat(req.body.price),
        planPriceId: req.body.planPriceId,
        interval: req.body.interval,
        isActive: req.body.isActive,
        features: {
          create: req.body.features.map(feature => ({
            name: feature.name,
            icon: feature.icon
          }))
        }
      },
      include: {
        features: true
      }
    });
    res.json(plan);
  } catch (error) {
    res.status(500).send(error.message);
  }
};

exports.updatePlan = async (req, res) => {
  try {
    const planId = parseInt(req.params.id);

    // Mevcut plan rollerini sil
    await prisma.planRole.deleteMany({
      where: { planId: planId },
    });

    // Planı güncelle, mevcut özellikleri güncelle veya yenilerini ekle
    const updatedPlan = await prisma.plan.update({
      where: { id: planId },
      data: {
        name: req.body.name,
        description: req.body.description,
        price: parseFloat(req.body.price),
        planPriceId: req.body.planPriceId,
        interval: req.body.interval,
        isActive: req.body.isActive,
        features: {
          deleteMany: {}, // Mevcut tüm özellikleri sil
          create: req.body.features.map(feature => ({
            name: feature.name,
            icon: feature.icon
          }))
        }
      },
      include: {
        features: true
      }
    });

    // Yeni plan rollerini ekle
    if (req.body.roles && req.body.roles.length > 0) {
      await prisma.planRole.createMany({
        data: req.body.roles.map((roleId) => ({
          planId: planId,
          roleId: parseInt(roleId),
        })),
      });
    }

    // Güncellenmiş planı tüm ilişkileriyle birlikte getir
    const planWithRelations = await prisma.plan.findUnique({
      where: { id: planId },
      include: {
        features: true,
        planRole: {
          include: {
            role: true
          }
        }
      }
    });

    // Yanıt nesnesini oluştur
    const planResponse = {
      ...planWithRelations,
      roles: planWithRelations.planRole.map(pr => pr.role)
    };

    delete planResponse.planRole; // planRole alanını kaldır, çünkü zaten roles içinde gerekli bilgileri tuttuk

    res.json(planResponse);
  } catch (error) {
    res.status(500).send(error.message);
  }
};

exports.deletePlan = async (req, res) => {
  try {
    await prisma.plan.delete({
      where: { id: parseInt(req.params.id) },
    });

    res.json({ message: "Plan deleted" });
  } catch (error) {
    res.status(500).send(error.message);
  }
};