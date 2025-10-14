"use client";

import Image from "next/image";
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
  const dropdownRef = useRef<HTMLDivElement>(null);

  const crumbs = useMemo(() => {
    const parts = (pathname || "/").split("/").filter(Boolean);
    // e.g. ["admin","employees"] -> ["Admin","Employees"]
    return parts.map(toTitle);
  }, [pathname]);

  const breadcrumb = crumbs.slice(1).join(" / ") || "Dashboard"; // ignore leading "Admin"

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
    <header className="sticky top-0 z-10 mb-4">
      <div className="bg-gradient-to-r from-indigo-600 to-violet-600 px-4 py-3 text-white shadow-md md:px-6 md:py-4">
        <div className="flex items-center gap-3">
          {/* Left: logo chip (hidden on very small screens to save space) */}
          <div className="hidden xs:flex items-center gap-2 rounded-full bg-white/15 px-2 py-1">
            <Image src="/logo.png" alt="Nexora HCM" width={22} height={22} className="rounded" />
            <span className="hidden sm:inline text-sm font-medium">Nexora</span>
          </div>

          {/* Center: breadcrumb/title */}
          <div className="flex-1 truncate text-center xs:text-left">
            <div className="truncate text-sm md:text-base opacity-90">
              Admin {breadcrumb ? `/ ${breadcrumb}` : ""}
            </div>
          </div>

          {/* Right: user dropdown */}
          <div className="relative ml-auto" ref={dropdownRef}>
            <button
              type="button"
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              className="inline-flex items-center gap-2 rounded-full bg-white/20 px-2 py-1 text-xs backdrop-blur hover:bg-white/25 md:text-sm"
            >
              <span className="inline-flex h-6 w-6 items-center justify-center overflow-hidden rounded-full bg-white/80">
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
              <div className="absolute right-0 top-full mt-2 w-48 rounded-lg bg-white shadow-lg ring-1 ring-black ring-opacity-5 z-50">
                <div className="py-1">
                  <button
                    onClick={handleSignOut}
                    className="flex w-full items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
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
    </header>
  );
}
