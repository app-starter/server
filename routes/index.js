const express = require("express");
const router = express.Router();

const passport = require("passport");

const authController = require("../controller/auth");
const userController = require("../controller/user");
const roleController = require("../controller/role");
const permissionController = require("../controller/permission");
const settingController = require("../controller/setting");
const stripeController = require("../controller/stripe");
const planController = require("../controller/plan");
const subscriptionController = require("../controller/subscription");
const revenueCatController = require("../controller/revenueCat");
const waitingListController = require("../controller/waitinglist");
const emailTemplateController = require("../controller/emailTemplate");
const analyticsController = require("../controller/analytics");
const auditLogController = require("../controller/auditLog");
const transactionController = require("../controller/transaction");
const emailLogController = require("../controller/emailLog");
const notificationController = require("../controller/notification");
const pushNotificationController = require("../controller/pushNotification");
const deviceController = require("../controller/device");
const appVersionController = require("../controller/appVersion");
const featureFlagController = require("../controller/featureFlag");
const remoteConfigController = require("../controller/remoteConfig");

const { authorize, authorizeWithRole } = require("../middleware/authorize");
const auditLogMiddleware = require("../middleware/auditLog");
const jwt = require("jsonwebtoken");

const { authenticateJwt } = require("../middleware/authorize");

// Auth Routesr
router.post("/register", authController.register);
router.post("/login", authController.login);
router.post("/forgot-password", authController.forgotPassword);
router.post("/reset-password", authController.resetPassword);

// User Routes
router.get(
  "/users",
  authenticateJwt,
  authorizeWithRole(["USER_READ"]),
  userController.getUsers
);
router.get(
  "/users/:id",
  authenticateJwt,
  authorizeWithRole(["USER_READ"]),
  userController.getUser
);
router.post(
  "/users",
  authenticateJwt,
  authorizeWithRole(["USER_CREATE"]),
  auditLogMiddleware("USER_CREATE", "user"),
  userController.createUser
);
router.put(
  "/users/:id",
  authenticateJwt,
  authorizeWithRole(["USER_UPDATE"]),
  auditLogMiddleware("USER_UPDATE", "user"),
  userController.updateUser
);
router.delete(
  "/users/:id",
  authenticateJwt,
  authorizeWithRole(["USER_DELETE"]),
  auditLogMiddleware("USER_DELETE", "user"),
  userController.deleteUser
);

// User Status Management Routes
router.patch(
  "/users/:id/status",
  authenticateJwt,
  authorizeWithRole(["USER_STATUS_UPDATE"]),
  userController.updateUserStatus
);
router.patch(
  "/users/:id/suspend",
  authenticateJwt,
  authorizeWithRole(["USER_SUSPEND"]),
  userController.suspendUser
);
router.patch(
  "/users/:id/ban",
  authenticateJwt,
  authorizeWithRole(["USER_BAN"]),
  userController.banUser
);
router.patch(
  "/users/:id/activate",
  authenticateJwt,
  authorizeWithRole(["USER_ACTIVATE"]),
  userController.activateUser
);
router.get(
  "/users/:id/login-history",
  authenticateJwt,
  authorizeWithRole(["USER_READ"]),
  userController.getUserLoginHistory
);

// Bulk Operations
router.post(
  "/users/bulk/status",
  authenticateJwt,
  authorizeWithRole(["BULK_OPERATIONS"]),
  userController.bulkUpdateUserStatus
);
router.post(
  "/users/bulk/email",
  authenticateJwt,
  authorizeWithRole(["BULK_OPERATIONS"]),
  userController.bulkSendEmail
);

router.get(
  "/roles",
  authenticateJwt,
  authorizeWithRole(["ROLE_READ"]),
  roleController.getRoles
);
router.get(
  "/roles/:id",
  authenticateJwt,
  authorizeWithRole(["ROLE_READ"]),
  roleController.getRole
);
router.post(
  "/roles",
  authenticateJwt,
  authorizeWithRole(["ROLE_CREATE"]),
  roleController.createRole
);
router.put(
  "/roles/:id",
  authenticateJwt,
  authorizeWithRole(["ROLE_UPDATE"]),
  roleController.updateRole
);
router.delete(
  "/roles/:id",
  authenticateJwt,
  authorizeWithRole(["ROLE_DELETE"]),
  roleController.deleteRole
);

