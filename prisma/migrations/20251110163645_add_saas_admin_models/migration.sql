-- CreateEnum
CREATE TYPE "UserStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'SUSPENDED', 'BANNED');

-- AlterTable
ALTER TABLE "Subscription" ADD COLUMN     "cancelReason" TEXT,
ADD COLUMN     "canceledAt" TIMESTAMP(3),
ADD COLUMN     "nextBillingDate" TIMESTAMP(3),
ADD COLUMN     "previousPlanId" INTEGER,
ADD COLUMN     "purchasePlatform" TEXT DEFAULT 'web';

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "lastLoginAt" TIMESTAMP(3),
ADD COLUMN     "lastLoginIp" TEXT,
ADD COLUMN     "lastLoginPlatform" TEXT,
ADD COLUMN     "preferredLanguage" TEXT DEFAULT 'en',
ADD COLUMN     "status" "UserStatus" NOT NULL DEFAULT 'ACTIVE',
ADD COLUMN     "timezone" TEXT;

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER,
    "action" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" INTEGER,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "platform" TEXT DEFAULT 'web',
    "metadata" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmailLog" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER,
    "templateName" TEXT NOT NULL,
    "to" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "errorMessage" TEXT,
    "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EmailLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Transaction" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "subscriptionId" INTEGER,
    "amount" DOUBLE PRECISION NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'usd',
    "status" TEXT NOT NULL,
    "stripePaymentId" TEXT,
    "stripeRefundId" TEXT,
    "platform" TEXT DEFAULT 'web',
    "metadata" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Transaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "targetPlatform" TEXT NOT NULL DEFAULT 'all',
    "metadata" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserDevice" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "deviceId" TEXT NOT NULL,
    "deviceName" TEXT,
    "platform" TEXT NOT NULL,
    "deviceModel" TEXT,
    "osVersion" TEXT,
    "appVersion" TEXT,
    "fcmToken" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastUsedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserDevice_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PushNotification" (
    "id" SERIAL NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "data" TEXT,
    "targetType" TEXT NOT NULL,
    "targetIds" TEXT,
    "sentTo" INTEGER NOT NULL DEFAULT 0,
    "deliveredTo" INTEGER NOT NULL DEFAULT 0,
    "openedBy" INTEGER NOT NULL DEFAULT 0,
    "scheduledAt" TIMESTAMP(3),
    "sentAt" TIMESTAMP(3),
    "status" TEXT NOT NULL,
    "platform" TEXT,
    "createdBy" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PushNotification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AppVersion" (
    "id" SERIAL NOT NULL,
    "version" TEXT NOT NULL,
    "buildNumber" TEXT NOT NULL,
    "platform" TEXT NOT NULL,
    "minSupportedVersion" TEXT,
    "isForceUpdate" BOOLEAN NOT NULL DEFAULT false,
    "releaseNotes" TEXT,
    "releaseDate" TIMESTAMP(3) NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AppVersion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FeatureFlag" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "description" TEXT,
    "isEnabled" BOOLEAN NOT NULL DEFAULT false,
    "targetPlatform" TEXT NOT NULL DEFAULT 'all',
    "rolloutPercentage" INTEGER NOT NULL DEFAULT 100,
    "enabledForUserIds" TEXT,
    "metadata" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FeatureFlag_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RemoteConfig" (
    "id" SERIAL NOT NULL,
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "valueType" TEXT NOT NULL DEFAULT 'string',
    "platform" TEXT NOT NULL DEFAULT 'all',
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RemoteConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AppAnnouncement" (
    "id" SERIAL NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "targetPlatform" TEXT NOT NULL DEFAULT 'all',
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3),
    "priority" TEXT NOT NULL DEFAULT 'normal',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "targetUserSegment" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AppAnnouncement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DeviceBan" (
    "id" SERIAL NOT NULL,
    "deviceId" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "bannedBy" INTEGER NOT NULL,
    "bannedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3),

    CONSTRAINT "DeviceBan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MobileAnalytics" (
    "id" SERIAL NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "platform" TEXT NOT NULL,
    "dau" INTEGER NOT NULL DEFAULT 0,
    "mau" INTEGER NOT NULL DEFAULT 0,
    "sessionCount" INTEGER NOT NULL DEFAULT 0,
    "avgSessionDuration" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "crashCount" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MobileAnalytics_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AuditLog_userId_idx" ON "AuditLog"("userId");

-- CreateIndex
CREATE INDEX "AuditLog_action_idx" ON "AuditLog"("action");

-- CreateIndex
CREATE INDEX "AuditLog_entityType_idx" ON "AuditLog"("entityType");

-- CreateIndex
CREATE INDEX "AuditLog_createdAt_idx" ON "AuditLog"("createdAt");

-- CreateIndex
CREATE INDEX "EmailLog_userId_idx" ON "EmailLog"("userId");

-- CreateIndex
CREATE INDEX "EmailLog_status_idx" ON "EmailLog"("status");

-- CreateIndex
CREATE INDEX "EmailLog_sentAt_idx" ON "EmailLog"("sentAt");

-- CreateIndex
CREATE INDEX "Transaction_userId_idx" ON "Transaction"("userId");

-- CreateIndex
CREATE INDEX "Transaction_subscriptionId_idx" ON "Transaction"("subscriptionId");

-- CreateIndex
CREATE INDEX "Transaction_status_idx" ON "Transaction"("status");

-- CreateIndex
CREATE INDEX "Transaction_createdAt_idx" ON "Transaction"("createdAt");

-- CreateIndex
CREATE INDEX "Notification_userId_idx" ON "Notification"("userId");

-- CreateIndex
CREATE INDEX "Notification_isRead_idx" ON "Notification"("isRead");

-- CreateIndex
CREATE INDEX "Notification_createdAt_idx" ON "Notification"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "UserDevice_deviceId_key" ON "UserDevice"("deviceId");

-- CreateIndex
CREATE INDEX "UserDevice_userId_idx" ON "UserDevice"("userId");

-- CreateIndex
CREATE INDEX "UserDevice_deviceId_idx" ON "UserDevice"("deviceId");

-- CreateIndex
CREATE INDEX "UserDevice_isActive_idx" ON "UserDevice"("isActive");

-- CreateIndex
CREATE INDEX "PushNotification_status_idx" ON "PushNotification"("status");

-- CreateIndex
CREATE INDEX "PushNotification_createdAt_idx" ON "PushNotification"("createdAt");

-- CreateIndex
CREATE INDEX "AppVersion_platform_idx" ON "AppVersion"("platform");

-- CreateIndex
CREATE INDEX "AppVersion_isActive_idx" ON "AppVersion"("isActive");

-- CreateIndex
CREATE UNIQUE INDEX "FeatureFlag_key_key" ON "FeatureFlag"("key");

-- CreateIndex
CREATE INDEX "FeatureFlag_key_idx" ON "FeatureFlag"("key");

-- CreateIndex
CREATE INDEX "FeatureFlag_isEnabled_idx" ON "FeatureFlag"("isEnabled");

-- CreateIndex
CREATE UNIQUE INDEX "RemoteConfig_key_key" ON "RemoteConfig"("key");

-- CreateIndex
CREATE INDEX "RemoteConfig_key_idx" ON "RemoteConfig"("key");

-- CreateIndex
CREATE INDEX "RemoteConfig_platform_idx" ON "RemoteConfig"("platform");

-- CreateIndex
CREATE INDEX "AppAnnouncement_isActive_idx" ON "AppAnnouncement"("isActive");

-- CreateIndex
CREATE INDEX "AppAnnouncement_startDate_idx" ON "AppAnnouncement"("startDate");

-- CreateIndex
CREATE INDEX "AppAnnouncement_endDate_idx" ON "AppAnnouncement"("endDate");

-- CreateIndex
CREATE UNIQUE INDEX "DeviceBan_deviceId_key" ON "DeviceBan"("deviceId");

-- CreateIndex
CREATE INDEX "DeviceBan_deviceId_idx" ON "DeviceBan"("deviceId");

-- CreateIndex
CREATE INDEX "DeviceBan_expiresAt_idx" ON "DeviceBan"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "MobileAnalytics_date_key" ON "MobileAnalytics"("date");

-- CreateIndex
CREATE INDEX "MobileAnalytics_date_idx" ON "MobileAnalytics"("date");

-- CreateIndex
CREATE INDEX "MobileAnalytics_platform_idx" ON "MobileAnalytics"("platform");

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmailLog" ADD CONSTRAINT "EmailLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_subscriptionId_fkey" FOREIGN KEY ("subscriptionId") REFERENCES "Subscription"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserDevice" ADD CONSTRAINT "UserDevice_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
