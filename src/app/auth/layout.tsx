import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Authentication - Nexora HCM",
  description: "Sign in to access your Nexora HCM dashboard",
};

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen">
      {/* Left Side - Background Image */}
      <div className="hidden lg:flex lg:w-1/2 xl:w-3/5 relative overflow-hidden">
        <div
          className="absolute inset-0 bg-center bg-no-repeat"
          style={{
            backgroundImage: "url('/bg6.jpeg')",
            backgroundSize: "cover",
            backgroundPosition: "center center",
            imageRendering: "crisp-edges",
          }}
        />
        <div
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(90deg, rgba(3,105,161,0.55) 0%, rgba(2,132,199,0.45) 40%, rgba(14,165,233,0.25) 70%, rgba(14,165,233,0.00) 100%)",
          }}
        />
      </div>

      {/* Right Side - Login Form */}
      <div className="w-full lg:w-1/2 xl:w-2/5 min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 p-4 sm:p-8">
        {children}
      </div>
    </div>
  );
}
