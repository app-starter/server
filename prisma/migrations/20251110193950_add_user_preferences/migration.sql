-- AlterTable
ALTER TABLE "User" ADD COLUMN     "notificationEmailEnabled" BOOLEAN DEFAULT true,
ADD COLUMN     "notificationMarketing" BOOLEAN DEFAULT true,
ADD COLUMN     "notificationPushEnabled" BOOLEAN DEFAULT true,
ADD COLUMN     "notificationReminders" BOOLEAN DEFAULT true,
ADD COLUMN     "notificationSmsEnabled" BOOLEAN DEFAULT false,
ADD COLUMN     "notificationUpdates" BOOLEAN DEFAULT true,
ADD COLUMN     "themeMode" TEXT DEFAULT 'system';
