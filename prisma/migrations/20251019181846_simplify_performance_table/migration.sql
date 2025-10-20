/*
  Warnings:

  - You are about to drop the `Feedback` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `OKR` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `PerformanceAlert` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `PerformanceSnapshot` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `SkillRating` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "public"."Feedback" DROP CONSTRAINT "Feedback_employeeId_fkey";

-- DropForeignKey
ALTER TABLE "public"."OKR" DROP CONSTRAINT "OKR_employeeId_fkey";

-- DropForeignKey
ALTER TABLE "public"."PerformanceAlert" DROP CONSTRAINT "PerformanceAlert_employeeId_fkey";

-- DropForeignKey
ALTER TABLE "public"."PerformanceSnapshot" DROP CONSTRAINT "PerformanceSnapshot_employeeId_fkey";

-- DropForeignKey
ALTER TABLE "public"."SkillRating" DROP CONSTRAINT "SkillRating_employeeId_fkey";

-- DropTable
DROP TABLE "public"."Feedback";

-- DropTable
DROP TABLE "public"."OKR";

-- DropTable
DROP TABLE "public"."PerformanceAlert";

-- DropTable
DROP TABLE "public"."PerformanceSnapshot";

-- DropTable
DROP TABLE "public"."SkillRating";

-- DropEnum
DROP TYPE "public"."OKRStatus";

-- CreateTable
CREATE TABLE "Performance" (
    "id" SERIAL NOT NULL,
    "employeeId" INTEGER NOT NULL,
    "periodYear" INTEGER NOT NULL,
    "periodMonth" INTEGER NOT NULL,
    "score" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Performance_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Performance_employeeId_periodYear_periodMonth_idx" ON "Performance"("employeeId", "periodYear", "periodMonth");

-- CreateIndex
CREATE UNIQUE INDEX "Performance_employeeId_periodYear_periodMonth_key" ON "Performance"("employeeId", "periodYear", "periodMonth");

-- AddForeignKey
ALTER TABLE "Performance" ADD CONSTRAINT "Performance_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE CASCADE ON UPDATE CASCADE;