router.get(
  "/permissions",
  authenticateJwt,
  authorizeWithRole(["PERMISSION_READ"]),
  permissionController.getPermissions
);

router.get(
  "/profile",
  authenticateJwt,
  authorizeWithRole(["PROFILE_READ"]),
  userController.profile
);

router.get(
  "/settings/waiting-page-status",
  settingController.getWaitingPageStatus
);
router.post(
  "/settings/waiting-page-status",
  settingController.updateWaitingPageStatus
);
router.get("/settings/general", settingController.getGeneralSettings);
router.put("/settings/general", settingController.updateGeneralSettings);

router.post(
  "/create-checkout-session",
  authenticateJwt,
  stripeController.createCheckoutSession
);

// Plan Routes
// User Routes
router.get(
  "/plans",
  authenticateJwt,
  authorizeWithRole(["PLAN_READ"]),
  planController.getPlans
);
router.get(
  "/plans/:id",
  authenticateJwt,
  authorizeWithRole(["PLAN_READ"]),
  planController.getPlan
);
router.post(
  "/plans",
  authenticateJwt,
  authorizeWithRole(["PLAN_CREATE"]),
  planController.createPlan
);
router.put(
  "/plans/:id",
  authenticateJwt,
  authorizeWithRole(["PLAN_UPDATE"]),
  planController.updatePlan
);
router.delete(
  "/plans/:id",
  authenticateJwt,
  authorizeWithRole(["PLAN_DELETE"]),
  planController.deletePlan
);
router.get("/getPlans", planController.getActivePlans);

// Abonelik Rotaları
router.get(
  "/subscriptions",
  authenticateJwt,
  authorizeWithRole(["SUBSCRIPTION_READ"]),
  subscriptionController.getSubscriptions
);
router.get(
  "/subscriptions/:id",
  authenticateJwt,
  authorizeWithRole(["SUBSCRIPTION_READ"]),
  subscriptionController.getSubscription
);
router.post(
  "/subscriptions",
  authenticateJwt,
  authorizeWithRole(["SUBSCRIPTION_CREATE"]),
  subscriptionController.createSubscription
);
router.put(
  "/subscriptions/:id",
  authenticateJwt,
  authorizeWithRole(["SUBSCRIPTION_UPDATE"]),
  subscriptionController.updateSubscription
);
router.delete(
  "/subscriptions/:id",
  authenticateJwt,
  authorizeWithRole(["SUBSCRIPTION_DELETE"]),
  subscriptionController.deleteSubscription
);

// Stripe Routes (for web payments)
router.post("/create-checkout-session", authenticateJwt, stripeController.createCheckoutSession);
router.post("/webhooks/stripe", express.raw({ type: "application/json" }), stripeController.webhook);

// RevenueCat Routes (for mobile in-app purchases)
router.post("/webhooks/revenuecat", revenueCatController.handleWebhook); // No auth for webhooks
router.post("/subscriptions/revenuecat/sync", authenticateJwt, revenueCatController.syncCustomerInfo);
router.get("/subscriptions/revenuecat/my", authenticateJwt, revenueCatController.getRevenueCatSubscription);

router.post("/change-password", authenticateJwt, authController.changePassword);

// User Preferences
router.get("/preferences", authenticateJwt, userController.getPreferences);
router.put("/preferences", authenticateJwt, userController.updatePreferences);

// Delete My Account (self-delete)
router.delete("/my-account", authenticateJwt, userController.deleteMyAccount);

router.get(
  "/auth/google",
  passport.authenticate("google", { scope: ["profile", "email"] })
);

router.get(
  "/auth/google/callback",
  passport.authenticate("google", { failureRedirect: "/login" }),
  function (req, res) {
    // Başarılı kimlik doğrulama, JWT token oluştur ve gönder
    const token = jwt.sign({ userId: req.user.id }, process.env.JWT_SECRET, {
      expiresIn: "60d",
    });
    res.redirect(`http://localhost:3000/login?token=${token}`);
  }
);

