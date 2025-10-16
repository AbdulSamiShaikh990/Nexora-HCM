"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setMessage("");
    setIsLoading(true);

    try {
      // TODO: Implement forgot password logic
      await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate API call
      setMessage("Password reset link has been sent to your email address.");
    } catch {
      setError("Failed to send reset email. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md">
      {/* Mobile Logo - Only show on small screens */}
      <div className="lg:hidden text-center mb-8">
        <Image src="/logo.png" alt="Nexora HCM" width={64} height={64} className="mx-auto mb-4" />
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Nexora HCM</h1>
        <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">Human Capital Management System</p>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-6 sm:p-8 border border-gray-200 dark:border-gray-700">
        <div className="text-center mb-6">
          <Image src="/logo.png" alt="Nexora HCM" width={64} height={64} className="mx-auto mb-3" />
          <h2 className="text-xl sm:text-2xl font-semibold mb-1 text-gray-900 dark:text-white">Forgot Password</h2>
          <p className="text-sm text-gray-600 dark:text-gray-400">Enter your email to reset your password</p>
        </div>

        {/* Success Message */}
        {message && (
          <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg">
            <p className="text-sm text-green-600 text-center">{message}</p>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm text-red-600 text-center">{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="email" className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">Email Address</label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-gray-500 dark:text-gray-400">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/>
                </svg>
              </span>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="you@example.com"
                className="w-full pl-10 pr-4 py-3 border-2 border-gray-300 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full text-white py-3 sm:py-4 px-4 rounded-xl hover:shadow-2xl hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 font-semibold disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center text-base sm:text-lg"
            style={{ 
              backgroundImage: "linear-gradient(to right, var(--primary), var(--primary-700))",
              boxShadow: "0 10px 25px -5px rgba(37, 99, 235, 0.5)"
            }}
          >
            {isLoading ? (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            ) : (
              "Send Reset Link"
            )}
          </button>
        </form>

        <div className="mt-6 text-center">
          <Link 
            href="/auth/signin" 
            className="text-blue-600 dark:text-blue-400 hover:opacity-80 transition-opacity text-sm"
          >
            Back to Login
          </Link>
        </div>

        <div className="mt-6 text-center text-xs sm:text-sm text-gray-600 dark:text-gray-400">
          <p>Remember your password? <Link href="/auth/signin" className="text-blue-600 dark:text-blue-400 hover:opacity-80">Sign in</Link></p>
        </div>
      </div>

      <div className="text-center mt-6 sm:mt-8 text-xs sm:text-sm text-gray-600 dark:text-gray-400">
        <p>© 2024 Nexora HCM. All rights reserved.</p>
      </div>
    </div>
  );
}
