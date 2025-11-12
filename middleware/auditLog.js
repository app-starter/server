const { createAuditLog } = require("../controller/auditLog");

// Audit log middleware
const auditLogMiddleware = (action, entityType) => {
  return async (req, res, next) => {
    // Response'u intercept etmek için original send fonksiyonunu kaydet
    const originalSend = res.send;

    res.send = function (data) {
      // Sadece başarılı işlemleri logla (200-299 status codes)
      if (res.statusCode >= 200 && res.statusCode < 300) {
        // Asenkron olarak audit log kaydet
        setImmediate(async () => {
          try {
            const entityId =
              req.params.id || req.body.id || req.body?.user?.id || null;

            await createAuditLog({
              userId: req.user?.id || null,
              action,
              entityType,
              entityId: entityId ? parseInt(entityId) : null,
              ipAddress:
                req.ip ||
                req.headers["x-forwarded-for"] ||
                req.connection.remoteAddress,
              userAgent: req.headers["user-agent"],
              platform: req.headers["x-platform"] || "web",
              metadata: {
                method: req.method,
                path: req.path,
                query: req.query,
                body: sanitizeBody(req.body),
              },
            });
          } catch (error) {
            console.error("Audit log middleware error:", error);
          }
        });
      }

      // Original send fonksiyonunu çağır
      originalSend.call(this, data);
    };

    next();
  };
};

// Hassas bilgileri temizle
function sanitizeBody(body) {
  if (!body) return {};

  const sanitized = { ...body };

  // Şifre ve hassas bilgileri kaldır
  const sensitiveFields = [
    "password",
    "token",
    "secret",
    "apiKey",
    "creditCard",
  ];

  sensitiveFields.forEach((field) => {
    if (sanitized[field]) {
      sanitized[field] = "[REDACTED]";
    }
  });

  return sanitized;
}

module.exports = auditLogMiddleware;

