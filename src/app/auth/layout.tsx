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
    <div className="relative min-h-screen overflow-hidden">
      {/* Full Background Image */}
      <div className="absolute inset-0">
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

      {/* Login Form Container - Positioned in center-right */}
      <div className="relative z-10 min-h-screen flex items-center justify-center p-4 sm:p-8">
        <div className="w-full max-w-md ml-auto mr-8 lg:mr-16 xl:mr-24 lg:ml-0">
          {children}
        </div>
      </div>
    </div>
  );
}
