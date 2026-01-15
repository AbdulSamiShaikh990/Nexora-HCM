"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { leaveStyles } from "./styles";

interface LeaveDay {
  date: string;
  status: "approved" | "pending" | "rejected" | null;
  type?: string;
}

interface LeaveCalendarProps {
  leaveDays: LeaveDay[];
  onDateSelect?: (date: string) => void;
}

export default function LeaveCalendar({ leaveDays, onDateSelect }: LeaveCalendarProps) {
  const [currentDate, setCurrentDate] = useState(new Date());

  const getDaysInMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth(), 1).getDay();
  };

  const daysInMonth = getDaysInMonth(currentDate);
  const firstDay = getFirstDayOfMonth(currentDate);
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);

  const monthName = currentDate.toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });

  const handlePrevMonth = () => {
    setCurrentDate(
      new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1)
    );
  };

  const handleNextMonth = () => {
    setCurrentDate(
      new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1)
    );
  };

  const getLeaveStatus = (day: number) => {
    const dateString = `${currentDate.getFullYear()}-${String(
      currentDate.getMonth() + 1
    ).padStart(2, "0")}-${String(day).padStart(2, "0")}`;

    return leaveDays.find((leave) => leave.date === dateString);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "approved":
        return "bg-green-100 border-green-300 text-green-700";
      case "pending":
        return "bg-yellow-100 border-yellow-300 text-yellow-700";
      case "rejected":
        return "bg-red-100 border-red-300 text-red-700";
      default:
        return "bg-gray-50 border-gray-200 text-gray-700";
    }
  };

  return (
    <div className={leaveStyles.card.base}>
      <h3 className={leaveStyles.section.title}>📅 Leave Calendar</h3>
      <p className={leaveStyles.section.subtitle}>
        Your monthly leave schedule
      </p>

      <div className="mt-6">
        {/* Month Navigation */}
        <div className="flex items-center justify-between mb-6 pb-4 border-b border-orange-100/30">
          <h4 className="text-lg sm:text-xl font-semibold text-gray-900">
            {monthName}
          </h4>
          <div className="flex gap-2">
            <button
              onClick={handlePrevMonth}
              className={leaveStyles.button.secondary}
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={handleNextMonth}
              className={leaveStyles.button.secondary}
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Weekday Headers */}
        <div className="grid grid-cols-7 gap-2 mb-4">
          {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
            <div
              key={day}
              className="text-center text-xs sm:text-sm font-semibold text-gray-700 py-2"
            >
              {day}
            </div>
          ))}
        </div>

        {/* Calendar Days */}
        <div className="grid grid-cols-7 gap-2 mb-6">
          {/* Empty cells for days before month starts */}
          {Array.from({ length: firstDay }).map((_, i) => (
            <div key={`empty-${i}`} className="aspect-square"></div>
          ))}

          {/* Days of month */}
          {days.map((day) => {
            const leaveStatus = getLeaveStatus(day);
            const statusColor = leaveStatus
              ? getStatusColor(leaveStatus.status || "")
              : "bg-gray-50 border-gray-200 text-gray-700 hover:bg-gray-100";

            return (
              <button
                key={day}
                onClick={() =>
                  onDateSelect?.(
                    `${currentDate.getFullYear()}-${String(
                      currentDate.getMonth() + 1
                    ).padStart(2, "0")}-${String(day).padStart(2, "0")}`
                  )
                }
                className={`
                  aspect-square flex items-center justify-center rounded-lg border-2 text-xs sm:text-sm font-semibold transition-all
                  ${statusColor}
                  ${leaveStatus ? "cursor-pointer hover:shadow-md" : "cursor-default"}
                `}
                title={leaveStatus?.type}
              >
                {day}
              </button>
            );
          })}
        </div>

        {/* Legend */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-4 border-t border-orange-100/30">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded bg-green-500"></div>
            <span className="text-xs text-gray-600">Approved</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded bg-yellow-500"></div>
            <span className="text-xs text-gray-600">Pending</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded bg-red-500"></div>
            <span className="text-xs text-gray-600">Rejected</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded bg-gray-300"></div>
            <span className="text-xs text-gray-600">No Leave</span>
          </div>
        </div>
      </div>
    </div>
  );
}
