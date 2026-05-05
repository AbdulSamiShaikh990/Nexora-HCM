"use client";
import { useState, useEffect } from "react";
import {
  Bell,
  CalendarDays,
  CheckCircle2,
  ClipboardCheck,
  Clock,
  Home,
  Search,
  XCircle,
} from "lucide-react";

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
        return "bg-amber-100 text-amber-800";
      case "approved":
        return "bg-emerald-100 text-emerald-800";
      case "rejected":
        return "bg-rose-100 text-rose-800";
      default:
        return "bg-slate-100 text-slate-800";
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case "remote_work":
        return {
          label: "Remote Work Request",
          icon: <Home className="h-3.5 w-3.5" />,
          color: "bg-blue-100 text-blue-800",
        };
      case "attendance_correction":
        return {
          label: "Attendance Correction",
          icon: <ClipboardCheck className="h-3.5 w-3.5" />,
          color: "bg-violet-100 text-violet-800",
        };
      case "leave":
        return {
          label: "Leave Request",
          icon: <CalendarDays className="h-3.5 w-3.5" />,
          color: "bg-emerald-100 text-emerald-800",
        };
      default:
        return {
          label: "Request",
          icon: <ClipboardCheck className="h-3.5 w-3.5" />,
          color: "bg-slate-100 text-slate-800",
        };
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-600/10 via-cyan-600/10 to-teal-600/10"></div>
        <div className="flex items-center justify-center h-64 relative z-10">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-blue-600/10 via-cyan-600/10 to-teal-600/10"></div>
      <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiM5YzkyYWMiIGZpbGwtb3BhY2l0eT0iMC4wNSI+PHBhdGggZD0iTTM2IDM0djItaDJ2LTJoLTJ6bTAtNHYyaDJ2LTJoLTJ6bTAtNHYyaDJ2LTJoLTJ6bTAtNHYyaDJ2LTJoLTJ6Ii8+PC9nPjwvZz48L3N2Zz4=')] opacity-30"></div>
      <div className="relative z-10 w-full px-3 sm:px-5 lg:px-8 py-4 sm:py-6">
        {/* Header */}
        <div className="mb-6 backdrop-blur-xl bg-white/60 rounded-3xl border border-white/40 shadow-xl p-5 sm:p-6 lg:p-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold bg-gradient-to-r from-blue-600 via-cyan-600 to-teal-600 bg-clip-text text-transparent">
                Notifications
              </h1>
              <p className="mt-2 text-sm text-slate-700 font-medium">
                Manage all employee requests with fast approvals and clear visibility.
              </p>
            </div>
            <div className="flex items-center gap-2 text-sm text-slate-600">
              <Bell className="h-4 w-4 text-blue-600" />
              <span className="font-semibold">Live updates enabled</span>
            </div>
          </div>
        </div>

      {/* Stats Card */}
        <div className="mb-6 backdrop-blur-xl bg-white/60 rounded-3xl border border-white/40 shadow-xl p-5 sm:p-6 relative overflow-hidden">
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-blue-500/5 via-cyan-500/5 to-teal-500/5"></div>
          <div className="relative z-10 flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-500 text-white flex items-center justify-center shadow-lg">
              <Clock className="h-6 w-6" />
            </div>
            <div>
              <p className="text-xs uppercase tracking-wide text-slate-500 font-semibold">Pending Requests</p>
              <p className="text-3xl font-bold text-slate-900 mt-1">{pendingCount}</p>
            </div>
          </div>
        </div>

      {/* Filter Tabs */}
        <div className="mb-6 flex flex-wrap gap-2 border-b border-white/40">
        {["pending", "approved", "rejected", "all"].map((tab) => (
          <button
            key={tab}
            onClick={() => setFilter(tab as typeof filter)}
            className={`px-4 py-2 text-sm font-semibold capitalize rounded-t-xl transition-all ${
              filter === tab
                ? "bg-white/70 text-blue-700 border-b-2 border-blue-600"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            {tab}
            {tab === "pending" && pendingCount > 0 && (
              <span className="ml-2 bg-amber-100 text-amber-800 text-xs px-2 py-0.5 rounded-full">
                {pendingCount}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Requests List */}
        {filteredNotifications.length === 0 ? (
          <div className="backdrop-blur-xl bg-white/60 rounded-3xl p-8 text-center border border-white/40 shadow-xl relative overflow-hidden">
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-blue-500/5 via-cyan-500/5 to-teal-500/5"></div>
            <div className="relative z-10 mx-auto h-12 w-12 rounded-2xl bg-slate-100 text-slate-500 flex items-center justify-center">
              <Search className="h-6 w-6" />
            </div>
            <p className="relative z-10 mt-3 text-sm text-slate-600">
              No {filter !== "all" ? filter : ""} requests found
            </p>
          </div>
        ) : (
          <div className="space-y-4">
          {filteredNotifications.map((notification, index) => {
            const typeInfo = getTypeLabel(notification.type);
            
            return (
              <div
                key={`${notification.type}-${notification.id}-${index}`}
                className="backdrop-blur-xl bg-white/60 rounded-3xl p-5 border border-white/40 shadow-lg hover:shadow-xl transition-all relative overflow-hidden"
              >
                <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-blue-500/5 via-cyan-500/5 to-teal-500/5"></div>
                <div className="relative z-10 flex items-start justify-between">
                  <div className="flex-1">
                    {/* Type Badge */}
                    <div className="mb-3">
                      <span className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold ${typeInfo.color}`}>
                        <span className="inline-flex">{typeInfo.icon}</span>
                        {typeInfo.label}
                      </span>
                    </div>

                    {/* Employee Info */}
                    <div className="flex items-center gap-3 mb-3">
                      <div className="bg-gradient-to-br from-blue-200 to-cyan-200 rounded-full w-10 h-10 flex items-center justify-center">
                        <span className="text-blue-700 font-semibold">
                          {notification.employeeName.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <div className="flex-1">
                        <h3 className="font-semibold text-slate-900">{notification.employeeName}</h3>
                        <p className="text-sm text-slate-600">{notification.employeeEmail}</p>
                        <p className="text-xs text-slate-500">{notification.department || "N/A"} · {notification.jobTitle || "N/A"}</p>
                      </div>
                    </div>

                    {/* Message */}
                    <div className="mb-3">
                      <p className="text-sm text-slate-800 bg-white/70 rounded-2xl p-3 leading-relaxed border border-white/60">
                        {notification.message}
                      </p>
                    </div>

                    {/* Status */}
                    <div className="flex items-center gap-3 flex-wrap">
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStateColor(notification.state)}`}>
                        {notification.state.toUpperCase()}
                      </span>
                      <span className="text-xs text-slate-500 inline-flex items-center gap-1">
                        <Clock className="h-3.5 w-3.5" />
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
                    <div className="flex flex-col sm:flex-row gap-2 ml-4">
                      <button
                        onClick={() => handleAction(notification, "approved")}
                        disabled={processingId === notification.id}
                        className="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-xl text-sm font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <CheckCircle2 className="h-4 w-4" />
                        {processingId === notification.id ? "..." : "Approve"}
                      </button>
                      <button
                        onClick={() => handleAction(notification, "rejected")}
                        disabled={processingId === notification.id}
                        className="inline-flex items-center gap-2 bg-rose-600 hover:bg-rose-700 text-white px-4 py-2 rounded-xl text-sm font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <XCircle className="h-4 w-4" />
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
    </div>
  );
}
