import type { Metadata } from "next";
import Sidebar from "@/components/Sidebar";
import AdminHeader from "@/components/AdminHeader";

export const metadata: Metadata = {
  title: "Admin | Nexora HCM",
};

export default function AdminLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <div className="flex">
      {/* Fixed, responsive sidebar with internal spacer */}
      <Sidebar />

      {/* Content area */}
      <div className="min-h-dvh flex-1 bg-gray-50 p-2 md:p-6">
        <div className="mx-auto max-w-7xl">
          <AdminHeader />
          <div className="rounded-xl bg-white p-4 shadow-sm">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}

