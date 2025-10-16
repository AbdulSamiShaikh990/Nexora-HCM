"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useState, type JSX } from "react";

type NavItem = {
  label: string;
  href: string;
  icon: (active: boolean) => JSX.Element;
};

// Minimal inline SVG icons to avoid extra dependencies
const Icons = {
  dashboard: (a: boolean) => (
    <svg
      viewBox="0 0 24 24"
      className={`h-5 w-5 ${a ? "text-white" : "text-gray-500"}`}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
    >
      <path d="M3 12h8V3H3v9Zm10 9h8v-7h-8v7ZM3 21h8v-7H3v7Zm10-9h8V3h-8v9Z" />
    </svg>
  ),
  employees: (a: boolean) => (
    <svg
      viewBox="0 0 24 24"
      className={`h-5 w-5 ${a ? "text-white" : "text-gray-500"}`}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
    >
      <path d="M7 7a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z" transform="translate(5 5)" />
      <path d="M3 21a7 7 0 0 1 18 0" />
      <circle cx="12" cy="8" r="3" />
    </svg>
  ),
  attendance: (a: boolean) => (
    <svg
      viewBox="0 0 24 24"
      className={`h-5 w-5 ${a ? "text-white" : "text-gray-500"}`}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
    >
      <rect x="3" y="4" width="18" height="18" rx="2" />
      <path d="M16 2v4M8 2v4M3 10h18" />
      <path d="M12 14v-3m0 3l2 2" />
    </svg>
  ),
  payroll: (a: boolean) => (
    <svg
      viewBox="0 0 24 24"
      className={`h-5 w-5 ${a ? "text-white" : "text-gray-500"}`}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
    >
      <path d="M12 1v22" />
      <path d="M17 5a5 5 0 0 0-5-2 5 5 0 0 0-5 2m10 14a5 5 0 0 1-5 2 5 5 0 0 1-5-2" />
      <path d="M7 12h10" />
    </svg>
  ),
  performance: (a: boolean) => (
    <svg
      viewBox="0 0 24 24"
      className={`h-5 w-5 ${a ? "text-white" : "text-gray-500"}`}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
    >
      <path d="M3 21h18" />
      <path d="M7 17V9" />
      <path d="M12 17V5" />
      <path d="M17 17v-7" />
    </svg>
  ),
};

const navItems: NavItem[] = [
  { label: "Dashboard", href: "/admin/dashboard", icon: Icons.dashboard },
  { label: "Employees", href: "/admin/employees", icon: Icons.employees },
  { label: "Attendance", href: "/admin/attendance", icon: Icons.attendance },
  { label: "Payroll", href: "/admin/payroll", icon: Icons.payroll },
  { label: "Performance", href: "/admin/performance", icon: Icons.performance },
];

