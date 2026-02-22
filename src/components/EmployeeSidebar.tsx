"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import Image from "next/image";

interface EmployeeSidebarProps {
  isCollapsed: boolean;
  setIsCollapsed: (value: boolean) => void;
}

export default function EmployeeSidebar({ isCollapsed, setIsCollapsed }: EmployeeSidebarProps) {
  const pathname = usePathname();
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [sentimentEnabled, setSentimentEnabled] = useState(false);

  useEffect(() => {
    const fetchSentimentConfig = async () => {
      try {
        const res = await fetch("/api/sentiment/employee");
        if (!res.ok) return;
        const data = await res.json();
        setSentimentEnabled(Boolean(data?.enabled));
      } catch {
        setSentimentEnabled(false);
      }
    };

    fetchSentimentConfig();
  }, []);

  const menuItems = [
    {
      name: "Dashboard",
      path: "/employee/dashboard",
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-3m0 0l7-4 7 4M5 9v10a1 1 0 001 1h12a1 1 0 001-1V9m-9 11l4-4" />
        </svg>
      ),
    },
    {
      name: "Attendance",
      path: "/employee/attendance",
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
    },
    {
      name: "Tasks",
      path: "/employee/task",
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
        </svg>
      ),
    },
    {
      name: "Leaves",
      path: "/employee/leave",
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      ),
    },
    {
      name: "Performance",
      path: "/employee/performance",
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6M3 19h18a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v14a2 2 0 002 2z" />
        </svg>
      ),
    },
    {
      name: "Reports",
      path: "/employee/reports",
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      ),
    },
    ...(sentimentEnabled
      ? [
          {
            name: "Sentiment",
            path: "/employee/sentiment",
            icon: (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 9h.01M15 9h.01M9.5 14a3.5 3.5 0 005 0M12 3a9 9 0 100 18 9 9 0 000-18z" />
              </svg>
            ),
          },
        ]
      : []),
    {
      name: "AI Assistant",
      path: "/employee/ai-assistant",
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
        </svg>
      ),
    },
    {
      name: "Settings",
      path: "/employee/settings",
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      ),
    },
  ];

  const filteredMenuItems = menuItems.filter((item) =>
    item.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <>
      {/* Mobile Menu Button */}
      <button
        onClick={() => setIsMobileOpen(!isMobileOpen)}
        className="lg:hidden fixed top-4 left-4 z-50 p-2 bg-gradient-to-r from-orange-500 to-orange-600 text-white rounded-lg shadow-lg"
      >
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          {isMobileOpen ? (
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          ) : (
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          )}
        </svg>
      </button>

      {/* Mobile Overlay */}
      {isMobileOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/50 backdrop-blur-sm z-40"
          onClick={() => setIsMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed left-0 top-0 h-screen bg-gradient-to-b from-orange-50/90 to-white/90 backdrop-blur-xl border-r border-orange-200/50 shadow-xl transition-all duration-300 z-40 flex flex-col ${
          isCollapsed ? "w-20" : "w-64"
        } ${isMobileOpen ? "translate-x-0" : "-translate-x-full"} lg:translate-x-0`}
      >
        {/* Logo Section */}
        <div className="flex items-center justify-between p-4 border-b border-orange-200/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl overflow-hidden shadow-lg">
              <Image
                src="/logo.png"
                alt="Nexora"
                width={40}
                height={40}
                className="w-full h-full object-cover"
              />
            </div>
            {!isCollapsed && (
              <div>
                <h1 className="font-bold text-gray-900 text-lg">NEXORA</h1>
                <p className="text-xs text-orange-600">Employee Portal</p>
              </div>
            )}
          </div>
          {!isCollapsed && (
            <button
              onClick={() => setIsCollapsed(true)}
              className="hidden lg:block p-1.5 hover:bg-orange-100 rounded-lg transition-colors"
            >
              <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
              </svg>
            </button>
          )}
        </div>

        {/* Expand Button (when collapsed) */}
        {isCollapsed && (
          <div className="hidden lg:flex justify-center p-4 border-b border-orange-200/50">
            <button
              onClick={() => setIsCollapsed(false)}
              className="p-1.5 hover:bg-orange-100 rounded-lg transition-colors"
            >
              <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 5l7 7-7 7M5 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        )}

        {/* Search Bar */}
        {!isCollapsed && (
          <div className="p-4">
            <div className="relative">
              <input
                type="search"
                placeholder="Search..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                autoComplete="new-password"
                name="sidebar-menu-search"
                id="sidebar-menu-search"
                data-lpignore="true"
                data-form-type="other"
                className="w-full pl-10 pr-4 py-2 bg-white/80 backdrop-blur-sm border border-orange-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-transparent text-sm transition-all text-gray-900 placeholder-gray-500"
              />
              <svg
                className="w-5 h-5 text-orange-600 absolute left-3 top-2.5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
          </div>
        )}

        {/* Navigation Menu */}
        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
          {filteredMenuItems.map((item) => {
            const isActive = pathname === item.path;
            return (
              <Link
                key={item.path}
                href={item.path}
                onClick={() => setIsMobileOpen(false)}
                className={`flex items-center gap-3 px-3 py-3 rounded-xl transition-all duration-200 ${
                  isActive
                    ? "bg-gradient-to-r from-orange-500 to-orange-600 text-white shadow-lg shadow-orange-500/50"
                    : "text-gray-700 hover:bg-orange-100/80"
                }`}
              >
                <span className={isActive ? "text-white" : "text-orange-600"}>
                  {item.icon}
                </span>
                {!isCollapsed && (
                  <span className="font-medium text-sm">{item.name}</span>
                )}
              </Link>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="p-4 border-t border-orange-200/50">
          {!isCollapsed && (
            <div className="bg-gradient-to-br from-orange-100/80 to-orange-50/80 backdrop-blur-sm rounded-xl p-3">
              <p className="text-xs text-gray-600 mb-1">Version 1.0.0</p>
              <p className="text-xs text-orange-600 font-medium">© 2026 Nexora HCM</p>
            </div>
          )}
        </div>
      </aside>
    </>
  );
}
