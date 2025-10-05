"use client";

import Image from "next/image";
import { useMemo } from "react";
import { usePathname } from "next/navigation";

function toTitle(s: string) {
  return s
    .replace(/[-_]+/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

export default function AdminHeader() {
  const pathname = usePathname();

  const crumbs = useMemo(() => {
    const parts = (pathname || "/").split("/").filter(Boolean);
    // e.g. ["admin","employees"] -> ["Admin","Employees"]
    return parts.map(toTitle);
  }, [pathname]);

  const breadcrumb = crumbs.slice(1).join(" / ") || "Dashboard"; // ignore leading "Admin"

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

          {/* Right: user pill */}
          <button
            type="button"
            className="ml-auto inline-flex items-center gap-2 rounded-full bg-white/20 px-2 py-1 text-xs backdrop-blur hover:bg-white/25 md:text-sm"
          >
            <span className="inline-flex h-6 w-6 items-center justify-center overflow-hidden rounded-full bg-white/80">
              <svg viewBox="0 0 24 24" className="h-4 w-4 text-indigo-700" fill="currentColor">
                <circle cx="12" cy="8" r="4" />
                <path d="M4 20a8 8 0 0 1 16 0" />
              </svg>
            </span>
            <span className="hidden sm:block">Admin User</span>
            <svg viewBox="0 0 24 24" className="h-4 w-4 opacity-90" fill="currentColor">
              <path d="M7 10l5 5 5-5" />
            </svg>
          </button>
        </div>
      </div>
    </header>
  );
}
