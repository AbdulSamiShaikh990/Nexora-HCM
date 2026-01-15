"use client";

import { useState, useRef, useEffect } from "react";
import { useSession, signOut } from "next-auth/react";
import { usePathname, useRouter } from "next/navigation";
import { useEmployeeNotifications } from "@/hooks/useEmployeeNotifications";

interface EmployeeHeaderProps {
  isCollapsed: boolean;
}

export default function EmployeeHeader({ isCollapsed }: EmployeeHeaderProps) {
  const { data: session } = useSession();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [currentTime, setCurrentTime] = useState("");
  const [currentDate, setCurrentDate] = useState("");
  const dropdownRef = useRef<HTMLDivElement>(null);
  const notifRef = useRef<HTMLDivElement>(null);
  const pathname = usePathname();
  const router = useRouter();
  const {
    notifications,
    unreadCount,
    markAsRead,
    markAllAsRead,
    loading: notificationsLoading,
  } = useEmployeeNotifications();
  const [isNotifOpen, setIsNotifOpen] = useState(false);

  const getCurrentPage = () => {
    const pathParts = pathname.split("/");
    const page = pathParts[pathParts.length - 1];
    return page.charAt(0).toUpperCase() + page.slice(1);
  };

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTime(
        now.toLocaleTimeString("en-US", {
          hour: "2-digit",
          minute: "2-digit",
          timeZone: "Asia/Karachi",
        })
      );
      setCurrentDate(
        now.toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
          year: "numeric",
          timeZone: "Asia/Karachi",
        })
      );
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
      if (notifRef.current && !notifRef.current.contains(event.target as Node)) {
        setIsNotifOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleLogout = async () => {
    await signOut({ callbackUrl: "/auth/signin" });
  };

  return (
    <header className={`fixed top-0 right-0 left-0 h-16 bg-white/80 backdrop-blur-xl border-b border-orange-200/50 shadow-sm z-30 transition-all duration-300 ${isCollapsed ? "lg:left-20" : "lg:left-64"}`}>
      <div className="h-full px-4 lg:px-6 flex items-center justify-between">
        <div className="flex items-center gap-2 ml-12 lg:ml-0">
          <h2 className="text-base lg:text-lg font-semibold text-gray-900">
            Employee
          </h2>
          <span className="text-gray-400">/</span>
          <span className="text-orange-600 font-medium text-sm lg:text-base">
            {getCurrentPage()}
          </span>
        </div>

        <div className="flex items-center gap-2 lg:gap-4">
          <div className="hidden md:flex items-center gap-2 px-3 lg:px-4 py-2 bg-gradient-to-r from-orange-50/80 to-orange-100/80 backdrop-blur-sm rounded-lg">
            <svg
              className="w-4 h-4 text-orange-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <div className="flex flex-col">
              <span className="text-xs text-gray-500">{currentDate}</span>
              <span className="text-sm font-medium text-gray-700">
                {currentTime}
              </span>
            </div>
          </div>

          <div className="relative" ref={notifRef}>
            <button
              onClick={() => setIsNotifOpen((open) => !open)}
              className="relative p-2 hover:bg-orange-100/80 rounded-lg transition-colors"
              aria-label="Notifications"
            >
              <svg
                className="w-5 h-5 lg:w-6 lg:h-6 text-gray-600"
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
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 flex h-5 min-w-[20px] items-center justify-center rounded-full bg-orange-500 px-1 text-[11px] font-bold text-white shadow-sm">
                  {unreadCount > 9 ? "9+" : unreadCount}
                </span>
              )}
            </button>

            {isNotifOpen && (
              <div className="absolute right-0 mt-2 w-80 rounded-xl bg-white/95 backdrop-blur-xl shadow-xl border border-orange-100/60 py-2 z-50">
                <div className="flex items-center justify-between px-3 pb-2 border-b border-orange-100/80">
                  <div>
                    <p className="text-sm font-semibold text-gray-900">Notifications</p>
                    <p className="text-xs text-gray-500">{unreadCount} new updates</p>
                  </div>
                  <button
                    onClick={markAllAsRead}
                    className="text-xs font-medium text-orange-600 hover:text-orange-700"
                    disabled={unreadCount === 0}
                  >
                    Mark all
                  </button>
                </div>

                <div className="max-h-80 overflow-y-auto divide-y divide-orange-50">
                  {notificationsLoading ? (
                    <div className="p-3 text-sm text-gray-500">Loading updates...</div>
                  ) : notifications.length === 0 ? (
                    <div className="p-3 text-sm text-gray-500">No notifications yet</div>
                  ) : (
                    notifications.slice(0, 6).map((item) => {
                      const pillStyles =
                        item.state === "approved"
                          ? "bg-green-100 text-green-700"
                          : item.state === "rejected"
                          ? "bg-red-100 text-red-700"
                          : "bg-yellow-100 text-yellow-700";

                      return (
                        <button
                          key={`${item.id}-${item.state}`}
                          onClick={() => {
                            markAsRead(item);
                          }}
                          className="flex w-full items-start gap-3 px-3 py-3 text-left hover:bg-orange-50/60"
                        >
                          <span
                            className={`mt-1 h-2.5 w-2.5 rounded-full ${
                              item.state === "approved"
                                ? "bg-green-500"
                                : item.state === "rejected"
                                ? "bg-red-500"
                                : "bg-yellow-500"
                            }`}
                          />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-2">
                              <p className="text-sm font-semibold text-gray-900 line-clamp-1">
                                {item.title}
                              </p>
                              <span className={`whitespace-nowrap rounded-full px-2 py-0.5 text-[11px] font-semibold ${pillStyles}`}>
                                {item.state === "pending"
                                  ? "Pending"
                                  : item.state === "approved"
                                  ? "Approved"
                                  : "Rejected"}
                              </span>
                            </div>
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
                        </button>
                      );
                    })
                  )}
                </div>
              </div>
            )}
          </div>

          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              className="flex items-center gap-2 lg:gap-3 px-2 lg:px-3 py-2 bg-gradient-to-r from-orange-500/10 to-orange-600/10 hover:from-orange-500/20 hover:to-orange-600/20 backdrop-blur-sm rounded-lg transition-all duration-200 border border-orange-200/50"
            >
              <div className="w-8 h-8 bg-gradient-to-br from-orange-500 to-orange-600 rounded-lg flex items-center justify-center shadow-md">
                <span className="text-white font-semibold text-sm">
                  {session?.user?.name?.charAt(0).toUpperCase() || "U"}
                </span>
              </div>
              <div className="hidden xl:block text-left">
                <p className="text-sm font-semibold text-gray-900">
                  {session?.user?.name || "Employee User"}
                </p>
                <p className="text-xs text-orange-600">Employee</p>
              </div>
              <svg
                className={`w-4 h-4 text-gray-600 transition-transform duration-200 ${
                  isDropdownOpen ? "rotate-180" : ""
                }`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 9l-7 7-7-7"
                />
              </svg>
            </button>

            {isDropdownOpen && (
              <div className="absolute right-0 mt-2 w-56 bg-white/95 backdrop-blur-xl rounded-xl shadow-xl border border-orange-200/50 py-2 z-50">
                <div className="px-4 py-3 border-b border-gray-200">
                  <p className="text-sm font-semibold text-gray-900">
                    {session?.user?.name || "Employee User"}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    {session?.user?.email || "employee@nexora.com"}
                  </p>
                </div>

                <div className="py-2">
                  <button
                    onClick={() => {
                      setIsDropdownOpen(false);
                      router.push("/employee/settings");
                    }}
                    className="w-full flex items-center gap-3 px-4 py-2 hover:bg-orange-50 transition-colors text-left"
                  >
                    <svg
                      className="w-5 h-5 text-gray-600"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
                      />
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                      />
                    </svg>
                    <span className="text-sm text-gray-700">Settings</span>
                  </button>
                </div>

                <div className="border-t border-gray-200 pt-2">
                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center gap-3 px-4 py-2 hover:bg-red-50 transition-colors text-left"
                  >
                    <svg
                      className="w-5 h-5 text-red-600"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                      />
                    </svg>
                    <span className="text-sm text-red-600 font-medium">
                      Logout
                    </span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
