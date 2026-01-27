"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

// Types
type Goal = {
  id: number;
  title: string;
  description?: string | null;
  progress: number;
  status: string;
  cycleId: number;
  cycle?: { id: number; name: string; status: string };
};

type ReviewCycle = {
  id: number;
  name: string;
  startDate: string;
  endDate: string;
  status: string;
};

export default function PerformancePage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [activeCycle, setActiveCycle] = useState<ReviewCycle | null>(null);

  // Modal states
  const [showAddGoal, setShowAddGoal] = useState(false);
  const [showUpdateProgress, setShowUpdateProgress] = useState<Goal | null>(null);
  const [saving, setSaving] = useState(false);

  // Form states
  const [newGoal, setNewGoal] = useState({ title: "", description: "" });
  const [progressValue, setProgressValue] = useState(0);

  // Fetch data on mount
  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch active cycle
      const cycleRes = await fetch("/api/performance/employee?type=cycles");
      const cycleData = await cycleRes.json();
      
      if (cycleData && cycleData.id) {
        setActiveCycle(cycleData);

        // Fetch goals for this cycle
        const goalsRes = await fetch(`/api/performance/employee?type=goals&cycleId=${cycleData.id}`);
        const goalsData = await goalsRes.json();
        if (Array.isArray(goalsData)) {
          setGoals(goalsData);
        }
      }
    } catch (err) {
      setError("Failed to load performance data");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Create goal
  const handleAddGoal = async () => {
    if (!activeCycle || !newGoal.title.trim()) return;
    
    try {
      setSaving(true);
      const res = await fetch("/api/performance/employee?type=goals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cycleId: activeCycle.id,
          title: newGoal.title,
          description: newGoal.description || null,
        }),
      });

      const data = await res.json();
      if (res.ok && data) {
        setGoals([data, ...goals]);
        setNewGoal({ title: "", description: "" });
        setShowAddGoal(false);
      } else {
        setError(data.error || "Failed to add goal");
      }
    } catch (err) {
      setError("Failed to add goal");
    } finally {
      setSaving(false);
    }
  };

  // Update goal progress
  const handleUpdateProgress = async () => {
    if (!showUpdateProgress) return;

    try {
      setSaving(true);
      const newStatus = progressValue >= 100 ? "COMPLETED" : progressValue > 0 ? "IN_PROGRESS" : "NOT_STARTED";
      
      const res = await fetch("/api/performance/employee?type=goals", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: showUpdateProgress.id,
          progress: progressValue,
          status: newStatus,
        }),
      });

      const data = await res.json();
      if (res.ok && data) {
        setGoals(goals.map((g) => (g.id === data.id ? data : g)));
        setShowUpdateProgress(null);
      } else {
        setError(data.error || "Failed to update progress");
      }
    } catch (err) {
      setError("Failed to update progress");
    } finally {
      setSaving(false);
    }
  };

  // Mark goal complete
  const handleMarkComplete = async (goal: Goal) => {
    try {
      setSaving(true);
      const res = await fetch("/api/performance/employee?type=goals", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: goal.id, progress: 100, status: "COMPLETED" }),
      });

      const data = await res.json();
      if (res.ok && data) {
        setGoals(goals.map((g) => (g.id === data.id ? data : g)));
      }
    } catch (err) {
      setError("Failed to mark complete");
    } finally {
      setSaving(false);
    }
  };

  // Delete goal
  const handleDeleteGoal = async (goalId: number) => {
    if (!confirm("Are you sure you want to delete this goal?")) return;
    
    try {
      const res = await fetch(`/api/performance/employee?type=goals&id=${goalId}`, { method: "DELETE" });
      if (res.ok) {
        setGoals(goals.filter((g) => g.id !== goalId));
      }
    } catch (err) {
      setError("Failed to delete goal");
    }
  };

  // Derived stats
  const totalGoals = goals.length;
  const completedGoals = goals.filter((g) => g.status === "COMPLETED").length;
  const avgProgress = goals.length > 0 
    ? Math.round(goals.reduce((sum, g) => sum + (g.progress || 0), 0) / goals.length)
    : 0;

  const statusBadge = (s: string) => {
    switch (s) {
      case "COMPLETED": return "bg-green-100 text-green-800";
      case "IN_PROGRESS": return "bg-blue-100 text-blue-800";
      default: return "bg-gray-100 text-gray-800";
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

      {/* Loading (kept similar to Task page) */}
      {loading && (
        <div className="flex items-center justify-center py-16">
          <div className="text-center">
            <div className="w-12 h-12 rounded-full border-4 border-orange-200 border-t-orange-600 animate-spin mx-auto mb-4" />
            <p className="text-gray-600 font-medium">Loading your performance data...</p>
          </div>
        </div>
      )}

      {/* Header Section */}
      <div className="bg-gradient-to-r from-orange-50 to-orange-100/50 rounded-2xl border border-orange-200 p-6 lg:p-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center shadow-lg">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 3v18m-4-6v6m8-12v12m4-9v9" />
              </svg>
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900">Performance</h1>
              <p className="text-sm text-gray-600 mt-1">Track goals and reviews</p>
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
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Total Goals */}
        <div className="bg-white rounded-2xl shadow-lg border border-blue-100 p-5 lg:p-6 hover:shadow-xl transition-all hover:border-blue-200">
          <div className="flex items-start justify-between mb-3">
            <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-blue-400 to-blue-500 flex items-center justify-center shadow-lg">
              <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7h18M5 10h14M7 13h10M9 16h6" />
              </svg>
            </div>
          </div>
          <p className="text-xs text-gray-600 font-medium uppercase tracking-wider">Active Goals</p>
          <p className="text-3xl font-bold text-gray-900 mt-2">{totalGoals}</p>
          <p className="text-xs text-blue-600 mt-2 font-medium">Currently tracked</p>
        </div>

        {/* Completed Goals */}
        <div className="bg-white rounded-2xl shadow-lg border border-green-100 p-5 lg:p-6 hover:shadow-xl transition-all hover:border-green-200">
          <div className="flex items-start justify-between mb-3">
            <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-green-400 to-green-500 flex items-center justify-center shadow-lg">
              <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
          </div>
          <p className="text-xs text-gray-600 font-medium uppercase tracking-wider">Completed</p>
          <p className="text-3xl font-bold text-gray-900 mt-2">{completedGoals}</p>
          <p className="text-xs text-green-600 mt-2 font-medium">Finished goals</p>
        </div>

        {/* Average Progress */}
        <div className="bg-white rounded-2xl shadow-lg border border-purple-100 p-5 lg:p-6 hover:shadow-xl transition-all hover:border-purple-200">
          <div className="flex items-start justify-between mb-3">
            <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-purple-400 to-purple-500 flex items-center justify-center shadow-lg">
              <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 3v18m-4-6v6m8-12v12m4-9v9" />
              </svg>
            </div>
          </div>
          <p className="text-xs text-gray-600 font-medium uppercase tracking-wider">Avg Progress</p>
          <p className="text-3xl font-bold text-gray-900 mt-2">{avgProgress}%</p>
          <p className="text-xs text-purple-600 mt-2 font-medium">Across all goals</p>
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* My Goals */}
        <div className="lg:col-span-2 bg-white rounded-2xl shadow-lg border border-gray-100 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <svg className="w-5 h-5 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 3v18m-4-6v6m8-12v12m4-9v9" />
              </svg>
              <span className="text-sm font-bold text-gray-900">My Goals</span>
            </div>
            <button
              onClick={() => setShowAddGoal(true)}
              disabled={!activeCycle || activeCycle.status !== "OPEN"}
              className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-orange-500 to-orange-600 text-white text-sm font-semibold shadow-lg shadow-orange-500/30 hover:shadow-xl transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Add Goal
            </button>
          </div>

          {!activeCycle && !loading && (
            <div className="text-center py-12">
              <div className="w-16 h-16 rounded-full bg-yellow-50 flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-yellow-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <p className="text-gray-600">No active review cycle. Contact admin to open a cycle.</p>
            </div>
          )}

          {activeCycle && goals.length === 0 && !loading && (
            <div className="text-center py-12">
              <div className="w-16 h-16 rounded-full bg-orange-50 flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11 3v18m-4-6v6m8-12v12m4-9v9" />
                </svg>
              </div>
              <p className="text-gray-600">No goals yet. Add your first goal!</p>
            </div>
          )}

          {goals.length > 0 && (
            <div className="space-y-4">
              {goals.map((g) => (
                <div key={g.id} className="rounded-2xl border border-gray-100 p-5 hover:border-orange-200 hover:shadow-md transition-all">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <div className="w-1.5 h-5 rounded-full bg-orange-500" />
                        <h3 className="text-base font-bold text-gray-900">{g.title}</h3>
                      </div>
                      {g.description && (
                        <p className="text-sm text-gray-600 mb-3">{g.description}</p>
                      )}
                      <div className="flex flex-wrap gap-2 mb-3">
                        <span className="px-2.5 py-1 rounded-lg bg-gray-100 text-gray-700 text-xs font-medium">Progress: {g.progress}%</span>
                        <span className={`px-2.5 py-1 rounded-lg text-xs font-semibold ${statusBadge(g.status)}`}>
                          {g.status === "IN_PROGRESS" ? "In Progress" : g.status === "COMPLETED" ? "Completed" : "Not Started"}
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2.5 overflow-hidden">
                        <div
                          className={`h-2.5 rounded-full transition-all duration-300 ${
                            g.progress === 100
                              ? "bg-gradient-to-r from-green-500 to-green-600"
                              : g.progress >= 50
                              ? "bg-gradient-to-r from-blue-500 to-blue-600"
                              : g.progress > 0
                              ? "bg-gradient-to-r from-orange-500 to-orange-600"
                              : "bg-gray-300"
                          }`}
                          style={{ width: `${g.progress}%` }}
                        />
                      </div>
                    </div>
                    <div className="flex flex-col gap-2 min-w-[140px]">
                      <button
                        onClick={() => { setShowUpdateProgress(g); setProgressValue(g.progress); }}
                        disabled={activeCycle?.status !== "OPEN"}
                        className="px-3 py-2 rounded-xl border-2 border-orange-300 text-orange-700 text-xs font-semibold hover:bg-orange-50 hover:border-orange-400 transition-all disabled:opacity-50"
                      >
                        Update Progress
                      </button>
                      {g.status !== "COMPLETED" && (
                        <button
                          onClick={() => handleMarkComplete(g)}
                          disabled={saving || activeCycle?.status !== "OPEN"}
                          className="px-3 py-2 rounded-xl bg-gradient-to-r from-green-500 to-green-600 text-white text-xs font-semibold shadow hover:shadow-md transition-all disabled:opacity-50"
                        >
                          Mark Complete
                        </button>
                      )}
                      <button
                        onClick={() => handleDeleteGoal(g.id)}
                        disabled={activeCycle?.status !== "OPEN"}
                        className="px-3 py-2 rounded-xl border-2 border-red-300 text-red-600 text-xs font-semibold hover:bg-red-50 hover:border-red-400 transition-all disabled:opacity-50"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Add Goal Modal */}
      {showAddGoal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Add New Goal</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Title *</label>
                <input
                  type="text"
                  value={newGoal.title}
                  onChange={(e) => setNewGoal({ ...newGoal, title: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl border-2 border-gray-200 focus:ring-2 focus:ring-orange-400 focus:border-transparent"
                  placeholder="Enter goal title"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea
                  value={newGoal.description}
                  onChange={(e) => setNewGoal({ ...newGoal, description: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl border-2 border-gray-200 focus:ring-2 focus:ring-orange-400 focus:border-transparent"
                  rows={3}
                  placeholder="Optional description"
                />
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => { setShowAddGoal(false); setNewGoal({ title: "", description: "" }); }}
                className="flex-1 px-4 py-2.5 rounded-xl border-2 border-gray-300 text-gray-700 font-semibold hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleAddGoal}
                disabled={saving || !newGoal.title.trim()}
                className="flex-1 px-4 py-2.5 rounded-xl bg-gradient-to-r from-orange-500 to-orange-600 text-white font-semibold disabled:opacity-50"
              >
                {saving ? "Adding..." : "Add Goal"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Update Progress Modal */}
      {showUpdateProgress && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-2">Update Progress</h2>
            <p className="text-sm text-gray-600 mb-4">{showUpdateProgress.title}</p>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">Progress: {progressValue}%</label>
              <input
                type="range"
                min="0"
                max="100"
                value={progressValue}
                onChange={(e) => setProgressValue(parseInt(e.target.value))}
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-orange-500"
              />
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setShowUpdateProgress(null)}
                className="flex-1 px-4 py-2.5 rounded-xl border-2 border-gray-300 text-gray-700 font-semibold hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleUpdateProgress}
                disabled={saving}
                className="flex-1 px-4 py-2.5 rounded-xl bg-gradient-to-r from-orange-500 to-orange-600 text-white font-semibold disabled:opacity-50"
              >
                {saving ? "Saving..." : "Save"}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
