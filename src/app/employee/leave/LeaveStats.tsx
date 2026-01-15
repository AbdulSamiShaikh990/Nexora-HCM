"use client";

import { Calendar, CheckCircle2, Clock, AlertCircle } from "lucide-react";
import { leaveStyles } from "./styles";

interface LeaveStatsProps {
  stats: {
    totalApplied: number;
    approved: number;
    pending: number;
    activeRequests: number;
  };
}

export default function LeaveStats({ stats }: LeaveStatsProps) {
  const statsData = [
    {
      icon: Calendar,
      label: "Total Applied",
      value: stats.totalApplied,
      color: "from-orange-400 to-orange-600",
      bgColor: "bg-orange-100/80",
      textColor: "text-orange-600",
      trend: "+12% from last month",
    },
    {
      icon: CheckCircle2,
      label: "Approved",
      value: stats.approved,
      color: "from-green-400 to-green-600",
      bgColor: "bg-green-100/80",
      textColor: "text-green-600",
      trend: "On track",
    },
    {
      icon: Clock,
      label: "Pending",
      value: stats.pending,
      color: "from-yellow-400 to-yellow-600",
      bgColor: "bg-yellow-100/80",
      textColor: "text-yellow-600",
      trend: "Awaiting approval",
    },
    {
      icon: AlertCircle,
      label: "Active Requests",
      value: stats.activeRequests,
      color: "from-purple-400 to-purple-600",
      bgColor: "bg-purple-100/80",
      textColor: "text-purple-600",
      trend: "In progress",
    },
  ];

  return (
    <div className={leaveStyles.grid.stats}>
      {statsData.map((stat) => {
        const Icon = stat.icon;
        return (
          <div key={stat.label} className={leaveStyles.statCard.base}>
            <div className={`${leaveStyles.statCard.iconContainer} ${stat.bgColor}`}>
              <Icon className={`w-6 sm:w-7 h-6 sm:h-7 ${stat.textColor}`} />
            </div>
            <div className="flex items-center gap-3">
              <div className={leaveStyles.statCard.value}>{stat.value}</div>
              <span className="text-xs text-orange-700 bg-orange-50/70 px-2 py-1 rounded-full font-semibold">This month</span>
            </div>
            <div className={leaveStyles.statCard.label}>{stat.label}</div>
            <p className="text-xs text-gray-500 mt-2 font-medium">{stat.trend}</p>
          </div>
        );
      })}
    </div>
  );
}
