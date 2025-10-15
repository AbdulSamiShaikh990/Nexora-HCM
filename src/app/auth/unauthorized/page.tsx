"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";

function UnauthorizedContent() {
  const searchParams = useSearchParams();
  const requiredRole = searchParams.get("role");

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-yellow-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-gradient-to-r from-orange-500 to-orange-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Nexora HCM</h1>
        </div>

        <div className="bg-white rounded-2xl shadow-xl p-8 border border-gray-100">
          <div className="text-center">
            <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-6 h-6 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              Access Restricted
            </h2>
            
            <p className="text-gray-600 mb-2">
              You don&apos;t have permission to access this page.
            </p>
            
            {requiredRole && (
              <p className="text-sm text-gray-500 mb-8">
                This page requires <span className="font-semibold text-orange-600">{requiredRole}</span> access.
              </p>
            )}

            <div className="space-y-4">
              <Link
                href="/auth/signin"
                className="w-full bg-gradient-to-r from-orange-500 to-orange-600 text-white py-3 px-4 rounded-xl hover:from-orange-600 hover:to-orange-700 transition-all duration-200 font-medium inline-block text-center"
              >
                Sign In with Correct Role
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
          <p>Need access? Contact your system administrator.</p>
        </div>
      </div>
    </div>
  );
}

export default function UnauthorizedPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <UnauthorizedContent />
    </Suspense>
  );
}
