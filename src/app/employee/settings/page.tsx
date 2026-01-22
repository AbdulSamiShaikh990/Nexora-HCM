"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import LoadingSpinner from "@/components/LoadingSpinner";

interface ProfileData {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  department: string;
  jobTitle: string;
  location: string;
  joinDate: string;
  status: string;
}

export default function SettingsPage() {
  const { update } = useSession();
  const [activeTab, setActiveTab] = useState("profile");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [notificationLoading, setNotificationLoading] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  
  const [profile, setProfile] = useState<ProfileData>({
    id: 0,
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    department: "",
    jobTitle: "",
    location: "",
    joinDate: "",
    status: "",
  });

  const [passwords, setPasswords] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  const [notifications, setNotifications] = useState({
    email: true,
    push: false,
    leaveUpdates: true,
    taskAssignments: true,
  });

  const tabs = [
    { id: "profile", name: "Profile", icon: "👤" },
    { id: "security", name: "Security", icon: "🔒" },
    { id: "notifications", name: "Notifications", icon: "🔔" },
  ];

  // Fetch employee settings on mount
  useEffect(() => {
    const fetchSettings = async () => {
      try {
        setLoading(true);
        const response = await fetch("/api/settings/employee");
        
        if (!response.ok) {
          throw new Error("Failed to fetch settings");
        }

        const data = await response.json();
        if (data.success && data.data) {
          setProfile(data.data.profile);
        }
      } catch (error) {
        console.error("Error fetching settings:", error);
        setMessage({
          type: "error",
          text: "Failed to load settings. Please refresh the page.",
        });
      } finally {
        setLoading(false);
      }
    };

    fetchSettings();
  }, []);

  // Handle profile save
  const handleSaveProfile = async () => {
    try {
      setSaving(true);
      setMessage(null);

      const response = await fetch("/api/settings/employee", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firstName: profile.firstName,
          lastName: profile.lastName,
          phone: profile.phone,
          location: profile.location,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to update profile");
      }

      if (data?.data) {
        setProfile((prev) => ({
          ...prev,
          firstName: data.data.firstName,
          lastName: data.data.lastName,
          phone: data.data.phone || "",
          location: data.data.location || "",
        }));
        // Refresh session display name so header menu reflects latest changes
        if (update) {
          await update({ name: `${data.data.firstName} ${data.data.lastName}` });
        }
      }

      setMessage({
        type: "success",
        text: "Profile updated successfully!",
      });
    } catch (error) {
      setMessage({
        type: "error",
        text: error instanceof Error ? error.message : "Failed to update profile",
      });
    } finally {
      setSaving(false);
    }
  };

  // Handle password change
  const handlePasswordChange = async () => {
    try {
      setPasswordLoading(true);
      setMessage(null);

      if (!passwords.currentPassword || !passwords.newPassword || !passwords.confirmPassword) {
        throw new Error("All password fields are required");
      }

      if (passwords.newPassword !== passwords.confirmPassword) {
        throw new Error("New passwords do not match");
      }

      const response = await fetch("/api/settings/employee", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currentPassword: passwords.currentPassword,
          newPassword: passwords.newPassword,
          confirmPassword: passwords.confirmPassword,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to update password");
      }

      setMessage({
        type: "success",
        text: "Password updated successfully!",
      });

      // Clear password fields
      setPasswords({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      });
    } catch (error) {
      setMessage({
        type: "error",
        text: error instanceof Error ? error.message : "Failed to update password",
      });
    } finally {
      setPasswordLoading(false);
    }
  };

  // Handle notification preferences save
  const handleSaveNotifications = async () => {
    try {
      setNotificationLoading(true);
      setMessage(null);

      const response = await fetch("/api/settings/notifications", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(notifications),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to save preferences");
      }

      setMessage({
        type: "success",
        text: "Notification preferences saved successfully!",
      });
    } catch (error) {
      setMessage({
        type: "error",
        text: error instanceof Error ? error.message : "Failed to save preferences",
      });
    } finally {
      setNotificationLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="w-full min-h-screen flex items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-blue-50 py-6">
      <div className="max-w-7xl mx-auto px-4 lg:px-6 space-y-6">
        {/* Hero */}
        <div className="bg-gradient-to-r from-orange-50 via-orange-100 to-amber-50 rounded-2xl border border-orange-200 shadow-lg p-6 lg:p-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center shadow-lg">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
              <div>
                <h1 className="text-3xl lg:text-4xl font-bold text-gray-900">Settings</h1>
                <p className="text-sm text-gray-700 mt-1">Manage your account settings and preferences</p>
              </div>
            </div>
            <Link
              href="/employee/dashboard"
              className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl border-2 border-orange-300 text-orange-700 hover:bg-white hover:border-orange-400 font-medium transition-all shadow-sm"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              <span className="text-sm">Back</span>
            </Link>
          </div>

          <div className="mt-4 flex flex-wrap gap-2 text-xs font-semibold text-orange-700">
            {tabs.map((tab) => (
              <span
                key={tab.id}
                className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full border ${
                  activeTab === tab.id
                    ? "bg-white text-orange-700 border-orange-300"
                    : "bg-white/60 border-orange-200 text-orange-600"
                }`}
              >
                <span>{tab.icon}</span>
                {tab.name}
              </span>
            ))}
          </div>
        </div>

        {/* Message Alert */}
        {message && (
          <div
            className={`rounded-2xl border shadow-md px-4 py-4 lg:px-5 lg:py-4 ${
              message.type === "success"
                ? "bg-green-50/90 border-green-200 text-green-900"
                : "bg-red-50/90 border-red-200 text-red-900"
            }`}
          >
            <div className="flex items-center gap-3">
              <span className="w-2.5 h-2.5 rounded-full bg-current opacity-60"></span>
              <p className="text-sm font-medium">{message.text}</p>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
          {/* Sidebar Navigation */}
          <div className="xl:col-span-1 space-y-4">
            <div className="bg-white/90 rounded-2xl shadow-lg border border-orange-100 backdrop-blur">
              <div className="p-4 border-b border-orange-100 flex items-center gap-2">
                <span className="text-orange-600 text-lg">⚙️</span>
                <p className="text-sm font-semibold text-gray-800">Quick Navigation</p>
              </div>
              <nav className="p-4 space-y-3">
                {tabs.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    type="button"
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left transition-all duration-150 border ${
                      activeTab === tab.id
                        ? "bg-gradient-to-r from-orange-500 to-orange-600 text-white shadow-lg shadow-orange-500/25 border-transparent"
                        : "bg-white text-gray-800 border-gray-200 hover:border-orange-300 hover:bg-orange-50"
                    }`}
                  >
                    <span className="text-xl flex-shrink-0">{tab.icon}</span>
                    <span className="font-semibold">{tab.name}</span>
                  </button>
                ))}
              </nav>
            </div>
          </div>

          {/* Main Content */}
          <div className="xl:col-span-3 space-y-6">
            {/* Profile Tab */}
            {activeTab === "profile" && (
              <div className="space-y-6">
                <div className="bg-white/90 rounded-2xl shadow-xl border border-orange-100 p-6 lg:p-7 backdrop-blur">
                  <div className="mb-6">
                    <p className="text-sm font-semibold text-orange-600">Profile</p>
                    <h2 className="text-2xl font-bold text-gray-900">Personal Information</h2>
                    <p className="text-sm text-gray-600 mt-1">Keep your primary details up to date.</p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <div className="space-y-2">
                      <label className="text-sm font-semibold text-gray-700">First Name</label>
                      <input
                        type="text"
                        value={profile.firstName}
                        onChange={(e) => setProfile({ ...profile, firstName: e.target.value })}
                        className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-white focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-transparent transition-all shadow-sm"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-semibold text-gray-700">Last Name</label>
                      <input
                        type="text"
                        value={profile.lastName}
                        onChange={(e) => setProfile({ ...profile, lastName: e.target.value })}
                        className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-white focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-transparent transition-all shadow-sm"
                      />
                    </div>
                    <div className="space-y-2 md:col-span-2">
                      <label className="text-sm font-semibold text-gray-700">Email Address</label>
                      <input
                        type="email"
                        value={profile.email}
                        disabled
                        className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-gray-100 text-gray-600 cursor-not-allowed"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-semibold text-gray-700">Phone Number</label>
                      <input
                        type="tel"
                        value={profile.phone}
                        onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                        className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-white focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-transparent transition-all shadow-sm"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-semibold text-gray-700">Department</label>
                      <input
                        type="text"
                        value={profile.department}
                        disabled
                        className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-gray-100 text-gray-600 cursor-not-allowed"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-semibold text-gray-700">Job Title</label>
                      <input
                        type="text"
                        value={profile.jobTitle}
                        disabled
                        className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-gray-100 text-gray-600 cursor-not-allowed"
                      />
                    </div>
                  </div>

                  <div className="mt-8 flex flex-wrap justify-end gap-3">
                    <button
                      onClick={() => window.location.reload()}
                      className="px-5 py-3 rounded-xl border-2 border-gray-200 text-gray-800 font-semibold hover:border-orange-300 hover:bg-orange-50 transition-all"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleSaveProfile}
                      disabled={saving}
                      className="px-6 py-3 rounded-xl bg-gradient-to-r from-orange-500 to-orange-600 text-white font-semibold shadow-lg shadow-orange-500/30 hover:shadow-xl transition-all disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                      {saving ? "Saving..." : "Save Changes"}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Security Tab */}
            {activeTab === "security" && (
              <div className="space-y-6">
                <div className="bg-white/90 rounded-2xl shadow-xl border border-orange-100 p-6 lg:p-7 backdrop-blur">
                  <p className="text-sm font-semibold text-orange-600">Security</p>
                  <h2 className="text-2xl font-bold text-gray-900 mb-4">Change Password</h2>
                  <form autoComplete="off" onSubmit={(e) => e.preventDefault()}>
                    <div className="space-y-5">
                      <div className="space-y-2">
                        <label className="text-sm font-semibold text-gray-700">Current Password</label>
                        <input
                          type="password"
                          autoComplete="new-password"
                          name="current-pwd"
                          placeholder="••••••••"
                          value={passwords.currentPassword}
                          onChange={(e) => setPasswords({ ...passwords, currentPassword: e.target.value })}
                          className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-white focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-transparent transition-all shadow-sm"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-semibold text-gray-700">New Password</label>
                        <input
                          type="password"
                          autoComplete="new-password"
                          name="new-pwd"
                          placeholder="••••••••"
                          value={passwords.newPassword}
                          onChange={(e) => setPasswords({ ...passwords, newPassword: e.target.value })}
                          className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-white focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-transparent transition-all shadow-sm"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-semibold text-gray-700">Confirm New Password</label>
                        <input
                          type="password"
                          autoComplete="new-password"
                          name="confirm-pwd"
                          placeholder="••••••••"
                          value={passwords.confirmPassword}
                          onChange={(e) => setPasswords({ ...passwords, confirmPassword: e.target.value })}
                          className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-white focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-transparent transition-all shadow-sm"
                        />
                      </div>
                    </div>
                  </form>
                  <div className="mt-6 flex justify-end">
                    <button
                      onClick={handlePasswordChange}
                      disabled={passwordLoading}
                      className="px-6 py-3 rounded-xl bg-gradient-to-r from-orange-500 to-orange-600 text-white font-semibold shadow-lg shadow-orange-500/30 hover:shadow-xl transition-all disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                      {passwordLoading ? "Updating..." : "Update Password"}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Notifications Tab */}
            {activeTab === "notifications" && (
              <div className="space-y-6">
                <div className="bg-white/90 rounded-2xl shadow-xl border border-orange-100 p-6 lg:p-7 backdrop-blur">
                  <p className="text-sm font-semibold text-orange-600">Notifications</p>
                  <h2 className="text-2xl font-bold text-gray-900 mb-6">Notification Preferences</h2>

                  <div className="space-y-6">
                    <div className="flex items-center justify-between pb-6 border-b border-gray-200">
                      <div>
                        <h3 className="font-semibold text-gray-900">Email Notifications</h3>
                        <p className="text-sm text-gray-600 mt-1">Receive notifications via email</p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={notifications.email}
                          onChange={(e) =>
                            setNotifications({
                              ...notifications,
                              email: e.target.checked,
                            })
                          }
                          className="sr-only peer"
                        />
                        <div className="w-14 h-7 bg-gray-300 peer-focus:ring-4 peer-focus:ring-orange-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[4px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-orange-500"></div>
                      </label>
                    </div>

                    <div className="flex items-center justify-between pb-6 border-b border-gray-200">
                      <div>
                        <h3 className="font-semibold text-gray-900">Push Notifications</h3>
                        <p className="text-sm text-gray-600 mt-1">Receive push notifications on your device</p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={notifications.push}
                          onChange={(e) =>
                            setNotifications({
                              ...notifications,
                              push: e.target.checked,
                            })
                          }
                          className="sr-only peer"
                        />
                        <div className="w-14 h-7 bg-gray-300 peer-focus:ring-4 peer-focus:ring-orange-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[4px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-orange-500"></div>
                      </label>
                    </div>

                    <div className="flex items-center justify-between pb-6 border-b border-gray-200">
                      <div>
                        <h3 className="font-semibold text-gray-900">Leave Updates</h3>
                        <p className="text-sm text-gray-600 mt-1">Get notified about leave request status</p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={notifications.leaveUpdates}
                          onChange={(e) =>
                            setNotifications({
                              ...notifications,
                              leaveUpdates: e.target.checked,
                            })
                          }
                          className="sr-only peer"
                        />
                        <div className="w-14 h-7 bg-gray-300 peer-focus:ring-4 peer-focus:ring-orange-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[4px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-orange-500"></div>
                      </label>
                    </div>

                    <div className="flex items-center justify-between pb-6 border-b border-gray-200">
                      <div>
                        <h3 className="font-semibold text-gray-900">Task Assignments</h3>
                        <p className="text-sm text-gray-600 mt-1">Get notified when tasks are assigned to you</p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={notifications.taskAssignments}
                          onChange={(e) =>
                            setNotifications({
                              ...notifications,
                              taskAssignments: e.target.checked,
                            })
                          }
                          className="sr-only peer"
                        />
                        <div className="w-14 h-7 bg-gray-300 peer-focus:ring-4 peer-focus:ring-orange-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[4px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-orange-500"></div>
                      </label>
                    </div>
                  </div>

                  <div className="mt-8 flex justify-end">
                    <button
                      onClick={handleSaveNotifications}
                      disabled={notificationLoading}
                      className="px-6 py-3 rounded-xl bg-gradient-to-r from-orange-500 to-orange-600 text-white font-semibold shadow-lg shadow-orange-500/30 hover:shadow-xl transition-all disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                      {notificationLoading ? "Saving..." : "Save Preferences"}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
