"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo, useState, useEffect, useRef } from "react";
import { usePathname, useRouter } from "next/navigation";
import { signOut, useSession } from "next-auth/react";

function toTitle(s: string) {
  return s
    .replace(/[-_]+/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

export default function AdminHeader() {
  const { data: session } = useSession();
  const pathname = usePathname();
  const router = useRouter();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);
  const [currentTime, setCurrentTime] = useState("");
  const [currentDate, setCurrentDate] = useState("");
  const dropdownRef = useRef<HTMLDivElement>(null);

  const crumbs = useMemo(() => {
    const parts = (pathname || "/").split("/").filter(Boolean);
    // e.g. ["admin","employees"] -> ["Admin","Employees"]
    return parts.map(toTitle);
  }, [pathname]);

  const breadcrumb = crumbs.slice(1).join(" / ") || "Dashboard"; // ignore leading "Admin"

  // Fetch pending notifications count (attendance + leaves)
  useEffect(() => {
    const fetchPendingCount = async () => {
      try {
        const res = await fetch("/api/notifications/admin");
        if (res.ok) {
          const data = await res.json();
          const pending = data?.pendingCount ?? 0;
          setPendingCount(pending);
        }
      } catch (error) {
        console.error("Error fetching notification count:", error);
      }
    };

    fetchPendingCount();
    // Refresh every 30 seconds
    const interval = setInterval(fetchPendingCount, 30000);
    return () => clearInterval(interval);
  }, []);

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

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };

    if (isDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isDropdownOpen]);

  const handleSignOut = async () => {
    setIsDropdownOpen(false);
    try {
      await signOut({ 
        redirect: false,
        callbackUrl: "/auth/signin" 
      });
      router.push("/auth/signin");
    } catch (error) {
      console.error("Sign out error:", error);
      // Fallback: redirect anyway
      router.push("/auth/signin");
    }
  };

  return (
    <header className="sticky top-0 z-20 mb-4">
      <div className="relative overflow-visible bg-white/70 backdrop-blur-2xl border-b border-violet-200/60 shadow-[0_8px_24px_rgba(31,38,135,0.10)]">
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-violet-500/10 via-transparent to-blue-500/10" />
        <div className="mx-auto max-w-7xl px-3 sm:px-4 md:px-6 h-16 flex items-center gap-3 relative">
          {/* Left: logo chip (hidden on very small screens to save space) */}
          <div className="hidden xs:flex items-center gap-2 rounded-full bg-white/70 px-2 py-1 border border-white/70 shadow-sm">
            <Image src="/logo.png" alt="Nexora HCM" width={22} height={22} className="rounded" />
            <span className="hidden sm:inline text-sm font-semibold text-slate-800">Nexora</span>
          </div>

          {/* Center: breadcrumb/title */}
          <div className="flex-1 truncate text-center xs:text-left">
            <div className="flex items-center justify-center xs:justify-start gap-2 truncate text-sm md:text-base">
              <span className="font-semibold text-slate-900">Admin</span>
              <span className="text-slate-400">/</span>
              <span className="font-medium text-violet-600 truncate">
                {breadcrumb || "Dashboard"}
              </span>
            </div>
          </div>

          {/* Right: Notification Bell + User Dropdown */}
          <div className="flex items-center gap-2">
            <div className="hidden md:flex h-10 items-center gap-2 px-3 md:px-4 bg-white/70 backdrop-blur-md rounded-xl border border-white/70 shadow-sm">
              <svg
                className="w-4 h-4 text-violet-600"
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
                <span className="text-xs text-slate-500">{currentDate}</span>
                <span className="text-sm font-semibold text-slate-700">
                  {currentTime}
                </span>
              </div>
            </div>
            {/* Notification Bell */}
            <Link href="/admin/notifications" className="relative">
              <button className="inline-flex items-center justify-center h-10 w-10 rounded-full bg-white/70 backdrop-blur ring-1 ring-white/70 shadow-sm hover:bg-white hover:ring-violet-300/80 transition-colors">
                <svg
                  className="h-5 w-5 text-slate-700"
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
                {pendingCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-gradient-to-br from-violet-600 to-blue-600 text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center ring-2 ring-white/60 shadow-sm">
                    {pendingCount > 9 ? "9+" : pendingCount}
                  </span>
                )}
              </button>
            </Link>

            {/* User Dropdown */}
            <div className="relative" ref={dropdownRef}>
            <button
              type="button"
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              className="inline-flex h-10 items-center gap-2 rounded-full bg-white/70 px-2.5 text-xs md:text-sm backdrop-blur ring-1 ring-white/70 shadow-sm hover:bg-white hover:ring-violet-300/70 transition-colors"
            >
              <span className="inline-flex h-6 w-6 items-center justify-center overflow-hidden rounded-full bg-violet-600 shadow-sm">
                <svg viewBox="0 0 24 24" className="h-4 w-4 text-white" fill="currentColor">
                  <circle cx="12" cy="8" r="4" />
                  <path d="M4 20a8 8 0 0 1 16 0" />
                </svg>
              </span>
              <span className="hidden sm:block text-slate-900 font-medium">
                {session?.user?.name || "Admin User"}
              </span>
              <svg 
                viewBox="0 0 24 24" 
                className={`h-4 w-4 text-slate-500 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} 
                fill="currentColor"
              >
                <path d="M7 10l5 5 5-5" />
              </svg>
            </button>

            {/* Dropdown menu */}
            {isDropdownOpen && (
              <div className="absolute right-0 top-full mt-2 w-48 rounded-xl bg-white/95 backdrop-blur shadow-lg ring-1 ring-violet-200/60 z-50">
                <div className="py-1">
                  <div className="px-4 py-2 border-b border-violet-100">
                    <p className="text-sm font-semibold text-slate-900">
                      {session?.user?.name || "Admin User"}
                    </p>
                    <p className="text-xs text-slate-500">
                      {session?.user?.email || "admin@nexora.com"}
                    </p>
                  </div>
                  <Link
                    href="/admin/settings"
                    className="flex w-full items-center gap-2 px-4 py-2 text-sm text-slate-700 hover:bg-violet-50"
                    onClick={() => setIsDropdownOpen(false)}
                  >
                    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor">
                      <path d="M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z" />
                      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09c.75 0 1.42-.45 1.7-1.14v-.01c.25-.63.12-1.35-.33-1.82l-.06-.06A2 2 0 1 1 7.04 3.4l.06.06c.47.45 1.19.58 1.82.33h.01c.69-.28 1.14-.95 1.14-1.7V2a2 2 0 1 1 4 0v.09c0 .75.45 1.42 1.14 1.7h.01c.63.25 1.35.11 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06c-.45.47-.58 1.19-.33 1.82v.01c.28.69.95 1.14 1.7 1.14H22a2 2 0 1 1 0 4h-.09c-.75 0-1.42.45-1.7 1.14Z" />
                    </svg>
                    Settings
                  </Link>
                  <button
                    onClick={handleSignOut}
                    className="flex w-full items-center gap-2 px-4 py-2 text-sm text-slate-700 hover:bg-violet-50"
                  >
                    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor">
                      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                      <polyline points="16,17 21,12 16,7" />
                      <line x1="21" y1="12" x2="9" y2="12" />
                    </svg>
                    Sign Out
                  </button>
                </div>
              </div>
            )}
          </div>
          </div>
        </div>
      </div>
    </header>
  );
}
