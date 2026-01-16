"use client";

import type { Metadata } from "next";
import { SessionProvider } from "next-auth/react";
import Sidebar from "@/components/Sidebar";
import AdminHeader from "@/components/AdminHeader";

export default function AdminLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <SessionProvider>
      <div className="flex min-h-screen bg-transparent">
      {/* Fixed, responsive sidebar with internal spacer */}
      <Sidebar />

      {/* Content area */}
      <div className="min-h-dvh flex-1 w-full overflow-x-hidden">
        <AdminHeader />
        <div className="p-2 sm:p-4 md:p-6">
          <div className="mx-auto max-w-7xl w-full">
            <div className="glass rounded-2xl p-4 sm:p-5 md:p-6 border border-white/30 shadow-[0_6px_20px_rgba(31,38,135,0.14)]">
              {children}
            </div>
          </div>
        </div>
      </div>
    </div>
    </SessionProvider>
  );
}

