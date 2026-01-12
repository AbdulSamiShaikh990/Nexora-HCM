"use client";

import { SessionProvider } from "next-auth/react";
import { useState } from "react";
import EmployeeSidebar from "@/components/EmployeeSidebar";
import EmployeeHeader from "@/components/EmployeeHeader";

export default function EmployeeLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [isCollapsed, setIsCollapsed] = useState(false);

  return (
    <SessionProvider>
      <div className="min-h-screen bg-gradient-to-br from-orange-50/30 via-white to-orange-50/30">
        <EmployeeSidebar isCollapsed={isCollapsed} setIsCollapsed={setIsCollapsed} />
        <EmployeeHeader isCollapsed={isCollapsed} />
        
        {/* Main Content */}
        <main className={`pt-16 transition-all duration-300 ${isCollapsed ? "lg:ml-20" : "lg:ml-64"}`}>
          <div className="p-4 lg:p-6">
            <div className="bg-white/60 backdrop-blur-sm rounded-2xl shadow-lg border border-orange-100/50 p-4 lg:p-6 min-h-[calc(100vh-7rem)]">
              {children}
            </div>
          </div>
        </main>
      </div>
    </SessionProvider>
  );
}