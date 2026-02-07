"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import {
  BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area, AreaChart
} from 'recharts';
import {
  TrendingUp, TrendingDown, Users, Calendar, DollarSign, Clock,
  AlertTriangle, Target, Briefcase, UserCheck,
  ChevronDown, ChevronUp, Bell, Filter, X, Check, Activity, Brain
} from 'lucide-react';

type TimeFilter = "weekly" | "monthly" | "yearly";

interface Notification {
  id: string;
  title: string;
  message: string;
  type: string;
  read: boolean;
  createdAt: string;
}

interface DashboardData {
  stats: {
    employees: {
      total: number;
      active: number;
      trend: number;
      byDepartment: Array<{ department: string; count: number }>;
    };
    leaves: {
      today: number;
      pending: number;
      approved: number;
      rejected: number;
      trend: number;
      byType: Array<{ type: string; count: number }>;
      todayDetails: Array<{
        employeeName: string;
        department: string;
        type: string;
        startDate: Date;
        endDate: Date;
      }>;
    };
    payroll: {
      dueCount: number;
      totalAmount: number;
      processed: number;
      pending: number;
      trend: number;
      byDepartment: Array<{ department: string; total: number; count: number }>;
      processingDays: number;
    };
    attendance: {
      today: {
        present: number;
        late: number;
        absent: number;
        total: number;
      };
      pendingCorrections: number;
      trend: Array<{
        date: string;
        present: number;
        absent: number;
        late: number;
      }>;
    };
    performance: {
      avgSelfRating: string;
      avgManagerRating: string;
      avgGoalProgress: string;
      activeReviewCycle: string;
      byDepartment: Array<{ department: string; avgRating: number }>;
      trend: Array<{
        month: string;
        performance: number;
        satisfaction: number;
      }>;
    };
    tasks: {
      total: number;
      pending: number;
      inProgress: number;
      completed: number;
      overdue: number;
      avgProgress: string;
    };
    recruitment: {
      activeJobs: number;
      totalApplications: number;
      totalCandidates: number;
      byStage: Array<{ stage: string; count: number }>;
    };
    remoteWork: {
      pending: number;
      total: number;
    };
  };
  insights: {
    burnoutRisks: Array<{
      id: number;
      name: string;
      department: string;
      riskScore: number;
      riskLevel: string;
      indicators: {
        activeTasks: number;
        lateAttendance: number;
        sickLeaves: number;
      };
    }>;
    skillGaps: Array<{
      skill: string;
      currentCount: number;
      gap: number;
    }>;
    promotionCandidates: Array<{
      id: number;
      name: string;
      department: string;
      jobTitle: string;
      currentRating: number | null;
      avgRecentScore: number;
      managerRating: number;
      consistencyScore: number;
      readiness: string;
    }>;
    hiringForecast: {
      currentEmployees: number;
      hiresThisYear: number;
      avgPerMonth: string;
      projectedYearEnd: number;
      recommendedHires: number;
      focusAreas: string[];
    };
  };
}

