/*
  Warnings:

  - A unique constraint covering the columns `[employeeId,date]` on the table `Attendance` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `updatedAt` to the `Attendance` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "public"."Attendance" DROP CONSTRAINT "Attendance_employeeId_fkey";

-- AlterTable
ALTER TABLE "Attendance" ADD COLUMN     "checkIn" TIMESTAMP(3),
ADD COLUMN     "checkOut" TIMESTAMP(3),
ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL;

-- CreateTable
CREATE TABLE "AttendanceCorrection" (
    "id" SERIAL NOT NULL,
    "employeeId" INTEGER NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "issue" TEXT NOT NULL,
    "requestedCheckIn" TIMESTAMP(3),
    "requestedCheckOut" TIMESTAMP(3),
    "note" TEXT,
    "state" TEXT NOT NULL DEFAULT 'pending',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AttendanceCorrection_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AttendanceCorrection_date_idx" ON "AttendanceCorrection"("date");

-- CreateIndex
CREATE INDEX "AttendanceCorrection_employeeId_idx" ON "AttendanceCorrection"("employeeId");

-- CreateIndex
CREATE INDEX "AttendanceCorrection_state_idx" ON "AttendanceCorrection"("state");

-- CreateIndex
CREATE INDEX "Attendance_date_idx" ON "Attendance"("date");

-- CreateIndex
CREATE INDEX "Attendance_employeeId_idx" ON "Attendance"("employeeId");

-- CreateIndex
CREATE UNIQUE INDEX "Attendance_employeeId_date_key" ON "Attendance"("employeeId", "date");

-- AddForeignKey
ALTER TABLE "Attendance" ADD CONSTRAINT "Attendance_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AttendanceCorrection" ADD CONSTRAINT "AttendanceCorrection_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE CASCADE ON UPDATE CASCADE;
