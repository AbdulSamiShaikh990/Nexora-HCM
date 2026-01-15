"use client";

import { useMemo } from "react";
import { useEmployeeNotifications } from "@/hooks/useEmployeeNotifications";

export default function DashboardPage() {
  const { notifications, unreadCount, markAsRead, loading } = useEmployeeNotifications(60000);

  const latest = useMemo(() => notifications.slice(0, 4), [notifications]);

  return (
    <div className="w-full space-y-6">
      <div>
        <h1 className="text-xl sm:text-2xl lg:text-3xl font-semibold text-gray-900 truncate">
          Dashboard
        </h1>
        <p className="mt-1 sm:mt-2 text-xs sm:text-sm text-gray-600">
          Employee Dashboard
        </p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 lg:gap-6">
        <div className="xl:col-span-2 bg-white rounded-2xl border border-orange-100 shadow-sm p-4 lg:p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-sm font-semibold text-gray-900">Latest updates</p>
              <p className="text-xs text-gray-500">Leave and attendance decisions</p>
            </div>
            <span className="inline-flex items-center gap-2 rounded-full bg-orange-50 text-orange-700 px-3 py-1 text-xs font-semibold">
              {unreadCount} new
            </span>
          </div>

          <div className="space-y-3">
            {loading ? (
              <div className="h-24 flex items-center justify-center text-sm text-gray-500">
                Loading notifications...
              </div>
            ) : latest.length === 0 ? (
              <div className="h-24 flex items-center justify-center text-sm text-gray-500">
                No notifications yet
              </div>
            ) : (
              latest.map((item) => {
                const pillStyles =
                  item.state === "approved"
                    ? "bg-green-100 text-green-700"
                    : item.state === "rejected"
                    ? "bg-red-100 text-red-700"
                    : "bg-yellow-100 text-yellow-700";

                return (
                  <button
                    key={`${item.id}-${item.state}`}
                    onClick={() => markAsRead(item)}
                    className="w-full text-left rounded-xl border border-orange-100/80 bg-orange-50/30 hover:bg-orange-50 transition-colors p-4"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-gray-900 line-clamp-1">{item.title}</p>
                        <p className="mt-1 text-xs text-gray-600 line-clamp-2">{item.message}</p>
                        <p className="mt-1 text-[11px] text-gray-400">
                          {new Date(item.createdAt).toLocaleString("en-US", {
                            month: "short",
                            day: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </p>
                      </div>
                      <span className={`whitespace-nowrap rounded-full px-3 py-1 text-[11px] font-semibold ${pillStyles}`}>
                        {item.state === "pending"
                          ? "Pending"
                          : item.state === "approved"
                          ? "Approved"
                          : "Rejected"}
                      </span>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        <div className="bg-gradient-to-br from-orange-500 to-orange-600 text-white rounded-2xl p-5 shadow-lg flex flex-col gap-3">
          <p className="text-sm uppercase tracking-wide opacity-80">Snapshot</p>
          <h3 className="text-2xl font-semibold">Stay on top of requests</h3>
          <p className="text-sm text-orange-50">
            Any approval or rejection for leave, remote work, or attendance correction shows up here and in the header bell.
          </p>
          <div className="mt-auto flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-white/15 text-lg font-bold">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
            <div className="text-sm text-orange-50">
              <p className="font-semibold text-white">Unread alerts</p>
              <p className="opacity-80">Open the bell to mark them as read</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}