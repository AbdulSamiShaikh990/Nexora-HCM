"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo, useState, useEffect, useRef } from "react";
import { usePathname, useRouter } from "next/navigation";
import { signOut } from "next-auth/react";

function toTitle(s: string) {
  return s
    .replace(/[-_]+/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

export default function AdminHeader() {
  const pathname = usePathname();
  const router = useRouter();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);
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
      <div className="bg-gradient-to-r from-indigo-600 to-violet-600/95 text-white shadow-md ring-1 ring-white/15 backdrop-blur supports-[backdrop-filter]:bg-gradient-to-r supports-[backdrop-filter]:from-indigo-600/85 supports-[backdrop-filter]:to-violet-600/85">
        <div className="mx-auto max-w-7xl px-3 sm:px-4 md:px-6 py-3 md:py-4 flex items-center gap-3">
          {/* Left: logo chip (hidden on very small screens to save space) */}
          <div className="hidden xs:flex items-center gap-2 rounded-full bg-white/15 px-2 py-1">
            <Image src="/logo.png" alt="Nexora HCM" width={22} height={22} className="rounded" />
            <span className="hidden sm:inline text-sm font-medium">Nexora</span>
          </div>

          {/* Center: breadcrumb/title */}
          <div className="flex-1 truncate text-center xs:text-left">
            <div className="truncate text-sm md:text-base tracking-tight opacity-95">
              Admin {breadcrumb ? `/ ${breadcrumb}` : ""}
            </div>
          </div>

          {/* Right: Notification Bell + User Dropdown */}
          <div className="flex items-center gap-2">
            {/* Notification Bell */}
            <Link href="/admin/notifications" className="relative">
              <button className="inline-flex items-center justify-center h-9 w-9 rounded-full bg-white/20 backdrop-blur ring-1 ring-white/30 hover:bg-white/25 hover:ring-white/40 transition-colors">
                <svg
                  className="h-5 w-5 text-white"
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
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center ring-2 ring-white/30">
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
              className="inline-flex items-center gap-2 rounded-full bg-white/20 px-2.5 py-1.5 text-xs md:text-sm backdrop-blur ring-1 ring-white/30 hover:bg-white/25 hover:ring-white/40 transition-colors"
            >
              <span className="inline-flex h-6 w-6 items-center justify-center overflow-hidden rounded-full bg-white/85 shadow-sm">
                <svg viewBox="0 0 24 24" className="h-4 w-4 text-indigo-700" fill="currentColor">
                  <circle cx="12" cy="8" r="4" />
                  <path d="M4 20a8 8 0 0 1 16 0" />
                </svg>
              </span>
              <span className="hidden sm:block">Admin User</span>
              <svg 
                viewBox="0 0 24 24" 
                className={`h-4 w-4 opacity-90 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} 
                fill="currentColor"
              >
                <path d="M7 10l5 5 5-5" />
              </svg>
            </button>

            {/* Dropdown menu */}
            {isDropdownOpen && (
              <div className="absolute right-0 top-full mt-2 w-48 rounded-xl bg-white/95 backdrop-blur shadow-lg ring-1 ring-black/5 z-50">
                <div className="py-1">
                  <button
                    onClick={handleSignOut}
                    className="flex w-full items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
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
