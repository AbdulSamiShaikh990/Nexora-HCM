"use client";

import { useState } from "react";
import Link from "next/link";

// Types
type Task = {
  id: string;
  title: string;
  description: string;
  status: "pending" | "completed" | "in-progress";
  dueDate: string;
  priority: "low" | "medium" | "high";
  assignedBy: string;
  estimatedHours: number;
  actualHours: number;
  progress: number;
  tags: string[];
};

// Sample Data
const sampleTasks: Task[] = [
  {
    id: "1",
    title: "Complete Quarterly Report",
    description: "Prepare and finalize the Q4 financial report with all department summaries and projections for the upcoming quarter.",
    status: "completed",
    dueDate: "2026-01-10",
    priority: "high",
    assignedBy: "Sarah Johnson",
    estimatedHours: 8,
    actualHours: 7.5,
    progress: 100,
    tags: ["report", "finance", "quarterly"],
  },
  {
    id: "2",
    title: "Client Meeting Preparation",
    description: "Prepare presentation slides and documentation for the upcoming client meeting with ABC Corporation.",
    status: "in-progress",
    dueDate: "2026-01-18",
    priority: "medium",
    assignedBy: "Michael Chen",
    estimatedHours: 6,
    actualHours: 3,
    progress: 50,
    tags: ["client", "presentation", "meeting"],
  },
  {
    id: "3",
    title: "Code Review",
    description: "Review and provide feedback on the new authentication module developed by the junior team members.",
    status: "pending",
    dueDate: "2026-01-20",
    priority: "low",
    assignedBy: "David Park",
    estimatedHours: 4,
    actualHours: 0,
    progress: 0,
    tags: ["review", "development", "security"],
  },
  {
    id: "4",
    title: "Database Optimization",
    description: "Analyze and optimize database queries for improved application performance. Focus on slow-running queries.",
    status: "in-progress",
    dueDate: "2026-01-22",
    priority: "high",
    assignedBy: "Emily Rodriguez",
    estimatedHours: 12,
    actualHours: 8,
    progress: 65,
    tags: ["database", "performance", "optimization"],
  },
  {
    id: "5",
    title: "Documentation Update",
    description: "Update the user documentation and API guides to reflect the recent system changes and new features.",
    status: "pending",
    dueDate: "2026-01-25",
    priority: "medium",
    assignedBy: "Sarah Johnson",
    estimatedHours: 5,
    actualHours: 0,
    progress: 0,
    tags: ["documentation", "api", "update"],
  },
];

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
  const [tasks] = useState<Task[]>(sampleTasks);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [priorityFilter, setPriorityFilter] = useState<string>("all");

  // Filter tasks
  const filteredTasks = tasks.filter((task) => {
    const statusMatch = statusFilter === "all" || task.status === statusFilter;
    const priorityMatch = priorityFilter === "all" || task.priority === priorityFilter;
    return statusMatch && priorityMatch;
  });

  // Calculate summary statistics
  const completedCount = tasks.filter((t) => t.status === "completed").length;
  const inProgressCount = tasks.filter((t) => t.status === "in-progress").length;
  const pendingCount = tasks.filter((t) => t.status === "pending").length;
  const totalHoursSpent = tasks.reduce((sum, t) => sum + t.actualHours, 0);

  return (
    <div className="w-full space-y-6">
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
                <option value="pending">Pending</option>
                <option value="in-progress">In Progress</option>
                <option value="completed">Completed</option>
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
                    <p className="text-sm font-bold text-gray-900 truncate">{task.assignedBy}</p>
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
                      task.progress === 100
                        ? "bg-gradient-to-r from-green-500 to-green-600"
                        : task.progress >= 50
                        ? "bg-gradient-to-r from-blue-500 to-blue-600"
                        : task.progress > 0
                        ? "bg-gradient-to-r from-orange-500 to-orange-600"
                        : "bg-gray-300"
                    }`}
                    style={{ width: `${task.progress}%` }}
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
                {task.status === "pending" && (
                  <button className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-green-500 to-green-600 text-white font-semibold text-sm shadow-lg shadow-green-500/30 hover:shadow-xl hover:scale-105 transition-all active:scale-95">
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M8 5v14l11-7z" />
                    </svg>
                    Start Task
                  </button>
                )}
                {task.status === "in-progress" && (
                  <button className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-blue-500 to-blue-600 text-white font-semibold text-sm shadow-lg shadow-blue-500/30 hover:shadow-xl hover:scale-105 transition-all active:scale-95">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    Update Progress
                  </button>
                )}
                <button className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border-2 border-orange-300 text-orange-700 font-semibold text-sm hover:bg-orange-50 hover:border-orange-400 transition-all active:scale-95">
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
    </div>
  );
}
