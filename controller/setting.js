const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

exports.getGeneralSettings = async (req, res) => {
  try {
    const settingKeys = ['site_title', 'site_description', 'site_icon'];
    const settings = await prisma.setting.findMany({
      where: {
        key: {
          in: settingKeys
        }
      }
    });

   

    const settingsObject = settingKeys.reduce((acc, key) => {
      const setting = settings.find(s => s.key === key);
      acc[key] = setting ? setting.value : ''; // Eğer ayar yoksa boş string döndür
      return acc;
    }, {});

  

    res.json(settingsObject);
  } catch (error) {
    console.error('Genel ayarlar alınırken bir hata oluştu:', error);
    res.status(500).json({ message: 'Genel ayarlar alınırken bir hata oluştu', error: error.message });
  }
};

exports.updateGeneralSettings = async (req, res) => {
  try {
    console.log(req.body);
    const updatedSettings = [];

    for (const { key, value } of req.body) {
      // Eğer value undefined veya null ise, bu ayarı güncelleme
      if (value === undefined || value === null) {
        console.warn(`Ayar "${key}" için geçerli bir değer sağlanmadı. Bu ayar güncellenmeyecek.`);
        continue;
      }

      try {
        let setting = await prisma.setting.findUnique({
          where: { key },
        });

        if (setting) {
          // Ayar varsa güncelle
          setting = await prisma.setting.update({
            where: { key },
            data: { value: String(value) }, // value'yu string'e çevir
          });
        } else {
          // Ayar yoksa oluştur
          setting = await prisma.setting.create({
            data: { key, value: String(value) }, // value'yu string'e çevir
          });
        }

        updatedSettings.push(setting);
      } catch (error) {
        console.error(`"${key}" ayarı güncellenirken hata oluştu:`, error);
        // Hata durumunda bu ayarı atla ve diğerlerine devam et
      }
    }

    res.json(updatedSettings);
  } catch (error) {
    console.error('Genel ayarlar güncellenirken bir hata oluştu:', error);
    res.status(500).json({ message: 'Genel ayarlar güncellenirken bir hata oluştu', error: error.message });
  }
};

// Mevcut getWaitingPageStatus ve updateWaitingPageStatus fonksiyonlarını koruyun
exports.getWaitingPageStatus = async (req, res) => {
  const setting = await prisma.setting.findUnique({
    where: { key: "waiting_page_status" },
  });

  res.json(setting ? setting.value : "inactive");
};

exports.updateWaitingPageStatus = async (req, res) => {
  const { status } = req.body;
  await prisma.setting.upsert({
    where: { key: "waiting_page_status" },
    update: { value: status.status },
    create: { key: "waiting_page_status", value: status.status },
  });
  res.json({ status });
};