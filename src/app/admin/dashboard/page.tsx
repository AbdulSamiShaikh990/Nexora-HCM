"use client";
import { useEffect, useState } from "react";
import Link from "next/link";

type Notification = {
  id: string;
  type: "remote_work" | "attendance_correction" | "leave";
  employeeName: string;
  state: "pending" | "approved" | "rejected";
  createdAt: string;
  title: string;
  message: string;
};

export default function Page() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [pendingCount, setPendingCount] = useState(0);

  useEffect(() => {
    fetchNotifications();
  }, []);

  const fetchNotifications = async () => {
    try {
      const res = await fetch("/api/notifications/admin");
      if (res.ok) {
        const data = await res.json();
        const pending = (data.notifications || []).filter(
          (r: Notification) => r.state === "pending"
        );
        setNotifications(pending.slice(0, 5));
        setPendingCount(data.pendingCount || pending.length || 0);
      }
    } catch (error) {
      console.error("Error fetching notifications:", error);
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case "remote_work":
        return { label: "Remote Work", icon: "🏠" };
      case "attendance_correction":
        return { label: "Attendance Fix", icon: "📝" };
      case "leave":
        return { label: "Leave", icon: "🌿" };
      default:
        return { label: "Request", icon: "📋" };
    }
  };

  return (
    <div className="w-full space-y-6">
      <div>
        <h1 className="text-xl sm:text-2xl lg:text-3xl font-semibold text-gray-900 truncate">
          Dashboard
        </h1>
        <p className="mt-1 sm:mt-2 text-xs sm:text-sm text-gray-600">
          Welcome to Nexora HCM admin dashboard.
        </p>
      </div>

      {/* Pending Notifications Widget */}
      {pendingCount > 0 && (
        <div className="bg-gradient-to-r from-yellow-50 to-orange-50 border border-yellow-200 rounded-xl p-5">
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="bg-yellow-500 rounded-full p-2">
                <svg
                  className="w-6 h-6 text-white"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
                  />
                </svg>
              </div>
              <div>
                <h2 className="text-lg font-semibold text-gray-900">
                  Pending Requests
                </h2>
                <p className="text-sm text-gray-600">
                  {pendingCount} request{pendingCount !== 1 ? "s" : ""} waiting for your approval
                </p>
              </div>
            </div>
            <Link
              href="/admin/notifications"
              className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
            >
              View All
            </Link>
          </div>

          {/* Recent Notifications */}
          <div className="space-y-2">
            {notifications.map((notif) => {
              const typeInfo = getTypeLabel(notif.type);
              return (
                <div
                  key={notif.id}
                  className="bg-white rounded-lg p-3 flex items-center gap-3 hover:shadow-sm transition-shadow"
                >
                  <span className="text-xl">{typeInfo.icon}</span>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900 line-clamp-1">
                      {notif.title || notif.employeeName}
                    </p>
                    <p className="text-xs text-gray-600 line-clamp-2">{notif.message || typeInfo.label}</p>
                  </div>
                  <span className="text-xs text-gray-500">
                    {new Date(notif.createdAt).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                    })}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* No Pending Notifications */}
      {pendingCount === 0 && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-5 text-center">
          <div className="flex justify-center mb-2">
            <div className="bg-green-100 rounded-full p-3">
              <svg
                className="w-8 h-8 text-green-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-1">
            All Caught Up!
          </h3>
          <p className="text-sm text-gray-600">
            No pending requests at the moment. Great job!
          </p>
        </div>
      )}
    </div>
  );
}


