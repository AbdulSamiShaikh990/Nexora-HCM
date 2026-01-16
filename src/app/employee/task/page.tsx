"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";

// Types
type Task = {
  id: number;
  title: string;
  description: string | null;
  status: string;
  dueDate: string;
  priority: string;
  assignedBy: { id: number; firstName: string; lastName: string; email: string };
  assignedById: number;
  estimatedHours: number | null;
  actualHours: number;
  progress: number | null;
  tags: string[];
  createdAt: string;
  updatedAt: string;
};

// Helper functions
const formatDateDisplay = (dateStr: string) => {
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
};

const getStatusColor = (status: string) => {
  switch (status) {
    case "completed":
      return "bg-green-100 text-green-800";
    case "in-progress":
      return "bg-blue-100 text-blue-800";
    case "pending":
      return "bg-yellow-100 text-yellow-800";
    default:
      return "bg-gray-100 text-gray-800";
  }
};

const getPriorityColor = (priority: string) => {
  switch (priority) {
    case "high":
      return "bg-red-100 text-red-800";
    case "medium":
      return "bg-yellow-100 text-yellow-800";
    case "low":
      return "bg-green-100 text-green-800";
    default:
      return "bg-gray-100 text-gray-800";
  }
};

const getStatusLabel = (status: string) => {
  switch (status) {
    case "completed":
      return "Completed";
    case "in-progress":
      return "In Progress";
    case "pending":
      return "Pending";
    default:
      return status;
  }
};

const getPriorityLabel = (priority: string) => {
  return priority.charAt(0).toUpperCase() + priority.slice(1);
};