export default function Page() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [timeFilter, setTimeFilter] = useState<TimeFilter>("monthly");
  const [expandedCard, setExpandedCard] = useState<string | null>(null);
  const [hiddenCards, setHiddenCards] = useState<Set<string>>(new Set());
  const [showCustomize, setShowCustomize] = useState(false);
  const [notifications, setNotifications] = useState<number>(0);
  const [showNotificationPopup, setShowNotificationPopup] = useState(false);
  const [newNotifications, setNewNotifications] = useState<Notification[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const res = await fetch(`/api/admin/dashboard?filter=${timeFilter}`);
        if (res.ok) {
          const result = await res.json();
          setData(result);
          
          // Fetch new notifications
          const notificationsRes = await fetch('/api/notifications/admin');
          if (notificationsRes.ok) {
            const notificationsData = await notificationsRes.json();
            const unreadNotifications = notificationsData.notifications?.filter((n: Notification) => !n.read) || [];
            setNewNotifications(unreadNotifications);
            if (unreadNotifications.length > 0) {
              setShowNotificationPopup(true);
              // Auto hide after 5 seconds
              setTimeout(() => setShowNotificationPopup(false), 5000);
            }
          }
        }
      } catch (error) {
        console.error("Error fetching dashboard:", error);
      } finally {
        setLoading(false);
      }
    };

    const fetchNotifications = async () => {
      try {
        const res = await fetch("/api/notifications/admin");
        if (res.ok) {
          const result = await res.json();
          setNotifications(result.pendingCount || 0);
        }
      } catch (error) {
        console.error("Error fetching notifications:", error);
      }
    };

    fetchData();
    fetchNotifications();
  }, [timeFilter]);

  const toggleCardVisibility = (cardId: string) => {
    const newHidden = new Set(hiddenCards);
    if (newHidden.has(cardId)) {
      newHidden.delete(cardId);
    } else {
      newHidden.add(cardId);
    }
    setHiddenCards(newHidden);
  };

  const toggleExpand = (cardId: string) => {
    setExpandedCard(expandedCard === cardId ? null : cardId);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  const getTrendIcon = (trend: number) => {
    if (trend > 0) return <TrendingUp className="w-4 h-4 text-green-500" />;
    if (trend < 0) return <TrendingDown className="w-4 h-4 text-red-500" />;
    return <Activity className="w-4 h-4 text-gray-400" />;
  };

  const getTrendColor = (trend: number) => {
    if (trend > 0) return "text-green-600";
    if (trend < 0) return "text-red-600";
    return "text-gray-600";
  };

  const COLORS = {
    primary: ['#8b5cf6', '#7c3aed', '#6d28d9', '#5b21b6'],
    leaves: ['#f97316', '#0ea5e9', '#22c55e', '#a855f7', '#ef4444', '#f59e0b'],
    success: ['#10b981', '#059669', '#047857', '#065f46'],
    warning: ['#f59e0b', '#d97706', '#b45309', '#92400e'],
    danger: ['#ef4444', '#dc2626', '#b91c1c', '#991b1b'],
    info: ['#3b82f6', '#2563eb', '#1d4ed8', '#1e40af']
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-violet-600/20 via-blue-600/20 to-cyan-600/20"></div>
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiM5YzkyYWMiIGZpbGwtb3BhY2l0eT0iMC4wNSI+PHBhdGggZD0iTTM2IDM0djItaDJ2LTJoLTJ6bTAtNHYyaDJ2LTJoLTJ6bTAtNHYyaDJ2LTJoLTJ6bTAtNHYyaDJ2LTJoLTJ6Ii8+PC9nPjwvZz48L3N2Zz4=')] opacity-30"></div>
        <div className="text-center relative z-10">
          <div className="backdrop-blur-2xl bg-white/30 border border-white/40 shadow-2xl rounded-3xl p-8">
            <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-t-4 border-violet-600 mx-auto mb-4"></div>
            <p className="text-slate-700 font-semibold text-lg">Loading Dashboard...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen relative overflow-hidden p-6 flex items-center justify-center">
        <div className="absolute inset-0 bg-gradient-to-br from-violet-600/20 via-blue-600/20 to-cyan-600/20"></div>
        <div className="backdrop-blur-2xl bg-white/40 rounded-3xl border border-white/60 shadow-2xl p-8 text-center relative z-10">
          <div className="text-red-600 text-xl font-semibold mb-2">⚠️ Failed to load dashboard</div>
          <p className="text-slate-700">Please try refreshing the page</p>
          <button 
            onClick={() => window.location.reload()} 
            className="mt-4 px-6 py-2 bg-gradient-to-r from-violet-600 to-blue-600 text-white rounded-xl hover:shadow-lg transition-all duration-300"
          >
            Refresh
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen relative overflow-hidden p-4 md:p-8">
      <div className="absolute inset-0 bg-gradient-to-br from-violet-600/10 via-blue-600/10 to-cyan-600/10"></div>
      <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiM5YzkyYWMiIGZpbGwtb3BhY2l0eT0iMC4wNSI+PHBhdGggZD0iTTM2IDM0djItaDJ2LTJoLTJ6bTAtNHYyaDJ2LTJoLTJ6bTAtNHYyaDJ2LTJoLTJ6bTAtNHYyaDJ2LTJoLTJ6Ii8+PC9nPjwvZz48L3N2Zz4=')] opacity-30"></div>
      <div className="relative z-10">
      {/* Notification Popup */}
      {showNotificationPopup && newNotifications.length > 0 && (
        <div className="fixed top-4 right-4 z-50 max-w-md">
          <div className="backdrop-blur-2xl bg-white/70 rounded-3xl border border-white/50 shadow-2xl p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-gradient-to-br from-violet-600 to-purple-600 rounded-xl shadow-lg">
                  <Bell className="w-5 h-5 text-white" />
                </div>
                <h4 className="font-bold text-slate-900 text-lg">New Notifications</h4>
              </div>
              <button 
                onClick={() => setShowNotificationPopup(false)}
                className="text-slate-500 hover:text-slate-700 p-1 hover:bg-white/50 rounded-lg transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {newNotifications.slice(0, 3).map((notification, idx) => (
                <div key={idx} className="p-3 backdrop-blur-md bg-gradient-to-br from-violet-500/10 to-purple-500/10 rounded-2xl border border-violet-200/50 shadow-lg">
                  <p className="text-sm font-bold text-slate-900">{notification.title}</p>
                  <p className="text-xs text-slate-700 mt-1 font-medium">{notification.message}</p>
                  <p className="text-xs text-violet-600 mt-1 font-semibold">{notification.type}</p>
                </div>
              ))}
              {newNotifications.length > 3 && (
                <p className="text-xs text-center text-slate-600 mt-2 font-semibold">
                  +{newNotifications.length - 3} more notifications
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="mb-6 backdrop-blur-xl bg-white/60 rounded-3xl border border-white/40 shadow-xl p-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-violet-600 via-blue-600 to-cyan-600 bg-clip-text text-transparent">
              Dashboard
            </h1>
            <p className="text-slate-700 mt-1 font-medium">
              Welcome back! Here&apos;s what&apos;s happening at your organization.
            </p>
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            {/* Time Filter */}
            <div className="flex items-center gap-2 backdrop-blur-md bg-white/50 rounded-2xl p-1 border border-white/40 shadow-lg">
              {(["weekly", "monthly", "yearly"] as TimeFilter[]).map((filter) => (
                <button
                  key={filter}
                  onClick={() => setTimeFilter(filter)}
                  className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all duration-300 ${
                    timeFilter === filter
                      ? "bg-gradient-to-r from-violet-600 to-blue-600 text-white shadow-lg"
                      : "text-slate-700 hover:bg-white/60"
                  }`}
                >
                  {filter.charAt(0).toUpperCase() + filter.slice(1)}
                </button>
              ))}
            </div>

            {/* Notification Bell */}
            <Link
              href="/admin/notifications"
              className="relative backdrop-blur-md bg-white/50 p-3 rounded-2xl hover:bg-white/70 transition-all border border-white/40 shadow-lg"
            >
              <Bell className="w-5 h-5 text-slate-700" />
              {notifications > 0 && (
                <span className="absolute -top-1 -right-1 bg-gradient-to-r from-red-500 to-pink-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-bold shadow-lg">
                  {notifications}
                </span>
              )}
            </Link>

            {/* Customize Button */}
            <button
              onClick={() => setShowCustomize(!showCustomize)}
              className="backdrop-blur-md bg-white/50 px-4 py-3 rounded-2xl hover:bg-white/70 transition-all border border-white/40 shadow-lg flex items-center gap-2 text-slate-900 font-medium"
            >
              <Filter className="w-5 h-5" />
              <span className="text-sm">Customize</span>
            </button>
          </div>
        </div>

        {/* Customize Panel */}
        {showCustomize && (
          <div className="mt-4 p-4 backdrop-blur-md bg-white/50 rounded-2xl border border-white/40 shadow-lg">
            <h3 className="font-bold mb-3 text-slate-900">Show/Hide Cards</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {["employees", "leaves", "payroll", "attendance", "performance", "tasks", "recruitment", "insights"].map((card) => (
                <button
                  key={card}
                  onClick={() => toggleCardVisibility(card)}
                  className={`px-3 py-2 rounded-xl text-sm font-semibold transition-all duration-300 ${
                    hiddenCards.has(card)
                      ? "bg-slate-200/70 text-slate-500"
                      : "bg-gradient-to-r from-violet-500/20 to-blue-500/20 text-violet-700 border border-violet-300/50"
                  }`}
                >
                  {hiddenCards.has(card) ? <X className="w-4 h-4 inline mr-1" /> : <Check className="w-4 h-4 inline mr-1" />}
                  {card.charAt(0).toUpperCase() + card.slice(1)}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
        {/* Employees Card */}
        {!hiddenCards.has("employees") && (
          <div className="backdrop-blur-xl bg-gradient-to-br from-violet-500/10 to-purple-500/10 border border-white/40 shadow-xl rounded-3xl p-6 hover:shadow-2xl hover:scale-[1.02] transition-all duration-300 cursor-pointer"
            onClick={() => toggleExpand("employees")}>
            <div className="flex items-start justify-between mb-4">
              <div className="p-3 bg-gradient-to-br from-violet-600 to-purple-600 rounded-2xl shadow-lg">
                <Users className="w-6 h-6 text-white" />
              </div>
              <div className="flex items-center gap-2">
                {getTrendIcon(data.stats.employees.trend)}
                <span className={`text-sm font-medium ${getTrendColor(data.stats.employees.trend)}`}>
                  {Math.abs(data.stats.employees.trend)}%
                </span>
              </div>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-slate-700 font-bold">Total Employees</p>
              <p className="text-4xl font-bold bg-gradient-to-r from-violet-600 to-purple-600 bg-clip-text text-transparent">{data.stats.employees.total}</p>
              <p className="text-xs text-slate-600 font-semibold">{data.stats.employees.active} active</p>
            </div>
            
            {expandedCard === "employees" && (
              <div className="mt-4 pt-4 border-t border-violet-200/50">
                <p className="text-xs font-semibold text-gray-800 mb-2">By Department</p>
                <div className="space-y-2">
                  {data.stats.employees.byDepartment.slice(0, 5).map((dept, idx) => (
                    <div key={idx} className="flex items-center justify-between text-xs">
                      <span className="text-gray-700 font-medium">{dept.department}</span>
                      <span className="font-bold text-gray-900">{dept.count}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            <button className="mt-3 text-violet-600 text-xs font-bold flex items-center gap-1 hover:text-violet-700 transition-colors">
              {expandedCard === "employees" ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              {expandedCard === "employees" ? "Show less" : "Show more"}
            </button>
          </div>
        )}

        {/* Leaves Card */}
        {!hiddenCards.has("leaves") && (
          <div className="backdrop-blur-xl bg-gradient-to-br from-amber-500/10 to-orange-500/10 border border-white/40 shadow-xl rounded-3xl p-6 hover:shadow-2xl hover:scale-[1.02] transition-all duration-300 cursor-pointer"
            onClick={() => toggleExpand("leaves")}>
            <div className="flex items-start justify-between mb-4">
              <div className="p-3 bg-gradient-to-br from-amber-600 to-orange-600 rounded-2xl shadow-lg">
                <Calendar className="w-6 h-6 text-white" />
              </div>
              <div className="flex items-center gap-2">
                {getTrendIcon(data.stats.leaves.trend)}
                <span className={`text-sm font-medium ${getTrendColor(data.stats.leaves.trend)}`}>
                  {Math.abs(data.stats.leaves.trend)}%
                </span>
              </div>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-slate-700 font-bold">Leaves Today</p>
              <p className="text-4xl font-bold bg-gradient-to-r from-amber-600 to-orange-600 bg-clip-text text-transparent">{data.stats.leaves.today}</p>
              <p className="text-xs text-slate-600 font-semibold">{data.stats.leaves.pending} pending approval</p>
            </div>
            
            {expandedCard === "leaves" && (
              <div className="mt-4 pt-4 border-t border-amber-200/50">
                <div className="grid grid-cols-3 gap-2 mb-3">
                  <div className="bg-green-100/50 backdrop-blur-sm rounded-lg p-2">
                    <p className="text-xs text-gray-700 font-medium">Approved</p>
                    <p className="text-lg font-bold text-green-600">{data.stats.leaves.approved}</p>
                  </div>
                  <div className="bg-yellow-100/50 backdrop-blur-sm rounded-lg p-2">
                    <p className="text-xs text-gray-700 font-medium">Pending</p>
                    <p className="text-lg font-bold text-yellow-600">{data.stats.leaves.pending}</p>
                  </div>
                  <div className="bg-red-100/50 backdrop-blur-sm rounded-lg p-2">
                    <p className="text-xs text-gray-700 font-medium">Rejected</p>
                    <p className="text-lg font-bold text-red-600">{data.stats.leaves.rejected}</p>
                  </div>
                </div>
              </div>
            )}
            
            <button className="mt-3 text-amber-600 text-xs font-bold flex items-center gap-1 hover:text-amber-700 transition-colors">
              {expandedCard === "leaves" ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              {expandedCard === "leaves" ? "Show less" : "Show more"}
            </button>
          </div>
        )}

        {/* Payroll Card */}
        {!hiddenCards.has("payroll") && (
          <div className="backdrop-blur-xl bg-gradient-to-br from-emerald-500/10 to-green-500/10 border border-white/40 shadow-xl rounded-3xl p-6 hover:shadow-2xl hover:scale-[1.02] transition-all duration-300 cursor-pointer"
            onClick={() => toggleExpand("payroll")}>
            <div className="flex items-start justify-between mb-4">
              <div className="p-3 bg-gradient-to-br from-emerald-600 to-green-600 rounded-2xl shadow-lg">
                <DollarSign className="w-6 h-6 text-white" />
              </div>
              <div className="flex items-center gap-2">
                {getTrendIcon(data.stats.payroll.trend)}
                <span className={`text-sm font-medium ${getTrendColor(data.stats.payroll.trend)}`}>
                  {Math.abs(data.stats.payroll.trend)}%
                </span>
              </div>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-slate-700 font-bold">Payroll This Month</p>
              <p className="text-4xl font-bold bg-gradient-to-r from-emerald-600 to-green-600 bg-clip-text text-transparent">{formatCurrency(data.stats.payroll.totalAmount)}</p>
              <p className="text-xs text-slate-600 font-semibold">Processing in {data.stats.payroll.processingDays} days</p>
            </div>
            
            {expandedCard === "payroll" && (
              <div className="mt-4 pt-4 border-t border-white/40">
                <div className="grid grid-cols-2 gap-2">
                  <div className="bg-blue-100/50 backdrop-blur-sm rounded-lg p-2">
                    <p className="text-xs text-gray-600">Processed</p>
                    <p className="text-lg font-bold text-blue-600">{data.stats.payroll.processed}</p>
                  </div>
                  <div className="bg-yellow-100/50 backdrop-blur-sm rounded-lg p-2">
                    <p className="text-xs text-gray-600">Pending</p>
                    <p className="text-lg font-bold text-yellow-600">{data.stats.payroll.pending}</p>
                  </div>
                </div>
              </div>
            )}
            
            <button className="mt-3 text-emerald-600 text-xs font-bold flex items-center gap-1 hover:text-emerald-700 transition-colors">
              {expandedCard === "payroll" ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              {expandedCard === "payroll" ? "Show less" : "Show more"}
            </button>
          </div>
        )}

        {/* Attendance Card */}
        {!hiddenCards.has("attendance") && (
          <div className="backdrop-blur-xl bg-gradient-to-br from-cyan-500/10 to-blue-500/10 border border-white/40 shadow-xl rounded-3xl p-6 hover:shadow-2xl hover:scale-[1.02] transition-all duration-300 cursor-pointer"
            onClick={() => toggleExpand("attendance")}>
            <div className="flex items-start justify-between mb-4">
              <div className="p-3 bg-gradient-to-br from-cyan-600 to-blue-600 rounded-2xl shadow-lg">
                <Clock className="w-6 h-6 text-white" />
              </div>
              <div className="flex items-center gap-1">
                <UserCheck className="w-4 h-4 text-green-600" />
                <span className="text-sm font-medium text-green-600">
                  {data.stats.attendance.today.total > 0 
                    ? Math.round((data.stats.attendance.today.present / data.stats.attendance.today.total) * 100)
                    : 0}%
                </span>
              </div>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-slate-700 font-bold">Present Today</p>
              <p className="text-4xl font-bold bg-gradient-to-r from-cyan-600 to-blue-600 bg-clip-text text-transparent">{data.stats.attendance.today.present}</p>
              <p className="text-xs text-slate-600 font-semibold">{data.stats.attendance.today.late} late, {data.stats.attendance.today.absent} absent</p>
            </div>
            
            {expandedCard === "attendance" && (
              <div className="mt-4 pt-4 border-t border-white/40">
                <div className="grid grid-cols-3 gap-2">
                  <div className="bg-green-100/50 backdrop-blur-sm rounded-lg p-2">
                    <p className="text-xs text-gray-600">Present</p>
                    <p className="text-lg font-bold text-green-600">{data.stats.attendance.today.present}</p>
                  </div>
                  <div className="bg-yellow-100/50 backdrop-blur-sm rounded-lg p-2">
                    <p className="text-xs text-gray-600">Late</p>
                    <p className="text-lg font-bold text-yellow-600">{data.stats.attendance.today.late}</p>
                  </div>
                  <div className="bg-red-100/50 backdrop-blur-sm rounded-lg p-2">
                    <p className="text-xs text-gray-600">Absent</p>
                    <p className="text-lg font-bold text-red-600">{data.stats.attendance.today.absent}</p>
                  </div>
                </div>
              </div>
            )}
            
            <button className="mt-3 text-cyan-600 text-xs font-bold flex items-center gap-1 hover:text-cyan-700 transition-colors">
              {expandedCard === "attendance" ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              {expandedCard === "attendance" ? "Show less" : "Show more"}
            </button>
          </div>
        )}
      </div>

      {/* Quick Actions */}
      <div className="backdrop-blur-xl bg-white/60 rounded-3xl border border-white/40 shadow-xl p-6 mb-6">
        <h3 className="font-bold text-slate-900 text-xl mb-4">Quick Actions</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Link href="/admin/employees" className="backdrop-blur-md bg-white/50 hover:bg-white/70 hover:scale-105 rounded-2xl p-4 text-center transition-all duration-300 border border-white/40 shadow-lg">
            <Users className="w-6 h-6 text-violet-600 mx-auto mb-2" />
            <p className="text-sm font-bold text-slate-900">Manage Employees</p>
          </Link>
          <Link href="/admin/leave" className="backdrop-blur-md bg-white/50 hover:bg-white/70 hover:scale-105 rounded-2xl p-4 text-center transition-all duration-300 border border-white/40 shadow-lg">
            <Calendar className="w-6 h-6 text-amber-600 mx-auto mb-2" />
            <p className="text-sm font-bold text-slate-900">Leave Requests</p>
          </Link>
          <Link href="/admin/payroll" className="backdrop-blur-md bg-white/50 hover:bg-white/70 hover:scale-105 rounded-2xl p-4 text-center transition-all duration-300 border border-white/40 shadow-lg">
            <DollarSign className="w-6 h-6 text-emerald-600 mx-auto mb-2" />
            <p className="text-sm font-bold text-slate-900">Process Payroll</p>
          </Link>
          <Link href="/admin/recruitment" className="backdrop-blur-md bg-white/50 hover:bg-white/70 hover:scale-105 rounded-2xl p-4 text-center transition-all duration-300 border border-white/40 shadow-lg">
            <Briefcase className="w-6 h-6 text-cyan-600 mx-auto mb-2" />
            <p className="text-sm font-bold text-slate-900">Recruitment</p>
          </Link>
        </div>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Tasks Overview - Moved to first position */}
        {!hiddenCards.has("tasks") && (
          <div className="backdrop-blur-xl bg-white/60 rounded-3xl border border-white/40 shadow-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-bold text-slate-900 text-xl">Tasks Overview</h3>
                <p className="text-sm text-slate-600 font-medium">All tasks status</p>
              </div>
              <div className="p-2 bg-gradient-to-br from-blue-600 to-cyan-600 rounded-xl shadow-lg">
                <Briefcase className="w-6 h-6 text-white" />
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div className="backdrop-blur-md bg-gradient-to-br from-blue-500/20 to-cyan-500/20 rounded-2xl p-4 border border-white/40 shadow-lg">
                <p className="text-sm text-slate-700 font-bold">Total Tasks</p>
                <p className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent">{data.stats.tasks.total}</p>
              </div>
              <div className="backdrop-blur-md bg-gradient-to-br from-red-500/20 to-pink-500/20 rounded-2xl p-4 border border-white/40 shadow-lg">
                <p className="text-sm text-slate-700 font-bold">Overdue</p>
                <p className="text-3xl font-bold bg-gradient-to-r from-red-600 to-pink-600 bg-clip-text text-transparent">{data.stats.tasks.overdue}</p>
              </div>
            </div>

            <ResponsiveContainer width="100%" height={180}>
              <PieChart>
                <Pie
                  data={[
                    { name: 'Completed', value: data.stats.tasks.completed },
                    { name: 'In Progress', value: data.stats.tasks.inProgress },
                    { name: 'Pending', value: data.stats.tasks.pending }
                  ]}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={70}
                  fill="#8884d8"
                  paddingAngle={5}
                  dataKey="value"
                  label={(props: { index: number }) => {
                    const taskData = [
                      { name: 'Completed', value: data.stats.tasks.completed },
                      { name: 'In Progress', value: data.stats.tasks.inProgress },
                      { name: 'Pending', value: data.stats.tasks.pending }
                    ];
                    const item = taskData[props.index];
                    return item.value > 0 ? `${item.name}: ${item.value}` : '';
                  }}
                >
                  <Cell fill="#10b981" />
                  <Cell fill="#3b82f6" />
                  <Cell fill="#f59e0b" />
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'rgba(255, 255, 255, 0.95)',
                    backdropFilter: 'blur(10px)',
                    border: '1px solid rgba(255, 255, 255, 0.6)',
                    borderRadius: '12px'
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
            
            <div className="mt-4 text-center">
              <p className="text-sm text-gray-600">Average Progress</p>
              <p className="text-xl font-bold text-purple-600">{data.stats.tasks.avgProgress}%</p>
            </div>
          </div>
        )}

        {/* Attendance Trend (7 days) */}
        {!hiddenCards.has("attendance") && data.stats.attendance.trend.length > 0 && (
          <div className="backdrop-blur-xl bg-white/60 rounded-3xl border border-white/40 shadow-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-bold text-slate-900 text-xl">Attendance Trend</h3>
                <p className="text-sm text-slate-600 font-medium">Last 7 days</p>
              </div>
              <div className="p-2 bg-gradient-to-br from-cyan-600 to-blue-600 rounded-xl shadow-lg">
                <Activity className="w-6 h-6 text-white" />
              </div>
            </div>
            <ResponsiveContainer width="100%" height={250}>
              <AreaChart data={data.stats.attendance.trend}>
                <defs>
                  <linearGradient id="colorPresent" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorAbsent" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#ef4444" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="date" stroke="#6b7280" style={{ fontSize: '12px' }} />
                <YAxis stroke="#6b7280" style={{ fontSize: '12px' }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'rgba(255, 255, 255, 0.95)',
                    backdropFilter: 'blur(10px)',
                    border: '1px solid rgba(255, 255, 255, 0.6)',
                    borderRadius: '12px'
                  }}
                />
                <Area type="monotone" dataKey="present" stroke="#10b981" fillOpacity={1} fill="url(#colorPresent)" />
                <Area type="monotone" dataKey="absent" stroke="#ef4444" fillOpacity={1} fill="url(#colorAbsent)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Employees by Department */}
        {!hiddenCards.has("employees") && data.stats.employees.byDepartment.length > 0 && (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-bold text-gray-900 text-lg">Employees by Department</h3>
                <p className="text-xs text-gray-600">Distribution across departments</p>
              </div>
              <Users className="w-6 h-6 text-purple-600" />
            </div>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={data.stats.employees.byDepartment}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="department" stroke="#6b7280" style={{ fontSize: '11px' }} angle={-15} textAnchor="end" height={80} />
                <YAxis stroke="#6b7280" style={{ fontSize: '12px' }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'rgba(255, 255, 255, 0.95)',
                    backdropFilter: 'blur(10px)',
                    border: '1px solid rgba(255, 255, 255, 0.6)',
                    borderRadius: '12px'
                  }}
                />
                <Bar dataKey="count" fill="#8b5cf6" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Leave Types Distribution */}
        {!hiddenCards.has("leaves") && data.stats.leaves.byType.length > 0 && (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-bold text-gray-900 text-lg">Leave Types Distribution</h3>
                <p className="text-xs text-gray-600">Current period breakdown</p>
              </div>
              <Calendar className="w-6 h-6 text-orange-600" />
            </div>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={data.stats.leaves.byType}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={(props: { index: number }) => {
                    const item = data.stats.leaves.byType[props.index];
                    return `${item.type}: ${item.count}`;
                  }}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="count"
                >
                  {data.stats.leaves.byType.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS.leaves[index % COLORS.leaves.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'rgba(255, 255, 255, 0.95)',
                    backdropFilter: 'blur(10px)',
                    border: '1px solid rgba(255, 255, 255, 0.6)',
                    borderRadius: '12px'
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* Recruitment Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Recruitment Stats */}
        {!hiddenCards.has("recruitment") && (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-bold text-gray-900 text-lg">Recruitment Pipeline</h3>
                <p className="text-xs text-gray-600">Current hiring status</p>
              </div>
              <Briefcase className="w-6 h-6 text-green-600" />
            </div>
            
            <div className="grid grid-cols-3 gap-3 mb-4">
              <div className="bg-gradient-to-br from-green-100/50 to-green-200/50 backdrop-blur-sm rounded-xl p-3 text-center">
                <p className="text-xs text-gray-600">Active Jobs</p>
                <p className="text-2xl font-bold text-green-600">{data.stats.recruitment.activeJobs}</p>
              </div>
              <div className="bg-gradient-to-br from-blue-100/50 to-blue-200/50 backdrop-blur-sm rounded-xl p-3 text-center">
                <p className="text-xs text-gray-600">Applications</p>
                <p className="text-2xl font-bold text-blue-600">{data.stats.recruitment.totalApplications}</p>
              </div>
              <div className="bg-gradient-to-br from-purple-100/50 to-purple-200/50 backdrop-blur-sm rounded-xl p-3 text-center">
                <p className="text-xs text-gray-600">Candidates</p>
                <p className="text-2xl font-bold text-purple-600">{data.stats.recruitment.totalCandidates}</p>
              </div>
            </div>

            {data.stats.recruitment.byStage.length > 0 && (
              <div className="space-y-3">
                <p className="text-sm font-semibold text-gray-700">By Stage</p>
                {data.stats.recruitment.byStage.map((stage, idx) => (
                  <div key={idx} className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">{stage.stage}</span>
                    <div className="flex items-center gap-2">
                      <div className="w-32 h-2 bg-gray-200 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-green-500 to-green-600"
                          style={{
                            width: `${data.stats.recruitment.totalApplications > 0 ? (stage.count / data.stats.recruitment.totalApplications) * 100 : 0}%`
                          }}
                        />
                      </div>
                      <span className="text-sm font-bold text-gray-900 w-8">{stage.count}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* AI Insights Section */}
      {!hiddenCards.has("insights") && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 mb-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-3 bg-purple-600 rounded-xl">
              <Brain className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-900">AI Insights & Predictions</h2>
              <p className="text-sm text-gray-600">Smart recommendations based on data analysis</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Burnout Risks */}
            <div className="backdrop-blur-md bg-white/50 rounded-xl p-5 border border-white/60">
              <div className="flex items-center gap-2 mb-4">
                <AlertTriangle className="w-5 h-5 text-red-600" />
                <h3 className="font-bold text-gray-900">Burnout Risk Alerts</h3>
              </div>
              {data.insights.burnoutRisks.length > 0 ? (
                <div className="space-y-3">
                  {data.insights.burnoutRisks.map((risk, idx) => (
                    <div key={idx} className={`p-3 rounded-lg border-l-4 ${
                      risk.riskLevel === 'high' ? 'bg-red-50 border-red-500' :
                      risk.riskLevel === 'medium' ? 'bg-yellow-50 border-yellow-500' :
                      'bg-blue-50 border-blue-500'
                    }`}>
                      <p className="font-semibold text-sm text-gray-900">{risk.name}</p>
                      <p className="text-xs text-gray-600">{risk.department} • {risk.riskLevel.toUpperCase()}</p>
                      <div className="flex gap-3 mt-2 text-xs">
                        <span className="text-gray-600">📋 {risk.indicators.activeTasks} tasks</span>
                        <span className="text-gray-600">⏰ {risk.indicators.lateAttendance} late</span>
                        <span className="text-gray-600">🤒 {risk.indicators.sickLeaves} sick leaves</span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-500 text-center py-4">No high-risk employees detected</p>
              )}
            </div>

            {/* Skill Gaps */}
            <div className="backdrop-blur-md bg-white/50 rounded-xl p-5 border border-white/60">
              <div className="flex items-center gap-2 mb-4">
                <Target className="w-5 h-5 text-orange-600" />
                <h3 className="font-bold text-gray-900">Critical Skill Gaps</h3>
              </div>
              {data.insights.skillGaps.length > 0 ? (
                <div className="space-y-3">
                  {data.insights.skillGaps.map((gap, idx) => (
                    <div key={idx} className="p-3 bg-orange-50 rounded-lg border-l-4 border-orange-500">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-semibold text-sm text-gray-900">{gap.skill}</p>
                          <p className="text-xs text-gray-600 mt-1">
                            Current: {gap.currentCount} employees • Gap: {gap.gap} needed
                          </p>
                        </div>
                        <span className="px-2 py-1 bg-orange-200 text-orange-800 rounded-full text-xs font-bold">
                          -{gap.gap}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-500 text-center py-4">No critical skill gaps identified</p>
              )}
            </div>

            {/* Hiring Forecast */}
            <div className="backdrop-blur-md bg-white/50 rounded-xl p-5 border border-white/60">
              <div className="flex items-center gap-2 mb-4">
                <Users className="w-5 h-5 text-blue-600" />
                <h3 className="font-bold text-gray-900">Hiring Forecast</h3>
              </div>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-blue-100/50 backdrop-blur-sm rounded-lg p-3">
                    <p className="text-xs text-gray-600">Current Size</p>
                    <p className="text-xl font-bold text-blue-600">{data.insights.hiringForecast.currentEmployees}</p>
                  </div>
                  <div className="bg-purple-100/50 backdrop-blur-sm rounded-lg p-3">
                    <p className="text-xs text-gray-600">Projected YE</p>
                    <p className="text-xl font-bold text-purple-600">{data.insights.hiringForecast.projectedYearEnd}</p>
                  </div>
                </div>
                
                <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg p-3">
                  <p className="text-xs text-gray-600 mb-1">Hiring Velocity</p>
                  <p className="text-lg font-bold text-blue-600">{data.insights.hiringForecast.avgPerMonth} hires/month</p>
                  <p className="text-xs text-gray-500 mt-1">{data.insights.hiringForecast.hiresThisYear} hires this year</p>
                </div>

                <div className="bg-orange-50 rounded-lg p-3 border border-orange-200">
                  <p className="text-xs font-semibold text-gray-700 mb-2">📊 Recommendation</p>
                  <p className="text-sm text-gray-900">
                    Consider hiring <span className="font-bold text-orange-600">{data.insights.hiringForecast.recommendedHires}</span> employees
                  </p>
                  {data.insights.hiringForecast.focusAreas.length > 0 && (
                    <p className="text-xs text-gray-600 mt-2">
                      Focus: {data.insights.hiringForecast.focusAreas.join(', ')}
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
      </div>
    </div>
  );
}


