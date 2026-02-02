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
    success: ['#10b981', '#059669', '#047857', '#065f46'],
    warning: ['#f59e0b', '#d97706', '#b45309', '#92400e'],
    danger: ['#ef4444', '#dc2626', '#b91c1c', '#991b1b'],
    info: ['#3b82f6', '#2563eb', '#1d4ed8', '#1e40af']
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-pink-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-purple-600 mx-auto mb-4"></div>
          <p className="text-gray-600 font-medium">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-pink-50 p-6 flex items-center justify-center">
        <div className="backdrop-blur-xl bg-white/40 rounded-2xl border border-white/60 shadow-xl p-8 text-center">
          <div className="text-red-600 text-xl font-semibold mb-2">⚠️ Failed to load dashboard</div>
          <p className="text-gray-600">Please try refreshing the page</p>
          <button 
            onClick={() => window.location.reload()} 
            className="mt-4 px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
          >
            Refresh
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8 relative">
      {/* Notification Popup */}
      {showNotificationPopup && newNotifications.length > 0 && (
        <div className="fixed top-4 right-4 z-50 max-w-md">
          <div className="backdrop-blur-xl bg-white/95 rounded-2xl border border-white/60 shadow-2xl p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Bell className="w-5 h-5 text-purple-600" />
                <h4 className="font-bold text-gray-900">New Notifications</h4>
              </div>
              <button 
                onClick={() => setShowNotificationPopup(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {newNotifications.slice(0, 3).map((notification, idx) => (
                <div key={idx} className="p-3 bg-purple-50 rounded-lg border border-purple-200">
                  <p className="text-sm font-semibold text-gray-900">{notification.title}</p>
                  <p className="text-xs text-gray-600 mt-1">{notification.message}</p>
                  <p className="text-xs text-purple-600 mt-1">{notification.type}</p>
                </div>
              ))}
              {newNotifications.length > 3 && (
                <p className="text-xs text-center text-gray-500 mt-2">
                  +{newNotifications.length - 3} more notifications
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="mb-6 bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
              Dashboard
            </h1>
            <p className="text-gray-600 mt-1">
              Welcome back! Here&apos;s what&apos;s happening at your organization.
            </p>
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            {/* Time Filter */}
            <div className="flex items-center gap-2 bg-slate-100 rounded-xl p-1 border border-slate-200">
              {(["weekly", "monthly", "yearly"] as TimeFilter[]).map((filter) => (
                <button
                  key={filter}
                  onClick={() => setTimeFilter(filter)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                    timeFilter === filter
                      ? "bg-purple-600 text-white shadow"
                      : "text-gray-700 hover:bg-white"
                  }`}
                >
                  {filter.charAt(0).toUpperCase() + filter.slice(1)}
                </button>
              ))}
            </div>

            {/* Notification Bell */}
            <Link
              href="/admin/notifications"
              className="relative bg-white p-3 rounded-xl hover:bg-slate-50 transition-all border border-slate-200"
            >
              <Bell className="w-5 h-5 text-gray-700" />
              {notifications > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-bold">
                  {notifications}
                </span>
              )}
            </Link>

            {/* Customize Button */}
            <button
              onClick={() => setShowCustomize(!showCustomize)}
              className="bg-white px-4 py-3 rounded-xl hover:bg-slate-50 transition-all border border-slate-200 flex items-center gap-2 text-gray-900"
            >
              <Filter className="w-5 h-5" />
              <span className="text-sm font-medium">Customize</span>
            </button>
          </div>
        </div>

        {/* Customize Panel */}
        {showCustomize && (
          <div className="mt-4 p-4 bg-white rounded-xl border border-slate-200 shadow-sm">
            <h3 className="font-semibold mb-3 text-gray-800">Show/Hide Cards</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {["employees", "leaves", "payroll", "attendance", "performance", "tasks", "recruitment", "insights"].map((card) => (
                <button
                  key={card}
                  onClick={() => toggleCardVisibility(card)}
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                    hiddenCards.has(card)
                      ? "bg-gray-200 text-gray-500"
                      : "bg-purple-100 text-purple-700"
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
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 hover:shadow-md transition-all cursor-pointer"
            onClick={() => toggleExpand("employees")}>
            <div className="flex items-start justify-between mb-4">
              <div className="p-3 bg-purple-50 rounded-xl">
                <Users className="w-6 h-6 text-purple-600" />
              </div>
              <div className="flex items-center gap-2">
                {getTrendIcon(data.stats.employees.trend)}
                <span className={`text-sm font-medium ${getTrendColor(data.stats.employees.trend)}`}>
                  {Math.abs(data.stats.employees.trend)}%
                </span>
              </div>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-gray-800 font-semibold">Total Employees</p>
              <p className="text-3xl font-bold text-gray-900">{data.stats.employees.total}</p>
              <p className="text-xs text-gray-700 font-medium">{data.stats.employees.active} active</p>
            </div>
            
            {expandedCard === "employees" && (
              <div className="mt-4 pt-4 border-t border-white/40">
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
            
            <button className="mt-3 text-purple-600 text-xs font-medium flex items-center gap-1">
              {expandedCard === "employees" ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              {expandedCard === "employees" ? "Show less" : "Show more"}
            </button>
          </div>
        )}

        {/* Leaves Card */}
        {!hiddenCards.has("leaves") && (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 hover:shadow-md transition-all cursor-pointer"
            onClick={() => toggleExpand("leaves")}>
            <div className="flex items-start justify-between mb-4">
              <div className="p-3 bg-orange-50 rounded-xl">
                <Calendar className="w-6 h-6 text-orange-600" />
              </div>
              <div className="flex items-center gap-2">
                {getTrendIcon(data.stats.leaves.trend)}
                <span className={`text-sm font-medium ${getTrendColor(data.stats.leaves.trend)}`}>
                  {Math.abs(data.stats.leaves.trend)}%
                </span>
              </div>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-gray-800 font-semibold">Leaves Today</p>
              <p className="text-3xl font-bold text-gray-900">{data.stats.leaves.today}</p>
              <p className="text-xs text-gray-700 font-medium">{data.stats.leaves.pending} pending approval</p>
            </div>
            
            {expandedCard === "leaves" && (
              <div className="mt-4 pt-4 border-t border-white/40">
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
            
            <button className="mt-3 text-orange-600 text-xs font-medium flex items-center gap-1">
              {expandedCard === "leaves" ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              {expandedCard === "leaves" ? "Show less" : "Show more"}
            </button>
          </div>
        )}

        {/* Payroll Card */}
        {!hiddenCards.has("payroll") && (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 hover:shadow-md transition-all cursor-pointer"
            onClick={() => toggleExpand("payroll")}>
            <div className="flex items-start justify-between mb-4">
              <div className="p-3 bg-green-50 rounded-xl">
                <DollarSign className="w-6 h-6 text-green-600" />
              </div>
              <div className="flex items-center gap-2">
                {getTrendIcon(data.stats.payroll.trend)}
                <span className={`text-sm font-medium ${getTrendColor(data.stats.payroll.trend)}`}>
                  {Math.abs(data.stats.payroll.trend)}%
                </span>
              </div>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-gray-600 font-medium">Payroll This Month</p>
              <p className="text-3xl font-bold text-gray-900">{formatCurrency(data.stats.payroll.totalAmount)}</p>
              <p className="text-xs text-gray-500">Processing in {data.stats.payroll.processingDays} days</p>
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
            
            <button className="mt-3 text-green-600 text-xs font-medium flex items-center gap-1">
              {expandedCard === "payroll" ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              {expandedCard === "payroll" ? "Show less" : "Show more"}
            </button>
          </div>
        )}

        {/* Attendance Card */}
        {!hiddenCards.has("attendance") && (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 hover:shadow-md transition-all cursor-pointer"
            onClick={() => toggleExpand("attendance")}>
            <div className="flex items-start justify-between mb-4">
              <div className="p-3 bg-blue-50 rounded-xl">
                <Clock className="w-6 h-6 text-blue-600" />
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
              <p className="text-sm text-gray-800 font-semibold">Present Today</p>
              <p className="text-3xl font-bold text-gray-900">{data.stats.attendance.today.present}</p>
              <p className="text-xs text-gray-700 font-medium">{data.stats.attendance.today.late} late, {data.stats.attendance.today.absent} absent</p>
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
            
            <button className="mt-3 text-blue-600 text-xs font-medium flex items-center gap-1">
              {expandedCard === "attendance" ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              {expandedCard === "attendance" ? "Show less" : "Show more"}
            </button>
          </div>
        )}
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 mb-6">
        <h3 className="font-bold text-gray-900 text-lg mb-4">Quick Actions</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Link href="/admin/employees" className="bg-slate-50 hover:bg-slate-100 rounded-xl p-4 text-center transition-all border border-slate-200">
            <Users className="w-6 h-6 text-purple-600 mx-auto mb-2" />
            <p className="text-sm font-medium text-gray-900">Manage Employees</p>
          </Link>
          <Link href="/admin/leave" className="bg-slate-50 hover:bg-slate-100 rounded-xl p-4 text-center transition-all border border-slate-200">
            <Calendar className="w-6 h-6 text-orange-600 mx-auto mb-2" />
            <p className="text-sm font-medium text-gray-900">Leave Requests</p>
          </Link>
          <Link href="/admin/payroll" className="bg-slate-50 hover:bg-slate-100 rounded-xl p-4 text-center transition-all border border-slate-200">
            <DollarSign className="w-6 h-6 text-green-600 mx-auto mb-2" />
            <p className="text-sm font-medium text-gray-900">Process Payroll</p>
          </Link>
          <Link href="/admin/recruitment" className="bg-slate-50 hover:bg-slate-100 rounded-xl p-4 text-center transition-all border border-slate-200">
            <Briefcase className="w-6 h-6 text-blue-600 mx-auto mb-2" />
            <p className="text-sm font-medium text-gray-900">Recruitment</p>
          </Link>
        </div>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Tasks Overview - Moved to first position */}
        {!hiddenCards.has("tasks") && (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-bold text-gray-900 text-lg">Tasks Overview</h3>
                <p className="text-xs text-gray-600">All tasks status</p>
              </div>
              <Briefcase className="w-6 h-6 text-blue-600" />
            </div>
            
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
                <p className="text-sm text-gray-700">Total Tasks</p>
                <p className="text-2xl font-bold text-blue-600">{data.stats.tasks.total}</p>
              </div>
              <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
                <p className="text-sm text-gray-700">Overdue</p>
                <p className="text-2xl font-bold text-red-600">{data.stats.tasks.overdue}</p>
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
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-bold text-gray-900 text-lg">Attendance Trend</h3>
                <p className="text-xs text-gray-600">Last 7 days</p>
              </div>
              <Activity className="w-6 h-6 text-blue-600" />
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
                    <Cell key={`cell-${index}`} fill={COLORS.primary[index % COLORS.primary.length]} />
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
  );
}


