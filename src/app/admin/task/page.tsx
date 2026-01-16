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
  assignedTo: { id: number; firstName: string; lastName: string; email: string };
  assignedToId: number;
  assignedBy: { id: number; firstName: string; lastName: string; email: string };
  assignedById: number;
  estimatedHours: number | null;
  actualHours: number;
  progress: number | null;
  tags: string[];
  createdAt: string;
  updatedAt: string;
};

type Employee = {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  jobTitle: string;
};

// Sample Employees (fallback)
const sampleEmployees: Employee[] = [
  { id: 1, firstName: "Ahmed", lastName: "Khan", email: "ahmed@nexora.com", jobTitle: "Senior Developer" },
  { id: 2, firstName: "Farhana", lastName: "Malik", email: "farhana@nexora.com", jobTitle: "HR Executive" },
  { id: 3, firstName: "Sara", lastName: "Ali", email: "sara@nexora.com", jobTitle: "Project Manager" },
  { id: 4, firstName: "Hassan", lastName: "Shah", email: "hassan@nexora.com", jobTitle: "QA Engineer" },
  { id: 5, firstName: "Ayesha", lastName: "Hassan", email: "ayesha@nexora.com", jobTitle: "Business Analyst" },
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

export default function AdminTaskPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [employees, setEmployees] = useState<Employee[]>(sampleEmployees);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [priorityFilter, setPriorityFilter] = useState<string>("all");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    title: "",
    description: "",
    priority: "Medium",
    assignedTo: "",
    estimatedHours: 0,
    dueDate: "",
    tags: "",
  });

  // Fetch tasks on mount
  useEffect(() => {
    fetchTasks();
    fetchEmployees();
  }, []);

  const fetchEmployees = async () => {
    try {
      const res = await fetch("/api/employees");
      if (!res.ok) throw new Error("Failed to fetch employees");
      const data = await res.json();
      setEmployees(data || []);
    } catch (err) {
      console.error("Error fetching employees:", err);
      // Keep fallback employees if API fails
    }
  };

  const fetchTasks = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch("/api/task/admin");
      if (!res.ok) throw new Error("Failed to fetch tasks");
      const data = await res.json();
      setTasks(data.data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
      console.error(err);
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

  // Calculate statistics
  const totalTasks = tasks.length;
  const completedCount = tasks.filter((t) => t.status === "Completed").length;
  const inProgressCount = tasks.filter((t) => t.status === "InProgress").length;
  const pendingCount = tasks.filter((t) => t.status === "Pending").length;

  // Handle create task
  const handleCreateTask = async () => {
    if (!formData.title || !formData.assignedTo || !formData.dueDate) {
      alert("Please fill all required fields");
      return;
    }

    try {
      setSubmitting(true);
      
      // Get logged-in admin email from NextAuth session
      const adminEmail = session?.user?.email;
      console.log("Admin email from session:", adminEmail);
      
      // Fetch admin employee record to get numeric ID
      const empRes = await fetch(`/api/employees/list`);
      if (!empRes.ok) throw new Error("Failed to fetch employee data");
      const empData = await empRes.json();
      
      console.log("All employees:", empData.employees);
      
      const adminEmployee = empData.employees?.find((emp: any) => emp.email === adminEmail);
      
      // Fallback: use first employee if admin not found (for testing)
      const adminId = adminEmployee ? adminEmployee.id : (empData.employees && empData.employees.length > 0 ? empData.employees[0].id : 1);
      
      console.log("Using admin ID:", adminId, "Assigned To ID:", formData.assignedTo);
      
      const res = await fetch("/api/task/admin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: formData.title,
          description: formData.description || null,
          priority: formData.priority,
          dueDate: formData.dueDate,
          estimatedHours: formData.estimatedHours || null,
          assignedToId: parseInt(formData.assignedTo),
          assignedById: adminId,
          tags: formData.tags.split(",").map((t) => t.trim()).filter((t) => t),
        }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Failed to create task");
      }
      const newTask = await res.json();
      
      setTasks([newTask.data, ...tasks]);
      setShowCreateModal(false);
      setFormData({
        title: "",
        description: "",
        priority: "Medium",
        assignedTo: "",
        estimatedHours: 0,
        dueDate: "",
        tags: "",
      });
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to create task");
    } finally {
      setSubmitting(false);
    }
  };

  // Handle update task
  const handleUpdateTask = async () => {
    if (!selectedTask) return;

    try {
      setSubmitting(true);
      const res = await fetch("/api/task/admin", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: selectedTask.id,
          title: formData.title || selectedTask.title,
          description: formData.description || selectedTask.description,
          priority: formData.priority || selectedTask.priority,
          dueDate: formData.dueDate || selectedTask.dueDate,
          estimatedHours: formData.estimatedHours || selectedTask.estimatedHours,
          tags: formData.tags ? formData.tags.split(",").map((t) => t.trim()).filter((t) => t) : selectedTask.tags,
        }),
      });

      if (!res.ok) throw new Error("Failed to update task");
      const updated = await res.json();
      
      setTasks(tasks.map((t) => (t.id === selectedTask.id ? updated.data : t)));
      setShowEditModal(false);
      setSelectedTask(null);
      setFormData({
        title: "",
        description: "",
        priority: "Medium",
        assignedTo: "",
        estimatedHours: 0,
        dueDate: "",
        tags: "",
      });
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to update task");
    } finally {
      setSubmitting(false);
    }
  };

  // Handle delete task
  const handleDeleteTask = async (id: number) => {
    if (!confirm("Are you sure you want to delete this task?")) return;

    try {
      const res = await fetch(`/api/task/admin?id=${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete task");
      
      setTasks(tasks.filter((t) => t.id !== id));
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to delete task");
    }
  };

  // Open edit modal
  const openEditModal = (task: Task) => {
    setSelectedTask(task);
    setFormData({
      title: task.title,
      description: task.description || "",
      priority: task.priority,
      assignedTo: task.assignedToId.toString(),
      estimatedHours: task.estimatedHours || 0,
      dueDate: task.dueDate.split("T")[0],
      tags: task.tags.join(", "),
    });
    setShowEditModal(true);
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
            <div className="w-12 h-12 rounded-full border-4 border-purple-200 border-t-purple-600 animate-spin mx-auto mb-4"></div>
            <p className="text-gray-600 font-medium">Loading tasks...</p>
          </div>
        </div>
      )}

      {!loading && (
        <>
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-purple-600/10 via-purple-500/5 to-blue-600/10 border border-white/20 backdrop-blur-xl p-8 shadow-[0_8px_32px_0_rgba(31,38,135,0.37)]">
            <div className="absolute inset-0 bg-gradient-to-r from-purple-500/5 to-blue-500/5" />
            <div className="relative flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-purple-500 to-blue-600 flex items-center justify-center shadow-lg">
                <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
              </div>
              <div>
                <h1 className="text-3xl lg:text-4xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">Task Management</h1>
                <p className="text-sm text-gray-600 mt-1">Create, assign, and monitor employee tasks</p>
              </div>
            </div>
          </div>
          <button
            onClick={() => {
              setShowCreateModal(true);
              setFormData({
                title: "",
                description: "",
                priority: "medium",
                assignedTo: "",
                estimatedHours: 0,
                dueDate: "",
                tags: "",
              });
            }}
            className="flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-purple-600 to-blue-600 text-white font-semibold shadow-lg shadow-purple-600/40 hover:shadow-xl hover:scale-105 transition-all active:scale-95"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Create Task
          </button>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Tasks */}
        <div className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-blue-500/10 to-blue-600/5 border border-blue-200/40 backdrop-blur-xl p-6 hover:border-blue-300/60 shadow-[0_8px_32px_0_rgba(59,130,246,0.1)] hover:shadow-[0_8px_32px_0_rgba(59,130,246,0.2)] transition-all duration-300">
          <div className="absolute inset-0 bg-gradient-to-br from-blue-500/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
          <div className="relative flex items-start justify-between">
            <div className="flex-1">
              <p className="text-xs text-gray-600 font-semibold uppercase tracking-wider mb-2">Total Tasks</p>
              <p className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-blue-700 bg-clip-text text-transparent">{totalTasks}</p>
            </div>
            <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center shadow-lg shadow-blue-500/30 group-hover:scale-110 transition-transform">
              <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
          </div>
        </div>

        {/* Completed */}
        <div className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-green-500/10 to-green-600/5 border border-green-200/40 backdrop-blur-xl p-6 hover:border-green-300/60 shadow-[0_8px_32px_0_rgba(34,197,94,0.1)] hover:shadow-[0_8px_32px_0_rgba(34,197,94,0.2)] transition-all duration-300">
          <div className="absolute inset-0 bg-gradient-to-br from-green-500/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
          <div className="relative flex items-start justify-between">
            <div className="flex-1">
              <p className="text-xs text-gray-600 font-semibold uppercase tracking-wider mb-2">Completed</p>
              <p className="text-4xl font-bold bg-gradient-to-r from-green-600 to-green-700 bg-clip-text text-transparent">{completedCount}</p>
            </div>
            <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-green-400 to-green-600 flex items-center justify-center shadow-lg shadow-green-500/30 group-hover:scale-110 transition-transform">
              <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
        </div>

        {/* In Progress */}
        <div className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-orange-500/10 to-orange-600/5 border border-orange-200/40 backdrop-blur-xl p-6 hover:border-orange-300/60 shadow-[0_8px_32px_0_rgba(249,115,22,0.1)] hover:shadow-[0_8px_32px_0_rgba(249,115,22,0.2)] transition-all duration-300">
          <div className="absolute inset-0 bg-gradient-to-br from-orange-500/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
          <div className="relative flex items-start justify-between">
            <div className="flex-1">
              <p className="text-xs text-gray-600 font-semibold uppercase tracking-wider mb-2">In Progress</p>
              <p className="text-4xl font-bold bg-gradient-to-r from-orange-600 to-orange-700 bg-clip-text text-transparent">{inProgressCount}</p>
            </div>
            <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center shadow-lg shadow-orange-500/30 group-hover:scale-110 transition-transform">
              <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
          </div>
        </div>

        {/* Pending */}
        <div className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-red-500/10 to-red-600/5 border border-red-200/40 backdrop-blur-xl p-6 hover:border-red-300/60 shadow-[0_8px_32px_0_rgba(239,68,68,0.1)] hover:shadow-[0_8px_32px_0_rgba(239,68,68,0.2)] transition-all duration-300">
          <div className="absolute inset-0 bg-gradient-to-br from-red-500/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
          <div className="relative flex items-start justify-between">
            <div className="flex-1">
              <p className="text-xs text-gray-600 font-semibold uppercase tracking-wider mb-2">Pending</p>
              <p className="text-4xl font-bold bg-gradient-to-r from-red-600 to-red-700 bg-clip-text text-transparent">{pendingCount}</p>
            </div>
            <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-red-400 to-red-600 flex items-center justify-center shadow-lg shadow-red-500/30 group-hover:scale-110 transition-transform">
              <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-white/40 to-white/20 border border-white/30 backdrop-blur-xl p-6 shadow-[0_8px_32px_0_rgba(31,38,135,0.37)]">
        <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 to-blue-500/5 pointer-events-none" />
        <div className="relative flex flex-col sm:flex-row sm:items-end gap-4">
          <div className="flex-1 flex flex-col gap-2">
            <label className="text-xs font-bold text-gray-700 uppercase tracking-wider">Filter by Status</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-4 py-2.5 rounded-lg bg-white/60 backdrop-blur-sm border border-gray-200/60 focus:ring-2 focus:ring-purple-500 focus:border-transparent text-gray-900 text-sm font-medium hover:bg-white/80 transition-all"
            >
              <option value="all">All Status</option>
              <option value="pending">Pending</option>
              <option value="in-progress">In Progress</option>
              <option value="completed">Completed</option>
            </select>
          </div>

          <div className="flex-1 flex flex-col gap-2">
            <label className="text-xs font-bold text-gray-700 uppercase tracking-wider">Filter by Priority</label>
            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
              className="px-4 py-2.5 rounded-lg bg-white/60 backdrop-blur-sm border border-gray-200/60 focus:ring-2 focus:ring-purple-500 focus:border-transparent text-gray-900 text-sm font-medium hover:bg-white/80 transition-all"
            >
              <option value="all">All Priorities</option>
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
            </select>
          </div>

          <button
            onClick={() => {
              setStatusFilter("all");
              setPriorityFilter("all");
            }}
            className="px-5 py-2.5 rounded-lg bg-gradient-to-r from-gray-500/20 to-gray-600/20 border border-gray-300/40 text-gray-700 hover:bg-gray-500/30 hover:border-gray-400/60 font-semibold text-sm transition-all backdrop-blur-sm"
          >
            Reset Filters
          </button>
        </div>
      </div>

      {/* Tasks Table */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-white/40 to-white/20 border border-white/30 backdrop-blur-xl shadow-[0_8px_32px_0_rgba(31,38,135,0.37)]">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-purple-500/5 pointer-events-none" />
        <div className="relative overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gradient-to-r from-gray-50/40 to-gray-100/40 border-b border-white/30">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Task</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Assigned To</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Due Date</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Priority</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Status</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Progress</th>
                <th className="px-6 py-4 text-center text-xs font-bold text-gray-700 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/20">
              {filteredTasks.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-16 text-center">
                    <div className="flex flex-col items-center gap-3">
                      <div className="w-16 h-16 rounded-full bg-gradient-to-br from-purple-400/20 to-blue-400/20 flex items-center justify-center">
                        <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                        </svg>
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-gray-700">No tasks found</p>
                        <p className="text-xs text-gray-500 mt-1">Try adjusting your filters</p>
                      </div>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredTasks.map((task) => (
                  <tr key={task.id} className="hover:bg-white/30 transition-colors group">
                    <td className="px-6 py-4">
                      <div className="flex flex-col gap-1">
                        <p className="font-semibold text-gray-900 group-hover:text-purple-600 transition-colors">{task.title}</p>
                        <p className="text-xs text-gray-600">{(task.description || "").substring(0, 40)}...</p>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-700 font-medium">{task.assignedTo.firstName} {task.assignedTo.lastName}</td>
                    <td className="px-6 py-4 text-sm text-gray-700">{formatDateDisplay(task.dueDate)}</td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex px-3 py-1.5 rounded-lg text-xs font-bold backdrop-blur-sm ${getPriorityColor(task.priority)}`}>
                        {getPriorityLabel(task.priority)}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex px-3 py-1.5 rounded-lg text-xs font-bold backdrop-blur-sm ${getStatusColor(task.status)}`}>
                        {getStatusLabel(task.status)}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-24 bg-gray-200/40 rounded-full h-2 backdrop-blur-sm">
                          <div 
                            className={`h-2 rounded-full transition-all ${
                              (task.progress || 0) === 100 
                                ? "bg-gradient-to-r from-green-400 to-green-600" 
                                : (task.progress || 0) >= 50 
                                ? "bg-gradient-to-r from-blue-400 to-blue-600" 
                                : (task.progress || 0) > 0 
                                ? "bg-gradient-to-r from-orange-400 to-orange-600" 
                                : "bg-gray-300/40"
                            }`} 
                            style={{ width: `${task.progress || 0}%` }}
                          ></div>
                        </div>
                        <span className="text-xs font-bold text-gray-700 w-10 text-right">{task.progress || 0}%</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <div className="flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => openEditModal(task)}
                          className="p-2 hover:bg-blue-500/20 rounded-lg text-blue-600 transition-all hover:scale-110"
                          title="Edit"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </button>
                        <button
                          onClick={() => handleDeleteTask(task.id)}
                          className="p-2 hover:bg-red-500/20 rounded-lg text-red-600 transition-all hover:scale-110"
                          title="Delete"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create Task Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-md z-[999] flex items-center justify-center p-4 overflow-y-auto">
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-white/80 to-white/60 border border-white/40 backdrop-blur-xl max-w-2xl w-full p-8 my-8 shadow-[0_20px_60px_0_rgba(0,0,0,0.3)]">
            <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 to-blue-500/5 pointer-events-none" />
            
            <div className="relative flex items-center justify-between mb-6">
              <h3 className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">Create New Task</h3>
              <button onClick={() => setShowCreateModal(false)} className="p-2 hover:bg-gray-200/50 rounded-xl transition-colors">
                <svg className="w-6 h-6 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="relative space-y-4 mb-6">
              {/* Title */}
              <div>
                <label className="block text-sm font-bold text-gray-800 mb-2">Task Title *</label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200/60 focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-white/60 backdrop-blur-sm text-gray-900 placeholder-gray-400 transition-all"
                  placeholder="Enter task title"
                  disabled={submitting}
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-bold text-gray-800 mb-2">Description</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={3}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200/60 focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-white/60 backdrop-blur-sm resize-none text-gray-900 placeholder-gray-400 transition-all"
                  placeholder="Enter task description"
                  disabled={submitting}
                />
              </div>

              {/* Grid Row 1 */}
              <div className="grid grid-cols-2 gap-4">
                {/* Assign To */}
                <div>
                  <label className="block text-sm font-bold text-gray-800 mb-2">Assign To *</label>
                  <select
                    value={formData.assignedTo}
                    onChange={(e) => setFormData({ ...formData, assignedTo: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl border border-gray-200/60 focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-white/60 backdrop-blur-sm text-gray-900 transition-all"
                    disabled={submitting}
                  >
                    <option value="">Select Employee</option>
                    {employees.map((emp) => (
                      <option key={emp.id} value={emp.id}>
                        {emp.firstName} {emp.lastName} (ID: {emp.id}) - {emp.email}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Priority */}
                <div>
                  <label className="block text-sm font-bold text-gray-800 mb-2">Priority</label>
                  <select
                    value={formData.priority}
                    onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl border border-gray-200/60 focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-white/60 backdrop-blur-sm text-gray-900 transition-all"
                    disabled={submitting}
                  >
                    <option value="Low">Low</option>
                    <option value="Medium">Medium</option>
                    <option value="High">High</option>
                  </select>
                </div>
              </div>

              {/* Grid Row 2 */}
              <div className="grid grid-cols-2 gap-4">
                {/* Due Date */}
                <div>
                  <label className="block text-sm font-bold text-gray-800 mb-2">Due Date *</label>
                  <input
                    type="date"
                    value={formData.dueDate}
                    onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl border border-gray-200/60 focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-white/60 backdrop-blur-sm text-gray-900 transition-all"
                    disabled={submitting}
                  />
                </div>

                {/* Estimated Hours */}
                <div>
                  <label className="block text-sm font-bold text-gray-800 mb-2">Estimated Hours</label>
                  <input
                    type="number"
                    value={formData.estimatedHours}
                    onChange={(e) => setFormData({ ...formData, estimatedHours: parseInt(e.target.value) || 0 })}
                    className="w-full px-4 py-3 rounded-xl border border-gray-200/60 focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-white/60 backdrop-blur-sm text-gray-900 placeholder-gray-400 transition-all"
                    placeholder="0"
                    disabled={submitting}
                  />
                </div>
              </div>

              {/* Tags */}
              <div>
                <label className="block text-sm font-bold text-gray-800 mb-2">Tags (comma separated)</label>
                <input
                  type="text"
                  value={formData.tags}
                  onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200/60 focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-white/60 backdrop-blur-sm text-gray-900 placeholder-gray-400 transition-all"
                  placeholder="report, finance, important"
                  disabled={submitting}
                />
              </div>
            </div>

            <div className="relative flex gap-3">
              <button
                onClick={() => setShowCreateModal(false)}
                className="flex-1 py-3 rounded-xl border border-gray-300/60 text-gray-700 hover:bg-gray-100/50 font-bold transition-all backdrop-blur-sm disabled:opacity-50"
                disabled={submitting}
              >
                Cancel
              </button>
              <button
                onClick={handleCreateTask}
                className="flex-1 py-3 rounded-xl bg-gradient-to-r from-purple-600 to-blue-600 text-white font-bold shadow-lg shadow-purple-600/40 hover:shadow-xl hover:scale-105 transition-all active:scale-95 disabled:opacity-50 disabled:scale-100 flex items-center justify-center gap-2"
                disabled={submitting}
              >
                {submitting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    Creating...
                  </>
                ) : (
                  "Create Task"
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Task Modal */}
      {showEditModal && selectedTask && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-md z-[999] flex items-center justify-center p-4 overflow-y-auto">
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-white/80 to-white/60 border border-white/40 backdrop-blur-xl max-w-2xl w-full p-8 my-8 shadow-[0_20px_60px_0_rgba(0,0,0,0.3)]">
            <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 to-blue-500/5 pointer-events-none" />
            
            <div className="relative flex items-center justify-between mb-6">
              <h3 className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">Edit Task</h3>
              <button onClick={() => setShowEditModal(false)} className="p-2 hover:bg-gray-200/50 rounded-xl transition-colors">
                <svg className="w-6 h-6 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="relative space-y-4 mb-6">
              {/* Title */}
              <div>
                <label className="block text-sm font-bold text-gray-800 mb-2">Task Title</label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200/60 focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-white/60 backdrop-blur-sm text-gray-900 transition-all"
                  disabled={submitting}
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-bold text-gray-800 mb-2">Description</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={3}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200/60 focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-white/60 backdrop-blur-sm resize-none text-gray-900 transition-all"
                  disabled={submitting}
                />
              </div>

              {/* Grid Row 1 */}
              <div className="grid grid-cols-2 gap-4">
                {/* Priority */}
                <div>
                  <label className="block text-sm font-bold text-gray-800 mb-2">Priority</label>
                  <select
                    value={formData.priority}
                    onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl border border-gray-200/60 focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-white/60 backdrop-blur-sm text-gray-900 transition-all"
                    disabled={submitting}
                  >
                    <option value="Low">Low</option>
                    <option value="Medium">Medium</option>
                    <option value="High">High</option>
                  </select>
                </div>

                {/* Due Date */}
                <div>
                  <label className="block text-sm font-bold text-gray-800 mb-2">Due Date</label>
                  <input
                    type="date"
                    value={formData.dueDate}
                    onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl border border-gray-200/60 focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-white/60 backdrop-blur-sm text-gray-900 transition-all"
                    disabled={submitting}
                  />
                </div>
              </div>

              {/* Estimated Hours */}
              <div>
                <label className="block text-sm font-bold text-gray-800 mb-2">Estimated Hours</label>
                <input
                  type="number"
                  value={formData.estimatedHours}
                  onChange={(e) => setFormData({ ...formData, estimatedHours: parseInt(e.target.value) || 0 })}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200/60 focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-white/60 backdrop-blur-sm text-gray-900 transition-all"
                  disabled={submitting}
                />
              </div>

              {/* Tags */}
              <div>
                <label className="block text-sm font-bold text-gray-800 mb-2">Tags (comma separated)</label>
                <input
                  type="text"
                  value={formData.tags}
                  onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200/60 focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-white/60 backdrop-blur-sm text-gray-900 transition-all"
                  disabled={submitting}
                />
              </div>
            </div>

            <div className="relative flex gap-3">
              <button
                onClick={() => setShowEditModal(false)}
                className="flex-1 py-3 rounded-xl border border-gray-300/60 text-gray-700 hover:bg-gray-100/50 font-bold transition-all backdrop-blur-sm disabled:opacity-50"
                disabled={submitting}
              >
                Cancel
              </button>
              <button
                onClick={handleUpdateTask}
                className="flex-1 py-3 rounded-xl bg-gradient-to-r from-purple-600 to-blue-600 text-white font-bold shadow-lg shadow-purple-600/40 hover:shadow-xl hover:scale-105 transition-all active:scale-95 disabled:opacity-50 disabled:scale-100 flex items-center justify-center gap-2"
                disabled={submitting}
              >
                {submitting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    Updating...
                  </>
                ) : (
                  "Update Task"
                )}
              </button>
            </div>
          </div>
        </div>
      )}
      </>
      )}
    </div>
  );
}
