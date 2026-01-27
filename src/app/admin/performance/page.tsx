'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import {
  Target,
  ClipboardList,
  Users,
  Calendar,
  Plus,
  Star,
  CheckCircle,
  Clock,
  X,
  Edit,
  Trash2,
  Eye,
  Play,
  Lock,
  TrendingUp,
  BarChart3
} from 'lucide-react';
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  RadialBarChart,
  RadialBar
} from 'recharts';

// Types
interface ReviewCycle {
  id: number;
  name: string;
  startDate: string;
  endDate: string;
  status: 'DRAFT' | 'OPEN' | 'CLOSED';
  _count?: {
    goals: number;
    reviews: number;
  };
}

interface PerformanceGoal {
  id: number;
  employeeId: number;
  cycleId: number;
  title: string;
  description: string | null;
  progress: number;
  status: string;
  createdAt: string;
  employee: {
    id: number;
    firstName: string;
    lastName: string;
    email: string;
    jobTitle: string;
    department: string;
  };
  cycle: {
    id: number;
    name: string;
    status: string;
  };
}

export default function AdminPerformancePage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [activeTab, setActiveTab] = useState<'cycles' | 'goals'>('cycles');
  const [cycles, setCycles] = useState<ReviewCycle[]>([]);
  const [goals, setGoals] = useState<PerformanceGoal[]>([]);
  const [selectedCycleId, setSelectedCycleId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modals
  const [showCreateCycleModal, setShowCreateCycleModal] = useState(false);

  // Form states
  const [cycleName, setCycleName] = useState('');
  const [cycleStartDate, setCycleStartDate] = useState('');
  const [cycleEndDate, setCycleEndDate] = useState('');

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin');
    }
  }, [status, router]);

  // Fetch cycles
  const fetchCycles = async () => {
    try {
      const res = await fetch('/api/performance/admin?type=cycles');
      if (!res.ok) throw new Error('Failed to fetch cycles');
      const data = await res.json();
      setCycles(data);
      
      // Select first open cycle by default
      const openCycle = data.find((c: ReviewCycle) => c.status === 'OPEN');
      if (openCycle) setSelectedCycleId(openCycle.id);
      else if (data.length > 0) setSelectedCycleId(data[0].id);
    } catch (err) {
      setError('Error loading cycles');
    }
  };

  // Fetch goals for selected cycle
  const fetchGoals = async (cycleId: number) => {
    try {
      const res = await fetch(`/api/performance/admin?type=goals&cycleId=${cycleId}`);
      if (!res.ok) throw new Error('Failed to fetch goals');
      const data = await res.json();
      setGoals(data);
    } catch (err) {
      setError('Error loading goals');
    }
  };

  useEffect(() => {
    if (status === 'authenticated') {
      fetchCycles().finally(() => setLoading(false));
    }
  }, [status]);

  useEffect(() => {
    if (selectedCycleId) {
      fetchGoals(selectedCycleId);
    }
  }, [selectedCycleId]);

  // Create cycle
  const handleCreateCycle = async () => {
    if (!cycleName || !cycleStartDate || !cycleEndDate) return;
    try {
      const res = await fetch('/api/performance/admin?type=cycles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: cycleName,
          startDate: cycleStartDate,
          endDate: cycleEndDate
        })
      });
      if (!res.ok) throw new Error('Failed to create cycle');
      await fetchCycles();
      setShowCreateCycleModal(false);
      setCycleName('');
      setCycleStartDate('');
      setCycleEndDate('');
    } catch (err) {
      setError('Error creating cycle');
    }
  };

  // Update cycle status
  const handleUpdateCycleStatus = async (cycleId: number, newStatus: 'OPEN' | 'CLOSED') => {
    try {
      const res = await fetch('/api/performance/admin?type=cycles', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: cycleId, status: newStatus })
      });
      if (!res.ok) throw new Error('Failed to update cycle');
      await fetchCycles();
    } catch (err) {
      setError('Error updating cycle');
    }
  };

  // Delete cycle
  const handleDeleteCycle = async (cycleId: number) => {
    if (!confirm('Delete this cycle? This will also delete all related goals and reviews.')) return;
    try {
      const res = await fetch(`/api/performance/admin?type=cycles&id=${cycleId}`, {
        method: 'DELETE'
      });
      if (!res.ok) throw new Error('Failed to delete cycle');
      await fetchCycles();
      if (selectedCycleId === cycleId) {
        setSelectedCycleId(cycles[0]?.id || null);
      }
    } catch (err) {
      setError('Error deleting cycle');
    }
  };

  // Stats
  const stats = {
    totalCycles: cycles.length,
    activeCycles: cycles.filter(c => c.status === 'OPEN').length
  };

  // Calculate analytics data for charts
  const getAnalyticsData = () => {
    if (goals.length === 0) return null;

    // Goal completion stats
    const completedGoals = goals.filter(g => g.status === 'COMPLETED').length;
    const inProgressGoals = goals.filter(g => g.status === 'IN_PROGRESS').length;
    const notStartedGoals = goals.filter(g => g.status === 'NOT_STARTED').length;

    // Progress distribution
    const progressRanges = [
      { name: '0-25%', count: goals.filter(g => g.progress >= 0 && g.progress < 25).length, fill: '#ef4444' },
      { name: '25-50%', count: goals.filter(g => g.progress >= 25 && g.progress < 50).length, fill: '#f97316' },
      { name: '50-75%', count: goals.filter(g => g.progress >= 50 && g.progress < 75).length, fill: '#3b82f6' },
      { name: '75-99%', count: goals.filter(g => g.progress >= 75 && g.progress < 100).length, fill: '#8b5cf6' },
      { name: '100%', count: goals.filter(g => g.progress === 100).length, fill: '#22c55e' }
    ];

    // Employee performance comparison
    const employeePerformance = Object.entries(
      goals.reduce((acc, goal) => {
        const empKey = `${goal.employee.firstName} ${goal.employee.lastName}`;
        if (!acc[empKey]) {
          acc[empKey] = { name: empKey, goals: [], avgProgress: 0, completed: 0 };
        }
        acc[empKey].goals.push(goal);
        return acc;
      }, {} as Record<string, { name: string; goals: PerformanceGoal[]; avgProgress: number; completed: number }>)
    ).map(([_, data]) => ({
      name: data.name.length > 15 ? data.name.substring(0, 15) + '...' : data.name,
      avgProgress: Math.round(data.goals.reduce((sum, g) => sum + g.progress, 0) / data.goals.length),
      completed: data.goals.filter(g => g.status === 'COMPLETED').length,
      total: data.goals.length
    })).sort((a, b) => b.avgProgress - a.avgProgress).slice(0, 8);

    // Department performance
    const deptPerformance = Object.entries(
      goals.reduce((acc, goal) => {
        const dept = goal.employee.department;
        if (!acc[dept]) {
          acc[dept] = { goals: [], avgProgress: 0 };
        }
        acc[dept].goals.push(goal);
        return acc;
      }, {} as Record<string, { goals: PerformanceGoal[]; avgProgress: number }>)
    ).map(([dept, data]) => ({
      name: dept,
      avgProgress: Math.round(data.goals.reduce((sum, g) => sum + g.progress, 0) / data.goals.length),
      goals: data.goals.length
    })).sort((a, b) => b.avgProgress - a.avgProgress);

    // Overall completion rate (for donut chart)
    const completionData = [
      { name: 'Completed', value: completedGoals, fill: '#22c55e' },
      { name: 'In Progress', value: inProgressGoals, fill: '#3b82f6' },
      { name: 'Not Started', value: notStartedGoals, fill: '#94a3b8' }
    ];

    return {
      completionData,
      progressRanges: progressRanges.filter(r => r.count > 0),
      employeePerformance,
      deptPerformance,
      totalGoals: goals.length,
      avgProgress: Math.round(goals.reduce((sum, g) => sum + g.progress, 0) / goals.length)
    };
  };

  const analyticsData = getAnalyticsData();

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 via-purple-50 to-blue-50">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-purple-50 to-blue-50 p-6">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">Performance Management</h1>
        <p className="text-gray-600 mt-1">Manage review cycles and evaluate employee performance</p>
      </div>

      {/* Error Display */}
      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-xl text-red-600 flex justify-between items-center">
          <span>{error}</span>
          <button onClick={() => setError(null)} className="text-red-600 hover:text-red-800 font-bold">✕</button>
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <div className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-purple-500/10 to-purple-600/5 border border-purple-200/40 backdrop-blur-xl p-6 hover:border-purple-300/60 shadow-[0_8px_32px_0_rgba(168,85,247,0.1)] hover:shadow-[0_8px_32px_0_rgba(168,85,247,0.2)] transition-all duration-300">
          <div className="absolute inset-0 bg-gradient-to-br from-purple-500/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
          <div className="relative flex items-start justify-between">
            <div className="flex-1">
              <p className="text-xs text-gray-600 font-semibold uppercase tracking-wider mb-2">Total Cycles</p>
              <p className="text-4xl font-bold bg-gradient-to-r from-purple-600 to-purple-700 bg-clip-text text-transparent">{stats.totalCycles}</p>
            </div>
            <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-purple-400 to-purple-600 flex items-center justify-center shadow-lg shadow-purple-500/30 group-hover:scale-110 transition-transform">
              <Calendar className="w-7 h-7 text-white" />
            </div>
          </div>
        </div>
        <div className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-green-500/10 to-green-600/5 border border-green-200/40 backdrop-blur-xl p-6 hover:border-green-300/60 shadow-[0_8px_32px_0_rgba(34,197,94,0.1)] hover:shadow-[0_8px_32px_0_rgba(34,197,94,0.2)] transition-all duration-300">
          <div className="absolute inset-0 bg-gradient-to-br from-green-500/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
          <div className="relative flex items-start justify-between">
            <div className="flex-1">
              <p className="text-xs text-gray-600 font-semibold uppercase tracking-wider mb-2">Active Cycles</p>
              <p className="text-4xl font-bold bg-gradient-to-r from-green-600 to-green-700 bg-clip-text text-transparent">{stats.activeCycles}</p>
            </div>
            <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-green-400 to-green-600 flex items-center justify-center shadow-lg shadow-green-500/30 group-hover:scale-110 transition-transform">
              <Play className="w-7 h-7 text-white" />
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6">
        <button
          onClick={() => setActiveTab('cycles')}
          className={`px-6 py-2.5 rounded-xl font-semibold transition-all ${
            activeTab === 'cycles'
              ? 'bg-gradient-to-r from-purple-600 to-blue-600 text-white shadow-lg shadow-purple-600/40'
              : 'bg-white/60 backdrop-blur-sm text-gray-700 hover:bg-white/80 border border-gray-200/60'
          }`}
        >
          <Calendar className="w-4 h-4 inline mr-2" />
          Review Cycles
        </button>
        <button
          onClick={() => setActiveTab('goals')}
          className={`px-6 py-2.5 rounded-xl font-semibold transition-all ${
            activeTab === 'goals'
              ? 'bg-gradient-to-r from-purple-600 to-blue-600 text-white shadow-lg shadow-purple-600/40'
              : 'bg-white/60 backdrop-blur-sm text-gray-700 hover:bg-white/80 border border-gray-200/60'
          }`}
        >
          <Target className="w-4 h-4 inline mr-2" />
          Employee Goals
        </button>
      </div>

      {/* Cycles Tab */}
      {activeTab === 'cycles' && (
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-white/40 to-white/20 border border-white/30 backdrop-blur-xl shadow-[0_8px_32px_0_rgba(31,38,135,0.37)]">
          <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 to-blue-500/5 pointer-events-none" />
          <div className="relative p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-gray-900">Review Cycles</h2>
              <button
                onClick={() => setShowCreateCycleModal(true)}
                className="flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-purple-600 to-blue-600 text-white font-semibold shadow-lg shadow-purple-600/40 hover:shadow-xl hover:scale-105 transition-all active:scale-95"
              >
                <Plus className="w-5 h-5" />
                Create Cycle
              </button>
            </div>

          {cycles.length === 0 ? (
            <div className="text-center py-16">
              <div className="w-16 h-16 mx-auto rounded-full bg-gradient-to-br from-purple-400/20 to-blue-400/20 flex items-center justify-center mb-4">
                <Calendar className="w-8 h-8 text-gray-400" />
              </div>
              <p className="text-sm font-semibold text-gray-700">No review cycles yet</p>
              <p className="text-xs text-gray-500 mt-1">Create a cycle to start evaluating performance</p>
            </div>
          ) : (
            <div className="space-y-3">
              {cycles.map((cycle) => (
                <div
                  key={cycle.id}
                  className="group relative overflow-hidden rounded-xl bg-white/60 backdrop-blur-sm border border-gray-200/60 p-4 hover:bg-white/80 hover:border-purple-300/60 transition-all duration-300 hover:shadow-lg"
                >
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <h3 className="text-lg font-bold text-gray-900 group-hover:text-purple-600 transition-colors">{cycle.name}</h3>
                      <p className="text-sm text-gray-600 mt-1">
                        {new Date(cycle.startDate).toLocaleDateString()} - {new Date(cycle.endDate).toLocaleDateString()}
                      </p>
                      <div className="flex gap-4 mt-2 text-sm text-gray-600">
                        <span className="flex items-center gap-1">
                          <Target className="w-4 h-4" />
                          {cycle._count?.goals || 0} goals
                        </span>
                        <span className="flex items-center gap-1">
                          <ClipboardList className="w-4 h-4" />
                          {cycle._count?.reviews || 0} reviews
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold ${
                          cycle.status === 'OPEN'
                            ? 'bg-green-100 text-green-800'
                            : cycle.status === 'CLOSED'
                            ? 'bg-gray-100 text-gray-800'
                            : 'bg-yellow-100 text-yellow-800'
                        }`}
                      >
                        {cycle.status}
                      </span>
                      {cycle.status === 'DRAFT' && (
                        <button
                          onClick={() => handleUpdateCycleStatus(cycle.id, 'OPEN')}
                          className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                          title="Open Cycle"
                        >
                          <Play className="w-4 h-4" />
                        </button>
                      )}
                      {cycle.status === 'OPEN' && (
                        <button
                          onClick={() => handleUpdateCycleStatus(cycle.id, 'CLOSED')}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="Close Cycle"
                        >
                          <Lock className="w-4 h-4" />
                        </button>
                      )}
                      <button
                        onClick={() => handleDeleteCycle(cycle.id)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="Delete Cycle"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
      )}

      {/* Employee Goals Tab */}
      {activeTab === 'goals' && (
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-white/40 to-white/20 border border-white/30 backdrop-blur-xl shadow-[0_8px_32px_0_rgba(31,38,135,0.37)]">
          <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 to-blue-500/5 pointer-events-none" />
          <div className="relative p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-gray-900">Employee Goals</h2>
              <select
                value={selectedCycleId || ''}
                onChange={(e) => setSelectedCycleId(Number(e.target.value))}
                className="px-4 py-2.5 rounded-lg bg-white/60 backdrop-blur-sm border border-gray-200/60 focus:ring-2 focus:ring-purple-500 focus:border-transparent text-gray-900 text-sm font-medium hover:bg-white/80 transition-all"
              >
                {cycles.map((cycle) => (
                  <option key={cycle.id} value={cycle.id}>
                    {cycle.name}
                  </option>
                ))}
              </select>
            </div>

            {goals.length === 0 ? (
              <div className="text-center py-16">
                <div className="w-16 h-16 mx-auto rounded-full bg-gradient-to-br from-purple-400/20 to-blue-400/20 flex items-center justify-center mb-4">
                  <Target className="w-8 h-8 text-gray-400" />
                </div>
                <p className="text-sm font-semibold text-gray-700">No goals for this cycle</p>
                <p className="text-xs text-gray-500 mt-1">Employees haven't added any goals yet</p>
              </div>
            ) : (
              <>
                {/* Analytics Dashboard */}
                {analyticsData && (
                  <div className="mb-6 space-y-4">
                    {/* Overview Stats */}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                      <div className="bg-gradient-to-br from-blue-50 to-blue-100/50 border border-blue-200 rounded-xl p-4">
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 rounded-lg bg-blue-500 flex items-center justify-center">
                            <Target className="w-6 h-6 text-white" />
                          </div>
                          <div>
                            <p className="text-xs text-blue-600 font-semibold">Total Goals</p>
                            <p className="text-2xl font-bold text-blue-900">{analyticsData.totalGoals}</p>
                          </div>
                        </div>
                      </div>
                      <div className="bg-gradient-to-br from-green-50 to-green-100/50 border border-green-200 rounded-xl p-4">
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 rounded-lg bg-green-500 flex items-center justify-center">
                            <CheckCircle className="w-6 h-6 text-white" />
                          </div>
                          <div>
                            <p className="text-xs text-green-600 font-semibold">Completed</p>
                            <p className="text-2xl font-bold text-green-900">{analyticsData.completionData[0].value}</p>
                          </div>
                        </div>
                      </div>
                      <div className="bg-gradient-to-br from-purple-50 to-purple-100/50 border border-purple-200 rounded-xl p-4">
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 rounded-lg bg-purple-500 flex items-center justify-center">
                            <TrendingUp className="w-6 h-6 text-white" />
                          </div>
                          <div>
                            <p className="text-xs text-purple-600 font-semibold">Avg Progress</p>
                            <p className="text-2xl font-bold text-purple-900">{analyticsData.avgProgress}%</p>
                          </div>
                        </div>
                      </div>
                      <div className="bg-gradient-to-br from-orange-50 to-orange-100/50 border border-orange-200 rounded-xl p-4">
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 rounded-lg bg-orange-500 flex items-center justify-center">
                            <Users className="w-6 h-6 text-white" />
                          </div>
                          <div>
                            <p className="text-xs text-orange-600 font-semibold">Employees</p>
                            <p className="text-2xl font-bold text-orange-900">{analyticsData.employeePerformance.length}</p>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Charts Grid */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                      {/* Goal Completion Donut Chart */}
                      <div className="bg-white/60 backdrop-blur-sm border border-gray-200/60 rounded-xl p-5">
                        <div className="flex items-center gap-2 mb-4">
                          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-green-400 to-green-600 flex items-center justify-center">
                            <CheckCircle className="w-5 h-5 text-white" />
                          </div>
                          <h3 className="text-lg font-bold text-gray-900">Goal Status Distribution</h3>
                        </div>
                        <ResponsiveContainer width="100%" height={280}>
                          <PieChart>
                            <Pie
                              data={analyticsData.completionData}
                              cx="50%"
                              cy="50%"
                              innerRadius={60}
                              outerRadius={100}
                              paddingAngle={5}
                              dataKey="value"
                              label={(entry: any) => `${entry.name}: ${entry.value}`}
                            >
                              {analyticsData.completionData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={entry.fill} />
                              ))}
                            </Pie>
                            <Tooltip />
                          </PieChart>
                        </ResponsiveContainer>
                      </div>

                      {/* Progress Distribution Bar Chart */}
                      <div className="bg-white/60 backdrop-blur-sm border border-gray-200/60 rounded-xl p-5">
                        <div className="flex items-center gap-2 mb-4">
                          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center">
                            <BarChart3 className="w-5 h-5 text-white" />
                          </div>
                          <h3 className="text-lg font-bold text-gray-900">Progress Distribution</h3>
                        </div>
                        <ResponsiveContainer width="100%" height={280}>
                          <BarChart data={analyticsData.progressRanges}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                            <XAxis dataKey="name" stroke="#6b7280" style={{ fontSize: '12px' }} />
                            <YAxis stroke="#6b7280" style={{ fontSize: '12px' }} />
                            <Tooltip 
                              contentStyle={{ 
                                backgroundColor: 'white', 
                                border: '1px solid #e5e7eb', 
                                borderRadius: '8px',
                                fontSize: '12px'
                              }} 
                            />
                            <Bar dataKey="count" radius={[8, 8, 0, 0]}>
                              {analyticsData.progressRanges.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={entry.fill} />
                              ))}
                            </Bar>
                          </BarChart>
                        </ResponsiveContainer>
                      </div>

                      {/* Employee Performance Comparison */}
                      <div className="bg-white/60 backdrop-blur-sm border border-gray-200/60 rounded-xl p-5 lg:col-span-2">
                        <div className="flex items-center gap-2 mb-4">
                          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-400 to-purple-600 flex items-center justify-center">
                            <TrendingUp className="w-5 h-5 text-white" />
                          </div>
                          <h3 className="text-lg font-bold text-gray-900">Top Employee Performance</h3>
                        </div>
                        <ResponsiveContainer width="100%" height={300}>
                          <BarChart data={analyticsData.employeePerformance} layout="horizontal">
                            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                            <XAxis type="number" domain={[0, 100]} stroke="#6b7280" style={{ fontSize: '12px' }} />
                            <YAxis type="category" dataKey="name" stroke="#6b7280" style={{ fontSize: '11px' }} width={120} />
                            <Tooltip 
                              contentStyle={{ 
                                backgroundColor: 'white', 
                                border: '1px solid #e5e7eb', 
                                borderRadius: '8px',
                                fontSize: '12px'
                              }}
                              formatter={(value, name) => {
                                if (name === 'avgProgress') return [`${value}%`, 'Avg Progress'];
                                return [value, name];
                              }}
                            />
                            <Legend />
                            <Bar dataKey="avgProgress" fill="#8b5cf6" name="Avg Progress %" radius={[0, 8, 8, 0]} />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>

                      {/* Department Performance */}
                      {analyticsData.deptPerformance.length > 1 && (
                        <div className="bg-white/60 backdrop-blur-sm border border-gray-200/60 rounded-xl p-5 lg:col-span-2">
                          <div className="flex items-center gap-2 mb-4">
                            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center">
                              <Users className="w-5 h-5 text-white" />
                            </div>
                            <h3 className="text-lg font-bold text-gray-900">Department Performance</h3>
                          </div>
                          <ResponsiveContainer width="100%" height={280}>
                            <BarChart data={analyticsData.deptPerformance}>
                              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                              <XAxis dataKey="name" stroke="#6b7280" style={{ fontSize: '12px' }} />
                              <YAxis stroke="#6b7280" style={{ fontSize: '12px' }} domain={[0, 100]} />
                              <Tooltip 
                                contentStyle={{ 
                                  backgroundColor: 'white', 
                                  border: '1px solid #e5e7eb', 
                                  borderRadius: '8px',
                                  fontSize: '12px'
                                }}
                                formatter={(value, name) => {
                                  if (name === 'avgProgress') return [`${value}%`, 'Avg Progress'];
                                  if (name === 'goals') return [value, 'Total Goals'];
                                  return [value, name];
                                }}
                              />
                              <Legend />
                              <Bar dataKey="avgProgress" fill="#3b82f6" name="Avg Progress %" radius={[8, 8, 0, 0]} />
                              <Bar dataKey="goals" fill="#8b5cf6" name="Total Goals" radius={[8, 8, 0, 0]} />
                            </BarChart>
                          </ResponsiveContainer>
                        </div>
                      )}
                    </div>

                    {/* Divider */}
                    <div className="border-t border-gray-200 my-6"></div>
                  </div>
                )}

                {/* Employee Goals List */}
                <div className="space-y-4">
                {/* Group goals by employee */}
                {Object.entries(
                  goals.reduce((acc, goal) => {
                    const empKey = goal.employeeId;
                    if (!acc[empKey]) acc[empKey] = [];
                    acc[empKey].push(goal);
                    return acc;
                  }, {} as Record<number, PerformanceGoal[]>)
                ).map(([employeeId, employeeGoals]) => {
                  const employee = employeeGoals[0].employee;
                  const totalProgress = Math.round(
                    employeeGoals.reduce((sum, g) => sum + g.progress, 0) / employeeGoals.length
                  );
                  const completedCount = employeeGoals.filter(g => g.status === 'COMPLETED').length;

                  return (
                    <div key={employeeId} className="group relative overflow-hidden rounded-xl bg-white/60 backdrop-blur-sm border border-gray-200/60 p-5 hover:bg-white/80 hover:border-purple-300/60 transition-all duration-300 hover:shadow-lg">
                      {/* Employee Header */}
                      <div className="flex justify-between items-start mb-4 pb-3 border-b border-gray-200">
                        <div className="flex-1">
                          <h3 className="text-lg font-bold text-gray-900 group-hover:text-purple-600 transition-colors">
                            {employee.firstName} {employee.lastName}
                          </h3>
                          <p className="text-sm text-gray-600">
                            {employee.jobTitle} • {employee.department}
                          </p>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="text-right">
                            <p className="text-xs text-gray-500">Avg Progress</p>
                            <p className="text-2xl font-bold text-purple-600">{totalProgress}%</p>
                          </div>
                          <div className="text-right">
                            <p className="text-xs text-gray-500">Completed</p>
                            <p className="text-2xl font-bold text-green-600">
                              {completedCount}/{employeeGoals.length}
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Goals List */}
                      <div className="space-y-3">
                        {employeeGoals.map((goal) => (
                          <div key={goal.id} className="flex items-center gap-3 p-3 bg-gray-50/50 rounded-lg">
                            <div className="flex-1">
                              <p className="font-semibold text-gray-900">{goal.title}</p>
                              {goal.description && (
                                <p className="text-xs text-gray-600 mt-1">{goal.description}</p>
                              )}
                            </div>
                            <div className="flex items-center gap-3">
                              <div className="w-32">
                                <div className="flex justify-between text-xs text-gray-600 mb-1">
                                  <span>Progress</span>
                                  <span className="font-semibold">{goal.progress}%</span>
                                </div>
                                <div className="w-full bg-gray-200 rounded-full h-2">
                                  <div
                                    className={`h-2 rounded-full transition-all ${
                                      goal.progress === 100
                                        ? 'bg-gradient-to-r from-green-400 to-green-600'
                                        : goal.progress >= 50
                                        ? 'bg-gradient-to-r from-blue-400 to-blue-600'
                                        : goal.progress > 0
                                        ? 'bg-gradient-to-r from-orange-400 to-orange-600'
                                        : 'bg-gray-300'
                                    }`}
                                    style={{ width: `${goal.progress}%` }}
                                  />
                                </div>
                              </div>
                              <span
                                className={`px-3 py-1 rounded-lg text-xs font-bold ${
                                  goal.status === 'COMPLETED'
                                    ? 'bg-green-100 text-green-800'
                                    : goal.status === 'IN_PROGRESS'
                                    ? 'bg-blue-100 text-blue-800'
                                    : 'bg-gray-100 text-gray-800'
                                }`}
                              >
                                {goal.status.replace('_', ' ')}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Create Cycle Modal */}
      {showCreateCycleModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md border border-gray-200 shadow-2xl">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold text-gray-900">Create Review Cycle</h3>
              <button onClick={() => setShowCreateCycleModal(false)} className="text-gray-400 hover:text-gray-600 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Cycle Name</label>
                <input
                  type="text"
                  value={cycleName}
                  onChange={(e) => setCycleName(e.target.value)}
                  placeholder="Q4 2024 Review"
                  className="w-full px-4 py-2.5 rounded-lg bg-gray-50 border border-gray-200 focus:ring-2 focus:ring-purple-500 focus:border-transparent text-gray-900 placeholder-gray-400 transition-all"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Start Date</label>
                <input
                  type="date"
                  value={cycleStartDate}
                  onChange={(e) => setCycleStartDate(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-lg bg-gray-50 border border-gray-200 focus:ring-2 focus:ring-purple-500 focus:border-transparent text-gray-900 transition-all"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">End Date</label>
                <input
                  type="date"
                  value={cycleEndDate}
                  onChange={(e) => setCycleEndDate(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-lg bg-gray-50 border border-gray-200 focus:ring-2 focus:ring-purple-500 focus:border-transparent text-gray-900 transition-all"
                />
              </div>
              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => setShowCreateCycleModal(false)}
                  className="flex-1 px-4 py-2.5 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 font-medium transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreateCycle}
                  className="flex-1 px-4 py-2.5 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg hover:shadow-lg font-semibold transition-all"
                >
                  Create
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