router.post("/social-login", authController.socialLogin);
router.post("/waiting-list", waitingListController.addToWaitingList);
router.get("/waiting-list", authenticateJwt, authorizeWithRole(["USER_READ"]), waitingListController.getWaitingList);
router.get("/waiting-list/stats", authenticateJwt, authorizeWithRole(["USER_READ"]), waitingListController.getWaitingListStats);
router.post("/waiting-list/bulk-email", authenticateJwt, authorizeWithRole(["BULK_OPERATIONS"]), waitingListController.sendBulkEmailToWaitingList);
router.delete("/waiting-list/:id", authenticateJwt, authorizeWithRole(["USER_DELETE"]), waitingListController.deleteFromWaitingList);

router.get(
  "/email-templates",
  authenticateJwt,
  emailTemplateController.getEmailTemplates
);
router.get(
  "/email-templates/:id",
  authenticateJwt,
  emailTemplateController.getEmailTemplate
);
router.post(
  "/email-templates",
  authenticateJwt,
  emailTemplateController.createEmailTemplate
);
router.put(
  "/email-templates/:id",
  authenticateJwt,
  emailTemplateController.updateEmailTemplate
);
router.delete(
  "/email-templates/:id",
  authenticateJwt,
  emailTemplateController.deleteEmailTemplate
);

// Analytics Routes
router.get(
  "/admin/analytics/dashboard",
  authenticateJwt,
  authorizeWithRole(["ANALYTICS_READ"]),
  analyticsController.getDashboardStats
);
router.get(
  "/admin/analytics/revenue",
  authenticateJwt,
  authorizeWithRole(["ANALYTICS_READ"]),
  analyticsController.getRevenueAnalytics
);
router.get(
  "/admin/analytics/user-growth",
  authenticateJwt,
  authorizeWithRole(["ANALYTICS_READ"]),
  analyticsController.getUserGrowthAnalytics
);

// Audit Log Routes
router.get(
  "/admin/audit-logs",
  authenticateJwt,
  authorizeWithRole(["AUDIT_LOG_READ"]),
  auditLogController.getAuditLogs
);
router.get(
  "/admin/audit-logs/:id",
  authenticateJwt,
  authorizeWithRole(["AUDIT_LOG_READ"]),
  auditLogController.getAuditLog
);
router.get(
  "/admin/audit-logs/user/:userId",
  authenticateJwt,
  authorizeWithRole(["AUDIT_LOG_READ"]),
  auditLogController.getUserAuditLogs
);
router.get(
  "/admin/audit-logs/stats",
  authenticateJwt,
  authorizeWithRole(["AUDIT_LOG_READ"]),
  auditLogController.getAuditLogStats
);

// Transaction Routes
router.get(
  "/admin/transactions",
  authenticateJwt,
  authorizeWithRole(["TRANSACTION_READ"]),
  transactionController.getTransactions
);
router.get(
  "/admin/transactions/stats",
  authenticateJwt,
  authorizeWithRole(["TRANSACTION_READ"]),
  transactionController.getTransactionStats
);
router.get(
  "/admin/transactions/:id",
  authenticateJwt,
  authorizeWithRole(["TRANSACTION_READ"]),
  transactionController.getTransaction
);
router.post(
  "/admin/transactions/:id/refund",
  authenticateJwt,
  authorizeWithRole(["TRANSACTION_REFUND"]),
  transactionController.processRefund
);
router.get(
  "/admin/users/:userId/transactions",
  authenticateJwt,
  authorizeWithRole(["TRANSACTION_READ"]),
  transactionController.getUserTransactions
);

