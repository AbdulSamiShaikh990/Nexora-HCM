"use client";

import { useSearchParams } from "next/navigation";
import Link from "next/link";

export default function AuthErrorPage() {
  const searchParams = useSearchParams();
  const error = searchParams.get("error");

  const getErrorMessage = (errorCode: string | null) => {
    switch (errorCode) {
      case "Configuration":
        return "There is a problem with the server configuration.";
      case "AccessDenied":
        return "Access denied. You do not have permission to sign in.";
      case "Verification":
        return "The verification token has expired or has already been used.";
      case "Default":
      default:
        return "An unexpected error occurred. Please try again.";
    }
  };

  const getErrorTitle = (errorCode: string | null) => {
    switch (errorCode) {
      case "Configuration":
        return "Configuration Error";
      case "AccessDenied":
        return "Access Denied";
      case "Verification":
        return "Verification Error";
      case "Default":
      default:
        return "Authentication Error";
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 to-pink-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-gradient-to-r from-red-500 to-red-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Nexora HCM</h1>
        </div>

        <div className="bg-white rounded-2xl shadow-xl p-8 border border-gray-100">
          <div className="text-center">
            <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              {getErrorTitle(error)}
            </h2>
            
            <p className="text-gray-600 mb-8">
              {getErrorMessage(error)}
            </p>

            <div className="space-y-4">
              <Link
                href="/auth/signin"
                className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white py-3 px-4 rounded-xl hover:from-blue-700 hover:to-indigo-700 transition-all duration-200 font-medium inline-block text-center"
              >
                Try Again
              </Link>
              
              <Link
                href="/"
                className="w-full border-2 border-gray-300 text-gray-700 py-3 px-4 rounded-xl hover:bg-gray-50 hover:border-gray-400 transition-all duration-200 font-medium inline-block text-center"
              >
                Go to Homepage
              </Link>
            </div>
          </div>
        </div>

        <div className="text-center mt-8 text-sm text-gray-600">
          <p>Need help? Contact your system administrator.</p>
        </div>
      </div>
    </div>
  );
}
