-- CreateEnum
CREATE TYPE "OKRStatus" AS ENUM ('ON_TRACK', 'BEHIND', 'COMPLETED');

-- CreateTable
CREATE TABLE "PerformanceSnapshot" (
    "id" SERIAL NOT NULL,
    "employeeId" INTEGER NOT NULL,
    "periodYear" INTEGER NOT NULL,
    "periodMonth" INTEGER NOT NULL,
    "score" INTEGER NOT NULL,
    "readinessPct" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PerformanceSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SkillRating" (
    "id" SERIAL NOT NULL,
    "employeeId" INTEGER NOT NULL,
    "skill" TEXT NOT NULL,
    "score" INTEGER NOT NULL,
    "periodYear" INTEGER NOT NULL,
    "periodMonth" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SkillRating_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Feedback" (
    "id" SERIAL NOT NULL,
    "employeeId" INTEGER NOT NULL,
    "category" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "quarterYear" INTEGER NOT NULL,
    "quarter" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Feedback_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OKR" (
    "id" SERIAL NOT NULL,
    "employeeId" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "status" "OKRStatus" NOT NULL DEFAULT 'ON_TRACK',
    "progressPct" INTEGER NOT NULL DEFAULT 0,
    "dueDate" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OKR_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PerformanceAlert" (
    "id" SERIAL NOT NULL,
    "employeeId" INTEGER NOT NULL,
    "type" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "triggeredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PerformanceAlert_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PerformanceSnapshot_employeeId_periodYear_periodMonth_idx" ON "PerformanceSnapshot"("employeeId", "periodYear", "periodMonth");

-- CreateIndex
CREATE UNIQUE INDEX "PerformanceSnapshot_employeeId_periodYear_periodMonth_key" ON "PerformanceSnapshot"("employeeId", "periodYear", "periodMonth");

-- CreateIndex
CREATE INDEX "SkillRating_employeeId_periodYear_periodMonth_idx" ON "SkillRating"("employeeId", "periodYear", "periodMonth");

-- CreateIndex
CREATE UNIQUE INDEX "SkillRating_employeeId_skill_periodYear_periodMonth_key" ON "SkillRating"("employeeId", "skill", "periodYear", "periodMonth");

-- CreateIndex
CREATE INDEX "Feedback_employeeId_quarterYear_quarter_idx" ON "Feedback"("employeeId", "quarterYear", "quarter");

-- CreateIndex
CREATE INDEX "OKR_employeeId_status_idx" ON "OKR"("employeeId", "status");

-- CreateIndex
CREATE INDEX "OKR_dueDate_idx" ON "OKR"("dueDate");

-- CreateIndex
CREATE INDEX "PerformanceAlert_employeeId_triggeredAt_idx" ON "PerformanceAlert"("employeeId", "triggeredAt");

-- AddForeignKey
ALTER TABLE "PerformanceSnapshot" ADD CONSTRAINT "PerformanceSnapshot_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SkillRating" ADD CONSTRAINT "SkillRating_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Feedback" ADD CONSTRAINT "Feedback_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OKR" ADD CONSTRAINT "OKR_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PerformanceAlert" ADD CONSTRAINT "PerformanceAlert_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE CASCADE ON UPDATE CASCADE;
