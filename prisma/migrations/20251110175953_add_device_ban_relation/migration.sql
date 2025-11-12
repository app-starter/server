/*
  Warnings:

  - Changed the type of `deviceId` on the `DeviceBan` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- AlterTable
ALTER TABLE "DeviceBan" DROP COLUMN "deviceId",
ADD COLUMN     "deviceId" INTEGER NOT NULL;

-- AlterTable
ALTER TABLE "UserDevice" ADD COLUMN     "lastActiveAt" TIMESTAMP(3);

-- CreateIndex
CREATE UNIQUE INDEX "DeviceBan_deviceId_key" ON "DeviceBan"("deviceId");

-- CreateIndex
CREATE INDEX "DeviceBan_deviceId_idx" ON "DeviceBan"("deviceId");

-- AddForeignKey
ALTER TABLE "DeviceBan" ADD CONSTRAINT "DeviceBan_deviceId_fkey" FOREIGN KEY ("deviceId") REFERENCES "UserDevice"("id") ON DELETE CASCADE ON UPDATE CASCADE;