export default function Sidebar() {
  const pathname = usePathname();
  const [expanded, setExpanded] = useState(true); // for md+
  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchFocused, setSearchFocused] = useState(false);

  // Close drawer on route change (mobile)
  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  // Filter navigation items based on search
  const filteredNavItems = useMemo(() => {
    if (!searchQuery.trim()) return navItems;
    return navItems.filter((item) =>
      item.label.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [searchQuery]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Only handle keyboard shortcuts when sidebar is expanded and not typing in search
      if (!expanded || document.activeElement?.tagName === 'INPUT') return;
      
      // Ctrl/Cmd + K to focus search
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        const searchInput = document.querySelector('input[placeholder="Search..."]') as HTMLInputElement;
        searchInput?.focus();
      }
      
      // Number keys for quick navigation
      const num = parseInt(e.key);
      if (num >= 1 && num <= filteredNavItems.length) {
        e.preventDefault();
        window.location.href = filteredNavItems[num - 1].href;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [expanded, filteredNavItems]);

  // Determine active link
  const activeIndex = useMemo(
    () => filteredNavItems.findIndex((i) => pathname?.startsWith(i.href)),
    [pathname, filteredNavItems]
  );

  // Widths
  const expandedWidth = 256; // w-64
  const collapsedWidth = 80; // w-20
  // How much the card should protrude into the content area (OrangeHRM feel)
  const overlapExpanded = 20; // px
  const overlapCollapsed = 10; // px

  return (
    <>
      {/* Mobile launcher button when sidebar is closed */}
      {!mobileOpen && (
        <button
          type="button"
          onClick={() => setMobileOpen(true)}
          className="fixed left-3 top-4 z-30 inline-flex h-9 w-9 items-center justify-center rounded-full bg-violet-600 text-white shadow md:hidden"
          aria-label="Open menu"
        >
          <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor">
            <path d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
      )}
      {/* Mobile scrim */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/40 md:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar container */}
      <aside
        className={`fixed left-0 top-0 z-50 flex h-screen flex-col rounded-3xl border border-gray-200 bg-white shadow-2xl transition-transform duration-200 md:translate-x-0 ${
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        } md:transform-none`}
      >
        <div
          className="relative flex h-full flex-col"
          style={{
            width: expanded ? expandedWidth : collapsedWidth,
          }}
        >
          {/* Logo */}
          <div className="flex items-center justify-center gap-3 px-4 pt-5 pb-4">
            <Image
              src="/logo.png"
              alt="Nexora HCM"
              width={48}
              height={48}
              className="rounded-lg"
              priority
            />
            {expanded && (
              <div className="flex flex-col">
                <span className="text-base font-semibold tracking-wide text-gray-900">
                  NEXORA
                </span>
                <span className="text-xs text-gray-500 -mt-0.5">HCM</span>
              </div>
            )}
          </div>

          {/* Functional Search */}
          <div className="px-3">
            <div
              className={`flex items-center rounded-full border transition-colors ${
                searchFocused ? "border-violet-300 bg-white" : "border-gray-200 bg-gray-50"
              } ${expanded ? "" : "justify-center"}`}
            >
              <svg
                viewBox="0 0 24 24"
                className={`h-4 w-4 ml-3 ${searchFocused ? "text-violet-500" : "text-gray-400"}`}
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
              >
                <circle cx="11" cy="11" r="7" />
                <path d="M20 20 17 17" />
              </svg>
              {expanded && (
                <input
                  type="text"
                  placeholder="Search..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onFocus={() => setSearchFocused(true)}
                  onBlur={() => setSearchFocused(false)}
                  className="flex-1 bg-transparent px-2 py-2 text-sm text-gray-700 placeholder-gray-500 outline-none"
                />
              )}
              {expanded && searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="mr-2 rounded-full p-1 hover:bg-gray-200"
                >
                  <svg viewBox="0 0 24 24" className="h-3 w-3 text-gray-400" fill="currentColor">
                    <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                  </svg>
                </button>
              )}
            </div>
          </div>

          {/* Nav */}
          <nav className="mt-3 flex-1 space-y-1 px-2">
            {filteredNavItems.length > 0 ? (
              filteredNavItems.map((item, idx) => {
                const active = idx === activeIndex;
                return (
                  <Link key={item.href} href={item.href} className="block">
                    <div
                      className={`flex items-center gap-3 rounded-full px-3 py-2 transition-all duration-200 ${
                        active
                          ? "bg-gradient-to-r from-indigo-600 to-violet-600 text-white shadow-lg"
                          : "hover:bg-gray-100 hover:scale-105 text-gray-700"
                      } ${expanded ? "" : "justify-center"}`}
                    >
                      {item.icon(active)}
                      {expanded && (
                        <span className={`text-sm font-medium ${active ? "text-white" : ""}`}>
                          {item.label}
                        </span>
                      )}
                    </div>
                  </Link>
                );
              })
            ) : (
              expanded && searchQuery && (
                <div className="px-3 py-4 text-center">
                  <div className="text-gray-400 text-sm">
                    <svg viewBox="0 0 24 24" className="h-8 w-8 mx-auto mb-2 text-gray-300" fill="none" stroke="currentColor">
                      <circle cx="11" cy="11" r="8"/>
                      <path d="M21 21l-4.35-4.35"/>
                    </svg>
                    No results found for "{searchQuery}"
                  </div>
                </div>
              )
            )}
          </nav>

          {/* Keyboard shortcuts hint and version */}
          <div className="mb-4 mt-auto px-3">
            {expanded && (
              <div className="space-y-1">
                <div className="flex items-center justify-between text-[10px] text-gray-400">
                  <span>⌘K to search</span>
                  <span>1-5 for quick nav</span>
                </div>
                <div className="text-center">
                  <span className="text-[11px] text-gray-400">v1.0</span>
                </div>
              </div>
            )}
          </div>

          {/* Edge floating knob like OrangeHRM (md+ toggler) */}
          <button
            type="button"
            onClick={() => setExpanded((s) => !s)}
            className="absolute right-[-14px] top-32 hidden h-7 w-7 items-center justify-center rounded-full bg-violet-600 text-white shadow md:inline-flex"
            aria-label="Toggle sidebar"
            title="Toggle sidebar"
          >
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
              {expanded ? <path d="M15 6 9 12l6 6" /> : <path d="M9 6l6 6-6 6" />}
            </svg>
          </button>

          {/* Edge floating knob like screenshot (mobile toggle) */}
          <button
            type="button"
            onClick={() => setMobileOpen((o) => !o)}
            className="absolute right-[-14px] top-28 inline-flex h-7 w-7 items-center justify-center rounded-full bg-violet-600 text-white shadow md:hidden"
            aria-label="Open menu"
          >
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor">
              <path d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
        </div>
      </aside>

      {/* Reserve space for fixed sidebar on md+ */}
      <div
        className="hidden md:block"
        style={{
          width: expanded
            ? expandedWidth - overlapExpanded
            : collapsedWidth - overlapCollapsed,
        }}
        aria-hidden
      />
    </>
  );
}