// Email Log Routes
router.get(
  "/admin/email-logs",
  authenticateJwt,
  authorizeWithRole(["EMAIL_LOG_READ"]),
  emailLogController.getEmailLogs
);
router.get(
  "/admin/email-logs/stats",
  authenticateJwt,
  authorizeWithRole(["EMAIL_LOG_READ"]),
  emailLogController.getEmailLogStats
);
router.get(
  "/admin/email-logs/:id",
  authenticateJwt,
  authorizeWithRole(["EMAIL_LOG_READ"]),
  emailLogController.getEmailLog
);
router.post(
  "/admin/email-logs/:id/resend",
  authenticateJwt,
  authorizeWithRole(["EMAIL_LOG_READ"]),
  emailLogController.resendEmail
);
router.get(
  "/admin/users/:userId/email-logs",
  authenticateJwt,
  authorizeWithRole(["EMAIL_LOG_READ"]),
  emailLogController.getUserEmailLogs
);

// Notification Routes
router.get(
  "/admin/notifications",
  authenticateJwt,
  authorizeWithRole(["NOTIFICATION_READ"]),
  notificationController.getNotifications
);
router.get(
  "/admin/notifications/stats",
  authenticateJwt,
  authorizeWithRole(["NOTIFICATION_READ"]),
  notificationController.getNotificationStats
);
router.get(
  "/admin/notifications/:id",
  authenticateJwt,
  authorizeWithRole(["NOTIFICATION_READ"]),
  notificationController.getNotification
);
router.post(
  "/admin/notifications",
  authenticateJwt,
  authorizeWithRole(["NOTIFICATION_READ"]),
  notificationController.createNotification
);
router.post(
  "/admin/notifications/bulk",
  authenticateJwt,
  authorizeWithRole(["NOTIFICATION_READ"]),
  notificationController.bulkCreateNotifications
);
router.patch(
  "/admin/notifications/:id/read",
  authenticateJwt,
  authorizeWithRole(["NOTIFICATION_READ"]),
  notificationController.markAsRead
);
router.patch(
  "/admin/notifications/user/:userId/read-all",
  authenticateJwt,
  authorizeWithRole(["NOTIFICATION_READ"]),
  notificationController.markAllAsRead
);
router.delete(
  "/admin/notifications/:id",
  authenticateJwt,
  authorizeWithRole(["NOTIFICATION_READ"]),
  notificationController.deleteNotification
);
router.get(
  "/admin/users/:userId/notifications",
  authenticateJwt,
  authorizeWithRole(["NOTIFICATION_READ"]),
  notificationController.getUserNotifications
);

// Push Notification Routes
router.get(
  "/admin/push-notifications",
  authenticateJwt,
  authorizeWithRole(["PUSH_NOTIFICATION_READ"]),
  pushNotificationController.getPushNotifications
);
router.get(
  "/admin/push-notifications/stats",
  authenticateJwt,
  authorizeWithRole(["PUSH_NOTIFICATION_READ"]),
  pushNotificationController.getPushNotificationStats
);
router.get(
  "/admin/push-notifications/:id",
  authenticateJwt,
  authorizeWithRole(["PUSH_NOTIFICATION_READ"]),
  pushNotificationController.getPushNotification
);
router.post(
  "/admin/push-notifications",
  authenticateJwt,
  authorizeWithRole(["PUSH_NOTIFICATION_SEND"]),
  pushNotificationController.sendPushNotification
);
router.post(
  "/admin/push-notifications/bulk",
  authenticateJwt,
  authorizeWithRole(["PUSH_NOTIFICATION_SEND"]),
  pushNotificationController.bulkSendPushNotifications
);

// Device Management Routes
router.get(
  "/admin/devices",
  authenticateJwt,
  authorizeWithRole(["DEVICE_READ"]),
  deviceController.getDevices
);
router.get(
  "/admin/devices/stats",
  authenticateJwt,
  authorizeWithRole(["DEVICE_READ"]),
  deviceController.getDeviceStats
);
router.get(
  "/admin/devices/:id",
  authenticateJwt,
  authorizeWithRole(["DEVICE_READ"]),
  deviceController.getDevice
);
router.get(
  "/admin/users/:userId/devices",
  authenticateJwt,
  authorizeWithRole(["DEVICE_READ"]),
  deviceController.getUserDevices
);
router.post(
  "/admin/devices/:id/ban",
  authenticateJwt,
  authorizeWithRole(["DEVICE_BAN"]),
  deviceController.banDevice
);
router.post(
  "/admin/devices/:id/unban",
  authenticateJwt,
  authorizeWithRole(["DEVICE_BAN"]),
  deviceController.unbanDevice
);
router.delete(
  "/admin/devices/:id",
  authenticateJwt,
  authorizeWithRole(["DEVICE_READ"]),
  deviceController.deleteDevice
);

