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
    <div className="flex min-h-screen bg-gray-50">
      {/* Fixed, responsive sidebar with internal spacer */}
      <Sidebar />

      {/* Content area */}
      <div className="min-h-dvh flex-1 w-full overflow-x-hidden">
        <AdminHeader />
        <div className="p-2 sm:p-4 md:p-6">
          <div className="mx-auto max-w-7xl w-full">
            <div className="rounded-xl bg-white p-3 sm:p-4 md:p-6 shadow-sm">
              {children}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

