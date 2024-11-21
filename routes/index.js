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
const waitingListController = require("../controller/waitinglist");
const emailTemplateController = require("../controller/emailTemplate");

const { authorize, authorizeWithRole } = require("../middleware/authorize");
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
  userController.createUser
);
router.put(
  "/users/:id",
  authenticateJwt,
  authorizeWithRole(["USER_UPDATE"]),
  userController.updateUser
);
router.delete(
  "/users/:id",
  authenticateJwt,
  authorizeWithRole(["USER_DELETE"]),
  userController.deleteUser
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

router.post("/change-password", authenticateJwt, authController.changePassword);

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
router.get("/waiting-list", waitingListController.getWaitingList);

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

module.exports = router;
