"use client";

import { useMemo, useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useEmployeeNotifications } from "@/hooks/useEmployeeNotifications";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";

// Types for dashboard data
interface DashboardStats {
  totalTasks: number;
  completedTasks: number;
  pendingTasks: number;
  inProgressTasks: number;
  leavesTaken: number;
  leavesApproved: number;
  leavesPending: number;
  performanceScore: number;
}

interface AttendanceStats {
  totalDays: number;
  presentDays: number;
  halfDayDays: number;
  absentDays: number;
  attendanceRate: number;
}

interface AttendanceTrend {
  month: string;
  date: string;
  present: number;
  halfDay: number;
  absent: number;
}

interface TaskTrend {
  month: string;
  completed: number;
  total: number;
}

interface LeaveTrend {
  month: string;
  leaves: number;
}

interface PerformanceTrend {
  month: string;
  score: number;
}

interface PieChartData {
  name: string;
  value: number;
  color: string;
}

interface EmployeeInfo {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  department: string;
  jobTitle: string;
}

export default function DashboardPage() {
  const { data: session } = useSession();
  const { notifications, unreadCount, markAsRead, loading: notificationsLoading } = useEmployeeNotifications(60000);
  
  const [employee, setEmployee] = useState<EmployeeInfo | null>(null);
  const [stats, setStats] = useState<DashboardStats>({
    totalTasks: 0,
    completedTasks: 0,
    pendingTasks: 0,
    inProgressTasks: 0,
    leavesTaken: 0,
    leavesApproved: 0,
    leavesPending: 0,
    performanceScore: 0,
  });
  const [attendanceStats, setAttendanceStats] = useState<AttendanceStats>({
    totalDays: 0,
    presentDays: 0,
    halfDayDays: 0,
    absentDays: 0,
    attendanceRate: 0,
  });
  
  const [taskTrend, setTaskTrend] = useState<TaskTrend[]>([]);
  const [leaveTrend, setLeaveTrend] = useState<LeaveTrend[]>([]);
  const [performanceTrend, setPerformanceTrend] = useState<PerformanceTrend[]>([]);
  const [attendanceTrend, setAttendanceTrend] = useState<AttendanceTrend[]>([]);
  const [tasksByStatus, setTasksByStatus] = useState<PieChartData[]>([]);
  const [tasksByPriority, setTasksByPriority] = useState<PieChartData[]>([]);
  const [attendanceByStatus, setAttendanceByStatus] = useState<PieChartData[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPeriod, setSelectedPeriod] = useState<"3m" | "6m" | "1y">("6m");

  const latest = useMemo(() => notifications.slice(0, 4), [notifications]);

  // Fetch dashboard data
  const fetchDashboardData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/employee/dashboard");
      
      if (!res.ok) {
        console.error("Dashboard API error:", res.status);
        return;
      }

      const data = await res.json();
      
      if (data.success) {
        setEmployee(data.employee);
        setStats(data.stats);
        setTaskTrend(data.taskTrend || []);
        setLeaveTrend(data.leaveTrend || []);
        setPerformanceTrend(data.performanceTrend || []);
        setTasksByStatus(data.tasksByStatus || []);
        setTasksByPriority(data.tasksByPriority || []);
        // Attendance data
        setAttendanceStats(data.attendanceStats || {
          totalDays: 0,
          presentDays: 0,
          halfDayDays: 0,
          absentDays: 0,
          attendanceRate: 0,
        });
        setAttendanceTrend(data.attendanceTrend || []);
        setAttendanceByStatus(data.attendanceByStatus || []);
      }
    } catch (error) {
      console.error("Error fetching dashboard data:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (session?.user) {
      fetchDashboardData();
    }
  }, [session?.user, fetchDashboardData]);

  return (
    <div className="w-full space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-semibold text-gray-900 truncate">
            Dashboard
          </h1>
          <p className="mt-1 sm:mt-2 text-xs sm:text-sm text-gray-600">
            Welcome back, {employee ? `${employee.firstName} ${employee.lastName}` : session?.user?.name || "Employee"}
          </p>
        </div>
        
        {/* Period Filter */}
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-500">Period:</span>
          <select 
            value={selectedPeriod}
            onChange={(e) => setSelectedPeriod(e.target.value as "3m" | "6m" | "1y")}
            className="bg-white/60 backdrop-blur-sm border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 shadow-sm"
          >
            <option value="3m">3 Months</option>
            <option value="6m">6 Months</option>
            <option value="1y">1 Year</option>
          </select>
        </div>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 lg:gap-6">
        <div className="bg-white/70 backdrop-blur-md border border-white/40 rounded-2xl shadow-lg p-4 lg:p-6 hover:shadow-xl transition-all hover:scale-[1.02]">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Tasks</p>
              <p className="text-2xl font-bold text-gray-900">{loading ? "..." : stats.totalTasks}</p>
              {!loading && stats.inProgressTasks > 0 && (
                <p className="text-xs text-blue-600">{stats.inProgressTasks} in progress</p>
              )}
            </div>
            <div className="p-3 bg-gradient-to-br from-blue-400 to-blue-600 rounded-xl shadow-lg">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
          </div>
        </div>

        <div className="bg-white/70 backdrop-blur-md border border-white/40 rounded-2xl shadow-lg p-4 lg:p-6 hover:shadow-xl transition-all hover:scale-[1.02]">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Completed Tasks</p>
              <p className="text-2xl font-bold text-gray-900">{loading ? "..." : stats.completedTasks}</p>
              {!loading && stats.totalTasks > 0 && (
                <p className="text-xs text-green-600">
                  {Math.round((stats.completedTasks / stats.totalTasks) * 100)}% completion
                </p>
              )}
            </div>
            <div className="p-3 bg-gradient-to-br from-green-400 to-green-600 rounded-xl shadow-lg">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
          </div>
        </div>

        <div className="bg-white/70 backdrop-blur-md border border-white/40 rounded-2xl shadow-lg p-4 lg:p-6 hover:shadow-xl transition-all hover:scale-[1.02]">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Leaves Taken</p>
              <p className="text-2xl font-bold text-gray-900">{loading ? "..." : stats.leavesTaken}</p>
              <p className="text-xs text-gray-500">days this year</p>
            </div>
            <div className="p-3 bg-gradient-to-br from-orange-400 to-orange-600 rounded-xl shadow-lg">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
          </div>
        </div>

        <div className="bg-white/70 backdrop-blur-md border border-white/40 rounded-2xl shadow-lg p-4 lg:p-6 hover:shadow-xl transition-all hover:scale-[1.02]">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Performance Score</p>
              <p className="text-2xl font-bold text-gray-900">{loading ? "..." : stats.performanceScore.toFixed(1)}</p>
              <p className="text-xs text-purple-600">out of 10</p>
            </div>
            <div className="p-3 bg-gradient-to-br from-purple-400 to-purple-600 rounded-xl shadow-lg">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
              </svg>
            </div>
          </div>
        </div>

        <div className="bg-white/70 backdrop-blur-md border border-white/40 rounded-2xl shadow-lg p-4 lg:p-6 hover:shadow-xl transition-all hover:scale-[1.02]">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Attendance Rate</p>
              <p className="text-2xl font-bold text-gray-900">{loading ? "..." : `${attendanceStats.attendanceRate.toFixed(1)}%`}</p>
              <p className="text-xs text-teal-600">{attendanceStats.presentDays} present / {attendanceStats.halfDayDays} half day</p>
            </div>
            <div className="p-3 bg-gradient-to-br from-teal-400 to-teal-600 rounded-xl shadow-lg">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 lg:gap-6">
        {/* Charts Section */}
        <div className="xl:col-span-2 space-y-6">
          {/* Attendance Section */}
          <div className="bg-white/70 backdrop-blur-md border border-white/40 rounded-2xl shadow-lg p-4 lg:p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Attendance Overview</h3>
              <a href="/employee/attendance" className="text-sm text-teal-600 hover:text-teal-700 font-medium">View All →</a>
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Attendance Trend Chart */}
              <div>
                <h4 className="text-sm font-medium text-gray-600 mb-3">Current Month Daily Attendance</h4>
                <div className="h-52">
                  {loading ? (
                    <div className="h-full flex items-center justify-center text-gray-500">Loading...</div>
                  ) : attendanceTrend.length === 0 ? (
                    <div className="h-full flex items-center justify-center text-gray-500">No attendance data</div>
                  ) : (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={attendanceTrend}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                        <XAxis dataKey="date" stroke="#64748b" fontSize={12} />
                        <YAxis stroke="#64748b" fontSize={12} allowDecimals={false} />
                        <Tooltip 
                          contentStyle={{
                            backgroundColor: "rgba(255, 255, 255, 0.95)",
                            backdropFilter: "blur(10px)",
                            border: "none",
                            borderRadius: "8px",
                            boxShadow: "0 4px 20px rgba(0, 0, 0, 0.1)"
                          }}
                        />
                        <Legend />
                        <Bar dataKey="present" name="Present" fill="#22c55e" radius={[4, 4, 0, 0]} />
                        <Bar dataKey="halfDay" name="Half Day" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                        <Bar dataKey="absent" name="Absent" fill="#ef4444" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </div>
              </div>

              {/* Attendance by Status Pie Chart */}
              <div>
                <h4 className="text-sm font-medium text-gray-600 mb-3">Attendance Breakdown</h4>
                <div className="h-52">
                  {loading ? (
                    <div className="h-full flex items-center justify-center text-gray-500">Loading...</div>
                  ) : attendanceByStatus.length === 0 ? (
                    <div className="h-full flex items-center justify-center text-gray-500">No data</div>
                  ) : (
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={attendanceByStatus}
                          cx="50%"
                          cy="50%"
                          innerRadius={40}
                          outerRadius={70}
                          paddingAngle={3}
                          dataKey="value"
                          label={({ name, percent }) => name && percent != null ? `${name}: ${(percent * 100).toFixed(0)}%` : ''}
                          labelLine={false}
                        >
                          {attendanceByStatus.map((entry, index) => (
                            <Cell key={`cell-att-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip 
                          contentStyle={{
                            backgroundColor: "rgba(255, 255, 255, 0.95)",
                            backdropFilter: "blur(10px)",
                            border: "none",
                            borderRadius: "8px",
                            boxShadow: "0 4px 20px rgba(0, 0, 0, 0.1)"
                          }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Task Completion Trend */}
          <div className="bg-white/70 backdrop-blur-md border border-white/40 rounded-2xl shadow-lg p-4 lg:p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Task Completion Trend</h3>
            <div className="h-64">
              {loading ? (
                <div className="h-full flex items-center justify-center text-gray-500">Loading chart...</div>
              ) : taskTrend.length === 0 ? (
                <div className="h-full flex items-center justify-center text-gray-500">No task data available</div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={taskTrend}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey="month" stroke="#64748b" fontSize={12} />
                    <YAxis stroke="#64748b" fontSize={12} />
                    <Tooltip 
                      contentStyle={{
                        backgroundColor: "rgba(255, 255, 255, 0.95)",
                        backdropFilter: "blur(10px)",
                        border: "none",
                        borderRadius: "12px",
                        boxShadow: "0 4px 20px rgba(0, 0, 0, 0.1)"
                      }}
                    />
                    <Legend />
                    <Bar dataKey="completed" name="Completed" fill="#22c55e" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="total" name="Total" fill="#f97316" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          {/* Pie Charts Row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Tasks by Status Pie Chart */}
            <div className="bg-white/70 backdrop-blur-md border border-white/40 rounded-2xl shadow-lg p-4">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Tasks by Status</h3>
              <div className="h-52">
                {loading ? (
                  <div className="h-full flex items-center justify-center text-gray-500">Loading...</div>
                ) : tasksByStatus.length === 0 ? (
                  <div className="h-full flex items-center justify-center text-gray-500">No tasks yet</div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={tasksByStatus}
                        cx="50%"
                        cy="50%"
                        innerRadius={40}
                        outerRadius={70}
                        paddingAngle={5}
                        dataKey="value"
                        label={({ name, percent }) => name && percent !== undefined ? `${name}: ${(percent * 100).toFixed(0)}%` : ''}
                        labelLine={false}
                      >
                        {tasksByStatus.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip 
                        contentStyle={{
                          backgroundColor: "rgba(255, 255, 255, 0.95)",
                          backdropFilter: "blur(10px)",
                          border: "none",
                          borderRadius: "8px",
                          boxShadow: "0 4px 20px rgba(0, 0, 0, 0.1)"
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>

            {/* Tasks by Priority Pie Chart */}
            <div className="bg-white/70 backdrop-blur-md border border-white/40 rounded-2xl shadow-lg p-4">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Tasks by Priority</h3>
              <div className="h-52">
                {loading ? (
                  <div className="h-full flex items-center justify-center text-gray-500">Loading...</div>
                ) : tasksByPriority.length === 0 ? (
                  <div className="h-full flex items-center justify-center text-gray-500">No tasks yet</div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={tasksByPriority}
                        cx="50%"
                        cy="50%"
                        innerRadius={40}
                        outerRadius={70}
                        paddingAngle={5}
                        dataKey="value"
                        label={({ name, percent }) => name && percent !== undefined ? `${name}: ${(percent * 100).toFixed(0)}%` : ''}
                        labelLine={false}
                      >
                        {tasksByPriority.map((entry, index) => (
                          <Cell key={`cell-priority-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip 
                        contentStyle={{
                          backgroundColor: "rgba(255, 255, 255, 0.95)",
                          backdropFilter: "blur(10px)",
                          border: "none",
                          borderRadius: "8px",
                          boxShadow: "0 4px 20px rgba(0, 0, 0, 0.1)"
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>
          </div>

          {/* Leave & Performance Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Leave Trend */}
            <div className="bg-white/70 backdrop-blur-md border border-white/40 rounded-2xl shadow-lg p-4">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Monthly Leave Days</h3>
              <div className="h-48">
                {loading ? (
                  <div className="h-full flex items-center justify-center text-gray-500">Loading...</div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={leaveTrend}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                      <XAxis dataKey="month" stroke="#64748b" fontSize={12} />
                      <YAxis stroke="#64748b" fontSize={12} allowDecimals={false} />
                      <Tooltip 
                        contentStyle={{
                          backgroundColor: "rgba(255, 255, 255, 0.95)",
                          backdropFilter: "blur(10px)",
                          border: "none",
                          borderRadius: "8px",
                          boxShadow: "0 4px 20px rgba(0, 0, 0, 0.1)"
                        }}
                      />
                      <Bar dataKey="leaves" name="Leave Days" fill="#f97316" radius={[6, 6, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>

            {/* Performance History */}
            <div className="bg-white/70 backdrop-blur-md border border-white/40 rounded-2xl shadow-lg p-4">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Performance History</h3>
              <div className="h-48">
                {loading ? (
                  <div className="h-full flex items-center justify-center text-gray-500">Loading...</div>
                ) : performanceTrend.length === 0 ? (
                  <div className="h-full flex items-center justify-center text-gray-500">No performance data</div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={performanceTrend}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                      <XAxis dataKey="month" stroke="#64748b" fontSize={12} />
                      <YAxis domain={[0, 10]} stroke="#64748b" fontSize={12} />
                      <Tooltip 
                        contentStyle={{
                          backgroundColor: "rgba(255, 255, 255, 0.95)",
                          backdropFilter: "blur(10px)",
                          border: "none",
                          borderRadius: "8px",
                          boxShadow: "0 4px 20px rgba(0, 0, 0, 0.1)"
                        }}
                      />
                      <Line 
                        type="monotone" 
                        dataKey="score" 
                        name="Score"
                        stroke="#8b5cf6" 
                        strokeWidth={3}
                        dot={{ fill: "#8b5cf6", strokeWidth: 2, r: 4 }}
                        activeDot={{ r: 6, stroke: "#8b5cf6", strokeWidth: 2 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Profile Card */}
          {employee && (
            <div className="bg-gradient-to-br from-orange-500 to-orange-600 backdrop-blur-md rounded-2xl shadow-lg p-4 lg:p-6 text-white">
              <div className="flex items-center gap-4 mb-4">
                <div className="w-14 h-14 rounded-full bg-white/20 flex items-center justify-center text-2xl font-bold">
                  {employee.firstName[0]}{employee.lastName[0]}
                </div>
                <div>
                  <h3 className="font-semibold text-lg">{employee.firstName} {employee.lastName}</h3>
                  <p className="text-orange-100 text-sm">{employee.jobTitle}</p>
                </div>
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2 text-orange-100">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                  </svg>
                  <span>{employee.department}</span>
                </div>
                <div className="flex items-center gap-2 text-orange-100">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                  <span className="truncate">{employee.email}</span>
                </div>
              </div>
            </div>
          )}

          {/* Quick Actions */}
          <div className="bg-white/70 backdrop-blur-md border border-white/40 rounded-2xl shadow-lg p-4 lg:p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
            <div className="space-y-3">
              <a href="/employee/leave" className="flex items-center gap-3 p-3 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-xl hover:from-green-600 hover:to-emerald-700 transition-all shadow-md hover:shadow-lg">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                <span className="font-medium">Apply Leave</span>
              </a>
              
              <a href="/employee/task" className="flex items-center gap-3 p-3 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-xl hover:from-blue-600 hover:to-indigo-700 transition-all shadow-md hover:shadow-lg">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
                <span className="font-medium">View Tasks</span>
              </a>
              
              <a href="/employee/attendance" className="flex items-center gap-3 p-3 bg-gradient-to-r from-amber-500 to-orange-600 text-white rounded-xl hover:from-amber-600 hover:to-orange-700 transition-all shadow-md hover:shadow-lg">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="font-medium">Attendance</span>
              </a>
              
              <a href="/employee/settings" className="flex items-center gap-3 p-3 bg-gradient-to-r from-purple-500 to-violet-600 text-white rounded-xl hover:from-purple-600 hover:to-violet-700 transition-all shadow-md hover:shadow-lg">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
                <span className="font-medium">Profile Settings</span>
              </a>
            </div>
          </div>

          {/* Notifications */}
          <div className="bg-white/70 backdrop-blur-md border border-white/40 rounded-2xl shadow-lg p-4 lg:p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-sm font-semibold text-gray-900">Latest Updates</p>
                <p className="text-xs text-gray-500">Leave and attendance decisions</p>
              </div>
              <span className="inline-flex items-center gap-1 rounded-full bg-orange-100 text-orange-700 px-3 py-1 text-xs font-semibold">
                {unreadCount} new
              </span>
            </div>

            <div className="space-y-3 max-h-80 overflow-y-auto">
              {notificationsLoading ? (
                <div className="h-24 flex items-center justify-center text-sm text-gray-500">
                  Loading notifications...
                </div>
              ) : latest.length === 0 ? (
                <div className="h-24 flex items-center justify-center text-sm text-gray-500">
                  No notifications yet
                </div>
              ) : (
                latest.map((item) => {
                  const pillStyles =
                    item.state === "approved"
                      ? "bg-green-100 text-green-700"
                      : item.state === "rejected"
                      ? "bg-red-100 text-red-700"
                      : "bg-yellow-100 text-yellow-700";

                  return (
                    <button
                      key={`${item.id}-${item.state}`}
                      onClick={() => markAsRead(item)}
                      className="w-full text-left rounded-xl border border-gray-100 bg-white/80 hover:bg-gray-50 transition-colors p-3 shadow-sm"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-gray-900 line-clamp-1">{item.title}</p>
                          <p className="mt-1 text-xs text-gray-600 line-clamp-2">{item.message}</p>
                          <p className="mt-1 text-[11px] text-gray-400">
                            {new Date(item.createdAt).toLocaleString("en-US", {
                              month: "short",
                              day: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </p>
                        </div>
                        <span className={`whitespace-nowrap rounded-full px-2 py-0.5 text-[10px] font-semibold ${pillStyles}`}>
                          {item.state === "pending"
                            ? "Pending"
                            : item.state === "approved"
                            ? "Approved"
                            : "Rejected"}
                        </span>
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}