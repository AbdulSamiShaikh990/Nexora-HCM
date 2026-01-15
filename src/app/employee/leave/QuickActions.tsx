"use client";

import { Plus, Calendar, FileText, AlertTriangle } from "lucide-react";
import { leaveStyles } from "./styles";

interface QuickActionsProps {
  onRequestLeave: () => void;
  onViewCalendar: () => void;
  onCheckPolicy: () => void;
  onEmergency: () => void;
}

export default function QuickActions({
  onRequestLeave,
  onViewCalendar,
  onCheckPolicy,
  onEmergency,
}: QuickActionsProps) {
  const actions = [
    {
      icon: Plus,
      label: "Request New Leave",
      description: "Submit a new leave request",
      onClick: onRequestLeave,
      color: "text-orange-600",
      bgColor: "bg-orange-50",
    },
    {
      icon: Calendar,
      label: "View Leave Calendar",
      description: "See your leave schedule",
      onClick: onViewCalendar,
      color: "text-green-600",
      bgColor: "bg-green-50",
    },
    {
      icon: FileText,
      label: "Check Leave Policy",
      description: "Review company policies",
      onClick: onCheckPolicy,
      color: "text-orange-600",
      bgColor: "bg-orange-50",
    },
    {
      icon: AlertTriangle,
      label: "Emergency Leave Request",
      description: "Request urgent leave",
      onClick: onEmergency,
      color: "text-red-600",
      bgColor: "bg-red-50",
    },
  ];

  return (
    <div className={leaveStyles.card.base}>
      <h3 className={leaveStyles.section.title}>⚡ Quick Actions</h3>
      <p className={leaveStyles.section.subtitle}>Common leave-related actions</p>

      <div className="space-y-2 sm:space-y-3">
        {actions.map((action) => {
          const Icon = action.icon;
          return (
            <button
              key={action.label}
              onClick={action.onClick}
              className={`w-full ${leaveStyles.card.hover} ${leaveStyles.card.compact} text-left group`}
            >
              <div className="flex items-start gap-3 sm:gap-4">
                <div className={`${action.bgColor} p-2.5 sm:p-3 rounded-lg flex-shrink-0 group-hover:scale-110 transition-transform duration-300`}>
                  <Icon className={`w-5 sm:w-6 h-5 sm:h-6 ${action.color}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="text-sm sm:text-base font-semibold text-gray-900 group-hover:text-orange-600 transition-colors">
                    {action.label}
                  </h4>
                  <p className="text-xs sm:text-sm text-gray-600 mt-0.5">{action.description}</p>
                </div>
                <div className="flex-shrink-0 text-gray-400 group-hover:text-orange-600 transition-colors">
                  <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
