"use client";
import { useState, useEffect } from "react";

type Notification = {
  id: string;
  type: "remote_work" | "attendance_correction" | "leave";
  employeeName: string;
  employeeEmail: string;
  department: string | null;
  jobTitle: string | null;
  state: "pending" | "approved" | "rejected";
  createdAt: string;
  title: string;
  message: string;
};

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "pending" | "approved" | "rejected">("pending");
  const [processingId, setProcessingId] = useState<string | null>(null);

  useEffect(() => {
    fetchNotifications();
    // Auto-refresh every 10 seconds
    const interval = setInterval(fetchNotifications, 10000);
    return () => clearInterval(interval);
  }, []);

  const fetchNotifications = async () => {
    try {
      const res = await fetch("/api/notifications/admin");
      if (res.ok) {
        const data = await res.json();
        setNotifications(data.notifications || []);
      }
    } catch (error) {
      console.error("Error fetching notifications:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleAction = async (notification: Notification, action: "approved" | "rejected") => {
    setProcessingId(notification.id);
    try {
      if (notification.type === "leave") {
        const res = await fetch("/api/leave/admin", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: notification.id, status: action === "approved" ? "Approved" : "Rejected" }),
        });
        if (res.ok) {
          await fetchNotifications();
        } else {
          const data = await res.json();
          alert(data.error || "Failed to process leave request");
        }
      } else {
        const res = await fetch("/api/attendance/admin/remote", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ 
            requestId: parseInt(notification.id, 10), 
            action,
            type: notification.type
          }),
        });

        if (res.ok) {
          await fetchNotifications();
        } else {
          const data = await res.json();
          alert(data.error || "Failed to process request");
        }
      }
    } catch (error) {
      console.error("Error processing request:", error);
      alert("Failed to process request");
    } finally {
      setProcessingId(null);
    }
  };

  const filteredNotifications = notifications.filter((notif) => {
    if (filter === "all") return true;
    return notif.state === filter;
  });

  const pendingCount = notifications.filter((r) => r.state === "pending").length;

  const getStateColor = (state: string) => {
    switch (state) {
      case "pending":
        return "bg-yellow-100 text-yellow-800";
      case "approved":
        return "bg-green-100 text-green-800";
      case "rejected":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case "remote_work":
        return { label: "Remote Work Request", icon: "🏠", color: "bg-blue-100 text-blue-800" };
      case "attendance_correction":
        return { label: "Attendance Correction", icon: "📝", color: "bg-purple-100 text-purple-800" };
      case "leave":
        return { label: "Leave Request", icon: "🌿", color: "bg-green-100 text-green-800" };
      default:
        return { label: "Request", icon: "📋", color: "bg-gray-100 text-gray-800" };
    }
  };

  if (loading) {
    return (
      <div className="w-full">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-xl sm:text-2xl lg:text-3xl font-semibold text-gray-900">
          Notifications
        </h1>
        <p className="mt-1 sm:mt-2 text-xs sm:text-sm text-gray-600">
          Manage all employee requests (Remote Work, Attendance Corrections, etc.)
        </p>
      </div>

      {/* Stats Card */}
      <div className="mb-6 bg-white rounded-xl p-4 border border-gray-200">
        <div className="flex items-center gap-2">
          <div className="bg-yellow-100 rounded-full p-2">
            <svg
              className="w-5 h-5 text-yellow-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
              />
            </svg>
          </div>
          <div>
            <p className="text-sm text-gray-600">Pending Requests</p>
            <p className="text-2xl font-bold text-gray-900">{pendingCount}</p>
          </div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="mb-6 flex gap-2 border-b border-gray-200">
        {["pending", "approved", "rejected", "all"].map((tab) => (
          <button
            key={tab}
            onClick={() => setFilter(tab as typeof filter)}
            className={`px-4 py-2 text-sm font-medium capitalize transition-colors ${
              filter === tab
                ? "border-b-2 border-purple-600 text-purple-600"
                : "text-gray-600 hover:text-gray-900"
            }`}
          >
            {tab}
            {tab === "pending" && pendingCount > 0 && (
              <span className="ml-2 bg-yellow-100 text-yellow-800 text-xs px-2 py-0.5 rounded-full">
                {pendingCount}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Requests List */}
      {filteredNotifications.length === 0 ? (
        <div className="bg-white rounded-xl p-8 text-center border border-gray-200">
          <svg
            className="mx-auto h-12 w-12 text-gray-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"
            />
          </svg>
          <p className="mt-2 text-sm text-gray-600">
            No {filter !== "all" ? filter : ""} requests found
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredNotifications.map((notification) => {
            const typeInfo = getTypeLabel(notification.type);
            
            return (
              <div
                key={notification.id}
                className="bg-white rounded-xl p-5 border border-gray-200 hover:border-purple-300 transition-colors"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    {/* Type Badge */}
                    <div className="mb-3">
                      <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium ${typeInfo.color}`}>
                        <span>{typeInfo.icon}</span>
                        {typeInfo.label}
                      </span>
                    </div>

                    {/* Employee Info */}
                    <div className="flex items-center gap-3 mb-3">
                      <div className="bg-purple-100 rounded-full w-10 h-10 flex items-center justify-center">
                        <span className="text-purple-700 font-semibold">
                          {notification.employeeName.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <div className="flex-1">
                        <h3 className="font-semibold text-gray-900">{notification.employeeName}</h3>
                        <p className="text-sm text-gray-600">{notification.employeeEmail}</p>
                        <p className="text-xs text-gray-500">{notification.department || "N/A"} · {notification.jobTitle || "N/A"}</p>
                      </div>
                    </div>

                    {/* Message */}
                    <div className="mb-3">
                      <p className="text-sm text-gray-800 bg-gray-50 rounded-lg p-3 leading-relaxed">
                        {notification.message}
                      </p>
                    </div>

                    {/* Status */}
                    <div className="flex items-center gap-3 flex-wrap">
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStateColor(notification.state)}`}>
                        {notification.state.toUpperCase()}
                      </span>
                      <span className="text-xs text-gray-500">
                        {new Date(notification.createdAt).toLocaleString("en-US", {
                          month: "short",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  {notification.state === "pending" && (
                    <div className="flex gap-2 ml-4">
                      <button
                        onClick={() => handleAction(notification, "approved")}
                        disabled={processingId === notification.id}
                        className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {processingId === notification.id ? "..." : "Approve"}
                      </button>
                      <button
                        onClick={() => handleAction(notification, "rejected")}
                        disabled={processingId === notification.id}
                        className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {processingId === notification.id ? "..." : "Reject"}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