export default function TaskPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [priorityFilter, setPriorityFilter] = useState<string>("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<number | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);

  // Check authentication
  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth/signin");
    }
  }, [status, router]);

  // Fetch tasks on mount
  useEffect(() => {
    if (session?.user?.id) {
      fetchTasks();
    }
  }, [session]);

  const fetchTasks = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Get user email from NextAuth session
      const userEmail = session?.user?.email;
      console.log("Session:", session);
      console.log("User email:", userEmail);
      
      if (!userEmail) {
        setError("User not authenticated. Please log in.");
        setLoading(false);
        return;
      }
      
      // Fetch employee by email to get numeric employee ID
      const empRes = await fetch(`/api/employees/list`);
      if (!empRes.ok) throw new Error("Failed to fetch employee data");
      
      const empData = await empRes.json();
      console.log("API Response:", empData);
      
      if (!empData || !empData.employees || empData.employees.length === 0) {
        setError("No employees found in system");
        setLoading(false);
        return;
      }
      
      // Find employee matching logged-in user's email
      const employee = empData.employees.find((emp: any) => emp.email === userEmail);
      console.log("Matched employee:", employee);
      
      if (!employee || !employee.id) {
        setError(`No employee record found for email: ${userEmail}. Please contact admin.`);
        setLoading(false);
        return;
      }
      
      const employeeId = employee.id;
      console.log("Employee ID:", employeeId);
      
      // Now fetch tasks for this employee
      console.log("Fetching tasks for employee ID:", employeeId);
      const res = await fetch(`/api/task/employee?employeeId=${employeeId}`);
      if (!res.ok) throw new Error("Failed to fetch tasks");
      const data = await res.json();
      console.log("Received tasks data:", data);
      setTasks(data.data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
      console.error("Error fetching tasks:", err);
    } finally {
      setLoading(false);
    }
  };

  // Filter tasks
  const filteredTasks = tasks.filter((task) => {
    const statusMatch = statusFilter === "all" || task.status === statusFilter;
    const priorityMatch = priorityFilter === "all" || task.priority === priorityFilter;
    return statusMatch && priorityMatch;
  });

  // Calculate summary statistics
  const completedCount = tasks.filter((t) => t.status === "Completed").length;
  const inProgressCount = tasks.filter((t) => t.status === "InProgress").length;
  const pendingCount = tasks.filter((t) => t.status === "Pending").length;
  const totalHoursSpent = tasks.reduce((sum, t) => sum + t.actualHours, 0);

  const handleUpdateProgress = async (taskId: number, newStatus: string) => {
    try {
      setUpdatingId(taskId);
      
      // Get user email from NextAuth session
      const userEmail = session?.user?.email;
      
      if (!userEmail) {
        setError("User not authenticated");
        setUpdatingId(null);
        return;
      }
      
      // Fetch employee to get numeric ID
      const empRes = await fetch(`/api/employees/list`);
      if (!empRes.ok) throw new Error("Failed to fetch employee data");
      const empData = await empRes.json();
      
      if (!empData || !empData.employees || empData.employees.length === 0) {
        throw new Error("No employees found");
      }
      
      const employee = empData.employees.find((emp: any) => emp.email === userEmail);
      if (!employee || !employee.id) throw new Error("Employee record not found");
      
      const employeeId = employee.id;
      
      const res = await fetch("/api/task/employee", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: taskId,
          employeeId: employeeId,
          status: newStatus,
        }),
      });

      if (!res.ok) throw new Error("Failed to update task");
      const updatedTask = await res.json();
      setTasks(tasks.map((t) => (t.id === taskId ? updatedTask.data : t)));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update task");
    } finally {
      setUpdatingId(null);
    }
  };

  return (
    <div className="w-full space-y-6">
      {/* Error Alert */}
      {error && (
        <div className="relative overflow-hidden rounded-2xl bg-red-500/10 border border-red-300/40 backdrop-blur-xl p-4 shadow-[0_8px_32px_0_rgba(239,68,68,0.1)]">
          <div className="flex items-center gap-3">
            <svg className="w-5 h-5 text-red-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4v.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-sm text-red-700 font-medium">{error}</p>
            <button onClick={() => setError(null)} className="ml-auto text-red-600 hover:text-red-800">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      )}

      {/* Loading State */}
      {loading && (
        <div className="flex items-center justify-center py-16">
          <div className="text-center">
            <div className="w-12 h-12 rounded-full border-4 border-orange-200 border-t-orange-600 animate-spin mx-auto mb-4"></div>
            <p className="text-gray-600 font-medium">Loading your tasks...</p>
          </div>
        </div>
      )}

      {!loading && tasks.length === 0 && !error && (
        <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded-lg">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm text-yellow-700">
                No tasks found for Employee ID: 2. Make sure tasks are assigned to this employee from the admin panel.
              </p>
            </div>
          </div>
        </div>
      )}

      {!loading && (
        <>
          {/* Header Section */}
          <div className="bg-gradient-to-r from-orange-50 to-orange-100/50 rounded-2xl border border-orange-200 p-6 lg:p-8">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center shadow-lg">
                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                    </svg>
                  </div>
                  <div>
                    <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900">My Tasks</h1>
                    <p className="text-sm text-gray-600 mt-1">Manage and track your assigned tasks</p>
                  </div>
                </div>
              </div>
              <Link
                href="/employee/dashboard"
                className="flex items-center justify-center gap-2 px-4 py-2 rounded-xl border-2 border-orange-300 text-orange-700 hover:bg-white hover:border-orange-400 font-medium transition-all shadow-sm"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
                <span className="text-sm">Back</span>
              </Link>
            </div>
          </div>

          {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Completed */}
        <div className="bg-white rounded-2xl shadow-lg border border-green-100 p-5 lg:p-6 hover:shadow-xl transition-all hover:border-green-200">
          <div className="flex items-start justify-between mb-3">
            <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-green-400 to-green-500 flex items-center justify-center shadow-lg">
              <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
          <p className="text-xs text-gray-600 font-medium uppercase tracking-wider">Completed</p>
          <p className="text-3xl font-bold text-gray-900 mt-2">{completedCount}</p>
          <p className="text-xs text-green-600 mt-2 font-medium">Tasks done</p>
        </div>

        {/* In Progress */}
        <div className="bg-white rounded-2xl shadow-lg border border-blue-100 p-5 lg:p-6 hover:shadow-xl transition-all hover:border-blue-200">
          <div className="flex items-start justify-between mb-3">
            <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-blue-400 to-blue-500 flex items-center justify-center shadow-lg">
              <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
          </div>
          <p className="text-xs text-gray-600 font-medium uppercase tracking-wider">In Progress</p>
          <p className="text-3xl font-bold text-gray-900 mt-2">{inProgressCount}</p>
          <p className="text-xs text-blue-600 mt-2 font-medium">Active tasks</p>
        </div>

        {/* Pending */}
        <div className="bg-white rounded-2xl shadow-lg border border-yellow-100 p-5 lg:p-6 hover:shadow-xl transition-all hover:border-yellow-200">
          <div className="flex items-start justify-between mb-3">
            <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-yellow-400 to-yellow-500 flex items-center justify-center shadow-lg">
              <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
          <p className="text-xs text-gray-600 font-medium uppercase tracking-wider">Pending</p>
          <p className="text-3xl font-bold text-gray-900 mt-2">{pendingCount}</p>
          <p className="text-xs text-yellow-600 mt-2 font-medium">Waiting to start</p>
        </div>

        {/* Hours Spent */}
        <div className="bg-white rounded-2xl shadow-lg border border-purple-100 p-5 lg:p-6 hover:shadow-xl transition-all hover:border-purple-200">
          <div className="flex items-start justify-between mb-3">
            <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-purple-400 to-purple-500 flex items-center justify-center shadow-lg">
              <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
          <p className="text-xs text-gray-600 font-medium uppercase tracking-wider">Hours Spent</p>
          <p className="text-3xl font-bold text-gray-900 mt-2">{totalHoursSpent}h</p>
          <p className="text-xs text-purple-600 mt-2 font-medium">Total logged</p>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white rounded-2xl shadow-lg border border-orange-100 p-5 lg:p-6">
        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-2">
            <svg className="w-5 h-5 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
            </svg>
            <span className="text-sm font-bold text-gray-900">Filter Tasks</span>
          </div>

          <div className="mb-2 text-sm text-gray-600">
            Total tasks loaded: <strong>{tasks.length}</strong> | Filtered: <strong>{filteredTasks.length}</strong>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Status Filter */}
            <div className="flex flex-col gap-2">
              <label className="text-xs font-semibold text-gray-700 uppercase tracking-wider">Status</label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-4 py-2.5 rounded-xl border-2 border-gray-200 focus:ring-2 focus:ring-orange-400 focus:border-transparent bg-white text-gray-900 text-sm font-medium hover:border-orange-300 transition-colors"
              >
                <option value="all">All Status</option>
                <option value="Pending">Pending</option>
                <option value="InProgress">In Progress</option>
                <option value="Completed">Completed</option>
              </select>
            </div>

            {/* Priority Filter */}
            <div className="flex flex-col gap-2">
              <label className="text-xs font-semibold text-gray-700 uppercase tracking-wider">Priority</label>
              <select
                value={priorityFilter}
                onChange={(e) => setPriorityFilter(e.target.value)}
                className="px-4 py-2.5 rounded-xl border-2 border-gray-200 focus:ring-2 focus:ring-orange-400 focus:border-transparent bg-white text-gray-900 text-sm font-medium hover:border-orange-300 transition-colors"
              >
                <option value="all">All Priorities</option>
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
            </div>

            {/* Results Count */}
            <div className="flex items-end">
              <div className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-orange-50 to-orange-100 border border-orange-200 w-full text-center">
                <p className="text-xs text-gray-600 font-medium">Showing</p>
                <p className="text-2xl font-bold text-orange-600">{filteredTasks.length}</p>
              </div>
            </div>

            {/* Clear Filters Button */}
            <div className="flex items-end">
              <button
                onClick={() => {
                  setStatusFilter("all");
                  setPriorityFilter("all");
                }}
                className="w-full px-4 py-2.5 rounded-xl border-2 border-gray-300 text-gray-700 hover:bg-gray-100 hover:border-gray-400 text-sm font-semibold transition-all active:scale-95"
              >
                Reset Filters
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Tasks Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {filteredTasks.length === 0 ? (
          <div className="col-span-full bg-white rounded-2xl shadow-lg border border-orange-100 p-16 text-center">
            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-orange-100 to-orange-50 flex items-center justify-center mx-auto mb-6 shadow-lg">
              <svg className="w-10 h-10 text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">No Tasks Found</h3>
            <p className="text-gray-600 mb-6">No tasks match your current filter criteria. Try adjusting the filters to see your tasks.</p>
            <button
              onClick={() => {
                setStatusFilter("all");
                setPriorityFilter("all");
              }}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-orange-500 to-orange-600 text-white font-semibold shadow-lg shadow-orange-500/30 hover:shadow-xl transition-all active:scale-95"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Reset All Filters
            </button>
          </div>
        ) : (
          filteredTasks.map((task) => (
            <div
              key={task.id}
              className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6 hover:shadow-xl hover:border-orange-200 transition-all group"
            >
              {/* Task Header with Priority Indicator */}
              <div className="flex items-start justify-between gap-4 mb-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <div
                      className={`w-1.5 h-6 rounded-full ${
                        task.priority === "high"
                          ? "bg-red-500"
                          : task.priority === "medium"
                          ? "bg-yellow-500"
                          : "bg-green-500"
                      }`}
                    ></div>
                    <h3 className="text-lg font-bold text-gray-900 group-hover:text-orange-600 transition-colors">
                      {task.title}
                    </h3>
                  </div>
                  <p className="text-sm text-gray-600 line-clamp-2 leading-relaxed">{task.description}</p>
                </div>
              </div>

              {/* Status & Priority Badges */}
              <div className="flex flex-wrap gap-2 mb-4">
                <span
                  className={`inline-flex px-3 py-1.5 rounded-full text-xs font-semibold ${getStatusColor(task.status)}`}
                >
                  {getStatusLabel(task.status)}
                </span>
                <span
                  className={`inline-flex px-3 py-1.5 rounded-full text-xs font-semibold ${getPriorityColor(task.priority)}`}
                >
                  {getPriorityLabel(task.priority)} Priority
                </span>
              </div>

              {/* Divider */}
              <div className="border-t border-gray-100 my-4"></div>

              {/* Task Details Grid */}
              <div className="grid grid-cols-2 gap-3 mb-4">
                {/* Due Date */}
                <div className="flex items-start gap-2 p-2.5 rounded-xl bg-gradient-to-br from-orange-50 to-orange-100/50 border border-orange-100">
                  <svg className="w-4 h-4 text-orange-600 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-gray-600 font-medium">Due Date</p>
                    <p className="text-sm font-bold text-gray-900 truncate">{formatDateDisplay(task.dueDate)}</p>
                  </div>
                </div>

                {/* Assigned By */}
                <div className="flex items-start gap-2 p-2.5 rounded-xl bg-gradient-to-br from-blue-50 to-blue-100/50 border border-blue-100">
                  <svg className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-gray-600 font-medium">Assigned By</p>
                    <p className="text-sm font-bold text-gray-900 truncate">{typeof task.assignedBy === 'string' ? task.assignedBy : `${task.assignedBy.firstName} ${task.assignedBy.lastName}`}</p>
                  </div>
                </div>

                {/* Hours */}
                <div className="flex items-start gap-2 p-2.5 rounded-xl bg-gradient-to-br from-purple-50 to-purple-100/50 border border-purple-100">
                  <svg className="w-4 h-4 text-purple-600 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-gray-600 font-medium">Hours</p>
                    <p className="text-sm font-bold text-gray-900">
                      <span className="text-purple-600">{task.actualHours}h</span>/{task.estimatedHours}h
                    </p>
                  </div>
                </div>

                {/* Progress */}
                <div className="flex items-start gap-2 p-2.5 rounded-xl bg-gradient-to-br from-green-50 to-green-100/50 border border-green-100">
                  <svg className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-gray-600 font-medium">Progress</p>
                    <p className="text-sm font-bold text-gray-900">{task.progress}%</p>
                  </div>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="mb-4">
                <div className="w-full bg-gray-200 rounded-full h-2.5 overflow-hidden">
                  <div
                    className={`h-2.5 rounded-full transition-all duration-300 ${
                      (task.progress ?? 0) === 100
                        ? "bg-gradient-to-r from-green-500 to-green-600"
                        : (task.progress ?? 0) >= 50
                        ? "bg-gradient-to-r from-blue-500 to-blue-600"
                        : (task.progress ?? 0) > 0
                        ? "bg-gradient-to-r from-orange-500 to-orange-600"
                        : "bg-gray-300"
                    }`}
                    style={{ width: `${task.progress ?? 0}%` }}
                  ></div>
                </div>
              </div>

              {/* Tags */}
              <div className="flex flex-wrap gap-2 mb-5">
                {task.tags.map((tag, index) => (
                  <span
                    key={index}
                    className="inline-flex px-2.5 py-1 rounded-lg bg-gray-100 text-gray-700 text-xs font-medium hover:bg-gray-200 transition-colors"
                  >
                    #{tag}
                  </span>
                ))}
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap gap-3 pt-4 border-t border-gray-100">
                {task.status === "Pending" && (
                  <button 
                    onClick={() => handleUpdateProgress(task.id, "InProgress")}
                    disabled={updatingId === task.id}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-green-500 to-green-600 text-white font-semibold text-sm shadow-lg shadow-green-500/30 hover:shadow-xl hover:scale-105 transition-all active:scale-95 disabled:opacity-50 disabled:scale-100">
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M8 5v14l11-7z" />
                    </svg>
                    {updatingId === task.id ? "Starting..." : "Start Task"}
                  </button>
                )}
                {task.status === "InProgress" && (
                  <button 
                    onClick={() => handleUpdateProgress(task.id, "Completed")}
                    disabled={updatingId === task.id}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-blue-500 to-blue-600 text-white font-semibold text-sm shadow-lg shadow-blue-500/30 hover:shadow-xl hover:scale-105 transition-all active:scale-95 disabled:opacity-50 disabled:scale-100">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    {updatingId === task.id ? "Completing..." : "Complete"}
                  </button>
                )}
                <button 
                  onClick={() => {
                    setSelectedTask(task);
                    setShowDetailsModal(true);
                  }}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border-2 border-orange-300 text-orange-700 font-semibold text-sm hover:bg-orange-50 hover:border-orange-400 transition-all active:scale-95">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                  View Details
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      </>
      )}

      {/* Task Details Modal */}
      {showDetailsModal && selectedTask && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="sticky top-0 bg-gradient-to-r from-orange-500 to-orange-600 p-6 rounded-t-2xl">
              <div className="flex items-start justify-between">
                <div>
                  <h2 className="text-2xl font-bold text-white mb-2">{selectedTask.title}</h2>
                  <div className="flex gap-2">
                    <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getStatusColor(selectedTask.status)}`}>
                      {getStatusLabel(selectedTask.status)}
                    </span>
                    <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getPriorityColor(selectedTask.priority)}`}>
                      {getPriorityLabel(selectedTask.priority)} Priority
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => setShowDetailsModal(false)}
                  className="text-white hover:bg-white/20 rounded-lg p-2 transition-colors"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-6">
              {/* Description */}
              <div>
                <h3 className="text-sm font-semibold text-gray-700 mb-2">Description</h3>
                <p className="text-gray-600 leading-relaxed">{selectedTask.description || "No description provided"}</p>
              </div>

              {/* Details Grid */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-orange-50 p-4 rounded-xl">
                  <p className="text-xs text-gray-600 font-medium mb-1">Due Date</p>
                  <p className="text-lg font-bold text-gray-900">{formatDateDisplay(selectedTask.dueDate)}</p>
                </div>
                <div className="bg-blue-50 p-4 rounded-xl">
                  <p className="text-xs text-gray-600 font-medium mb-1">Assigned By</p>
                  <p className="text-lg font-bold text-gray-900">{typeof selectedTask.assignedBy === 'string' ? selectedTask.assignedBy : `${selectedTask.assignedBy.firstName} ${selectedTask.assignedBy.lastName}`}</p>
                </div>
                <div className="bg-purple-50 p-4 rounded-xl">
                  <p className="text-xs text-gray-600 font-medium mb-1">Estimated Hours</p>
                  <p className="text-lg font-bold text-gray-900">{selectedTask.estimatedHours || 0}h</p>
                </div>
                <div className="bg-green-50 p-4 rounded-xl">
                  <p className="text-xs text-gray-600 font-medium mb-1">Actual Hours</p>
                  <p className="text-lg font-bold text-gray-900">{selectedTask.actualHours}h</p>
                </div>
              </div>

              {/* Progress Bar */}
              <div>
                <div className="flex justify-between mb-2">
                  <span className="text-sm font-medium text-gray-700">Progress</span>
                  <span className="text-sm font-bold text-orange-600">{selectedTask.progress}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-3">
                  <div
                    className="h-3 rounded-full bg-gradient-to-r from-orange-500 to-orange-600 transition-all"
                    style={{ width: `${selectedTask.progress ?? 0}%` }}
                  ></div>
                </div>
              </div>

              {/* Tags */}
              {selectedTask.tags && selectedTask.tags.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-gray-700 mb-2">Tags</h3>
                  <div className="flex flex-wrap gap-2">
                    {selectedTask.tags.map((tag, index) => (
                      <span key={index} className="px-3 py-1 rounded-lg bg-gray-100 text-gray-700 text-sm font-medium">
                        #{tag}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Timestamps */}
              <div className="border-t pt-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-600">Created:</span>
                    <span className="ml-2 font-medium text-gray-900">{new Date(selectedTask.createdAt).toLocaleString()}</span>
                  </div>
                  <div>
                    <span className="text-gray-600">Updated:</span>
                    <span className="ml-2 font-medium text-gray-900">{new Date(selectedTask.updatedAt).toLocaleString()}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="bg-gray-50 p-6 rounded-b-2xl flex justify-end">
              <button
                onClick={() => setShowDetailsModal(false)}
                className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-orange-500 to-orange-600 text-white font-semibold hover:shadow-lg transition-all"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