// App Versioning Routes
router.get(
  "/admin/app-versions",
  authenticateJwt,
  authorizeWithRole(["APP_VERSION_CREATE"]),
  appVersionController.getAppVersions
);
router.get(
  "/admin/app-versions/:id",
  authenticateJwt,
  authorizeWithRole(["APP_VERSION_CREATE"]),
  appVersionController.getAppVersion
);
router.post(
  "/admin/app-versions",
  authenticateJwt,
  authorizeWithRole(["APP_VERSION_CREATE"]),
  appVersionController.createAppVersion
);
router.put(
  "/admin/app-versions/:id",
  authenticateJwt,
  authorizeWithRole(["APP_VERSION_UPDATE"]),
  appVersionController.updateAppVersion
);
router.delete(
  "/admin/app-versions/:id",
  authenticateJwt,
  authorizeWithRole(["APP_VERSION_DELETE"]),
  appVersionController.deleteAppVersion
);

// Public app version endpoints for mobile apps
router.get("/app-versions/latest/:platform", appVersionController.getLatestVersion);
router.get("/app-versions/check-update", appVersionController.checkUpdate);

// Feature Flags Routes
router.get(
  "/admin/feature-flags",
  authenticateJwt,
  authorizeWithRole(["FEATURE_FLAG_CREATE"]),
  featureFlagController.getFeatureFlags
);
router.get(
  "/admin/feature-flags/:id",
  authenticateJwt,
  authorizeWithRole(["FEATURE_FLAG_CREATE"]),
  featureFlagController.getFeatureFlag
);
router.post(
  "/admin/feature-flags",
  authenticateJwt,
  authorizeWithRole(["FEATURE_FLAG_CREATE"]),
  featureFlagController.createFeatureFlag
);
router.put(
  "/admin/feature-flags/:id",
  authenticateJwt,
  authorizeWithRole(["FEATURE_FLAG_UPDATE"]),
  featureFlagController.updateFeatureFlag
);
router.post(
  "/admin/feature-flags/:id/toggle",
  authenticateJwt,
  authorizeWithRole(["FEATURE_FLAG_TOGGLE"]),
  featureFlagController.toggleFeatureFlag
);
router.delete(
  "/admin/feature-flags/:id",
  authenticateJwt,
  authorizeWithRole(["FEATURE_FLAG_DELETE"]),
  featureFlagController.deleteFeatureFlag
);

// Public feature flags endpoint for mobile apps
router.get("/feature-flags", authenticateJwt, featureFlagController.getClientFeatureFlags);

// Remote Config Routes
router.get(
  "/admin/remote-configs",
  authenticateJwt,
  authorizeWithRole(["REMOTE_CONFIG_UPDATE"]),
  remoteConfigController.getRemoteConfigs
);
router.get(
  "/admin/remote-configs/:id",
  authenticateJwt,
  authorizeWithRole(["REMOTE_CONFIG_READ"]),
  remoteConfigController.getRemoteConfig
);
router.post(
  "/admin/remote-configs",
  authenticateJwt,
  authorizeWithRole(["REMOTE_CONFIG_UPDATE"]),
  remoteConfigController.createRemoteConfig
);
router.put(
  "/admin/remote-configs/:id",
  authenticateJwt,
  authorizeWithRole(["REMOTE_CONFIG_UPDATE"]),
  remoteConfigController.updateRemoteConfig
);
router.delete(
  "/admin/remote-configs/:id",
  authenticateJwt,
  authorizeWithRole(["REMOTE_CONFIG_UPDATE"]),
  remoteConfigController.deleteRemoteConfig
);

// Public remote config endpoint for mobile apps
router.get("/remote-configs", authenticateJwt, remoteConfigController.getClientRemoteConfigs);

module.exports = router;
