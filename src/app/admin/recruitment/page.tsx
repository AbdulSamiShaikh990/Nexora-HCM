"use client";
import { useEffect, useMemo, useState } from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from "recharts";

type ByStage = Record<string, number>;

export default function RecruitmentPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [jobsCount, setJobsCount] = useState(0);
  const [totalApps, setTotalApps] = useState(0);
  const [byStage, setByStage] = useState<ByStage>({});

  async function load() {
    setLoading(true);
    setError(null);
    try {
      // cspell:ignore recuirment
      const [jr, ar] = await Promise.all([
        fetch("/api/recuirment/jobs"),
        fetch("/api/recuirment/analytics"),
      ]);
      const [j, a] = await Promise.all([jr.json(), ar.json()]);
      if (!jr.ok) throw new Error(j?.error || "Failed to load jobs");
      if (!ar.ok) throw new Error(a?.error || "Failed to load analytics");
      setJobsCount(Array.isArray(j) ? j.length : 0);
      setTotalApps(Number(a?.total || 0));
      setByStage(a?.byStage || {});
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : "Error";
      setError(message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  const remaining = useMemo(() => {
    const hired = byStage["hired"] || 0;
    const rejected = byStage["rejected"] || 0;
    return Math.max(0, totalApps - (hired + rejected));
  }, [byStage, totalApps]);

  // Professional status-based colors
  const getStageColor = (stage: string) => {
    switch (stage.toLowerCase()) {
      case 'applied': return '#64748b'; // Neutral gray
      case 'screening': return '#3b82f6'; // Professional blue
      case 'interview': return '#f59e0b'; // Amber
      case 'hired': return '#10b981'; // Success green
      case 'rejected': return '#ef4444'; // Professional red
      default: return '#64748b';
    }
  };

  // Prepare chart data
  const barChartData = useMemo(() => {
    const stages = ["applied", "screening", "interview", "hired", "rejected"];
    return stages.map(stage => ({
      stage: stage.charAt(0).toUpperCase() + stage.slice(1),
      count: byStage[stage] || 0,
      fill: getStageColor(stage)
    }));
  }, [byStage]);

  const pieChartData = useMemo(() => {
    return Object.entries(byStage)
      .filter(([stage, count]) => stage && count > 0)
      .map(([stage, count]) => ({
        name: stage.charAt(0).toUpperCase() + stage.slice(1),
        value: count,
        fill: getStageColor(stage)
      }));
  }, [byStage]);

  return (
    <div className="min-h-screen relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-blue-600/10 via-cyan-600/10 to-teal-600/10"></div>
      <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiM5YzkyYWMiIGZpbGwtb3BhY2l0eT0iMC4wNSI+PHBhdGggZD0iTTM2IDM0djItaDJ2LTJoLTJ6bTAtNHYyaDJ2LTJoLTJ6bTAtNHYyaDJ2LTJoLTJ6bTAtNHYyaDJ2LTJoLTJ6Ii8+PC9nPjwvZz48L3N2Zz4=')] opacity-30"></div>
      <div className="max-w-7xl mx-auto px-4 py-8 space-y-8 relative z-10">
        {/* Header */}
        <div className="text-center backdrop-blur-xl bg-white/60 rounded-3xl border border-white/40 shadow-xl p-8">
          <h1 className="text-5xl font-bold bg-gradient-to-r from-blue-600 via-cyan-600 to-teal-600 bg-clip-text text-transparent">
            Recruitment Hub
          </h1>
          <p className="mt-3 text-lg text-slate-700 font-medium">
            Manage job postings and hiring pipeline with AI-powered assessments
          </p>
        </div>

        {/* Quick Actions - Moved to Top */}
        <div className="backdrop-blur-xl bg-white/60 rounded-3xl border border-white/40 shadow-xl p-6">
          <h3 className="text-xl font-bold text-slate-900 mb-4">Quick Actions</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <a href="/admin/recruitment/jobs" className="flex items-center gap-3 p-4 backdrop-blur-md bg-white/50 rounded-2xl hover:bg-white/70 hover:scale-105 transition-all duration-300 group border border-white/40 shadow-lg">
              <div className="w-10 h-10 bg-gradient-to-br from-slate-700 to-slate-900 rounded-xl shadow-lg flex items-center justify-center text-white">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
              </div>
              <span className="font-bold text-slate-900">Create New Job</span>
            </a>
            
            <a href="/admin/recruitment/applications" className="flex items-center gap-3 p-4 backdrop-blur-md bg-white/50 rounded-2xl hover:bg-white/70 hover:scale-105 transition-all duration-300 group border border-white/40 shadow-lg">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-cyan-600 rounded-xl shadow-lg flex items-center justify-center text-white">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <span className="font-bold text-slate-900">Review Applications</span>
            </a>
            
            <a href="/admin/recruitment/pipeline" className="flex items-center gap-3 p-4 backdrop-blur-md bg-white/50 rounded-2xl hover:bg-white/70 hover:scale-105 transition-all duration-300 group border border-white/40 shadow-lg">
              <div className="w-10 h-10 bg-gradient-to-br from-amber-600 to-orange-600 rounded-xl shadow-lg flex items-center justify-center text-white">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              </div>
              <span className="font-bold text-slate-900">Manage Pipeline</span>
            </a>
            
            <a href="/admin/recruitment/analytics" className="flex items-center gap-3 p-4 backdrop-blur-md bg-white/50 rounded-2xl hover:bg-white/70 hover:scale-105 transition-all duration-300 group border border-white/40 shadow-lg">
              <div className="w-10 h-10 bg-gradient-to-br from-slate-700 to-slate-900 rounded-xl shadow-lg flex items-center justify-center text-white">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <span className="font-bold text-slate-900">View Analytics</span>
            </a>
          </div>
        </div>

        {/* Navigation Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <a href="/admin/recruitment/jobs" className="group block">
            <div className="backdrop-blur-xl bg-gradient-to-br from-slate-500/10 to-slate-700/10 rounded-3xl border border-white/40 shadow-xl hover:shadow-2xl hover:scale-[1.05] transition-all duration-300 p-6">
              <div className="text-center">
                <div className="w-14 h-14 bg-gradient-to-br from-slate-700 to-slate-900 rounded-2xl shadow-xl flex items-center justify-center mx-auto mb-4">
                  <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2-2v2m8 0V6a2 2 0 012 2v6M8 8v10l4-2 4 2V8a2 2 0 00-2-2H10a2 2 0 00-2 2z" />
                  </svg>
                </div>
                <h3 className="text-xl font-bold text-slate-900 mb-2">Jobs</h3>
                <p className="text-slate-700 text-sm mb-3 font-medium">Create and manage job postings</p>
                <div className="backdrop-blur-md bg-slate-600/20 text-slate-800 px-4 py-2 rounded-xl text-sm font-bold inline-block border border-slate-400/30">
                  {jobsCount} Active Jobs
                </div>
              </div>
            </div>
          </a>

          <a href="/admin/recruitment/applications" className="group block">
            <div className="backdrop-blur-xl bg-gradient-to-br from-blue-500/10 to-cyan-500/10 rounded-3xl border border-white/40 shadow-xl hover:shadow-2xl hover:scale-[1.05] transition-all duration-300 p-6">
              <div className="text-center">
                <div className="w-14 h-14 bg-gradient-to-br from-blue-600 to-cyan-600 rounded-2xl shadow-xl flex items-center justify-center mx-auto mb-4">
                  <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <h3 className="text-xl font-bold text-slate-900 mb-2">Applications</h3>
                <p className="text-slate-700 text-sm mb-3 font-medium">Review and manage applications</p>
                <div className="backdrop-blur-md bg-blue-600/20 text-blue-800 px-4 py-2 rounded-xl text-sm font-bold inline-block border border-blue-400/30">
                  {totalApps} Total Apps
                </div>
              </div>
            </div>
          </a>

          <a href="/admin/recruitment/pipeline" className="group block">
            <div className="backdrop-blur-xl bg-gradient-to-br from-amber-500/10 to-orange-500/10 rounded-3xl border border-white/40 shadow-xl hover:shadow-2xl hover:scale-[1.05] transition-all duration-300 p-6">
              <div className="text-center">
                <div className="w-14 h-14 bg-gradient-to-br from-amber-600 to-orange-600 rounded-2xl shadow-xl flex items-center justify-center mx-auto mb-4">
                  <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
                <h3 className="text-xl font-bold text-slate-900 mb-2">Pipeline</h3>
                <p className="text-slate-700 text-sm mb-3 font-medium">Track hiring progress</p>
                <div className="backdrop-blur-md bg-amber-600/20 text-amber-800 px-4 py-2 rounded-xl text-sm font-bold inline-block border border-amber-400/30">
                  {remaining} In Pipeline
                </div>
              </div>
            </div>
          </a>

          <a href="/admin/recruitment/analytics" className="group block">
            <div className="backdrop-blur-xl bg-gradient-to-br from-slate-500/10 to-slate-700/10 rounded-3xl border border-white/40 shadow-xl hover:shadow-2xl hover:scale-[1.05] transition-all duration-300 p-6">
              <div className="text-center">
                <div className="w-14 h-14 bg-gradient-to-br from-slate-700 to-slate-900 rounded-2xl shadow-xl flex items-center justify-center mx-auto mb-4">
                  <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                </div>
                <h3 className="text-xl font-bold text-slate-900 mb-2">Analytics</h3>
                <p className="text-slate-700 text-sm mb-3 font-medium">View recruitment insights</p>
                <div className="backdrop-blur-md bg-slate-600/20 text-slate-800 px-4 py-2 rounded-xl text-sm font-bold inline-block border border-slate-400/30">
                  View Reports
                </div>
              </div>
            </div>
          </a>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          <div className="backdrop-blur-xl bg-gradient-to-br from-slate-500/10 to-slate-700/10 rounded-3xl border border-white/40 shadow-xl p-6 hover:shadow-2xl hover:scale-[1.02] transition-all duration-300">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-bold text-slate-700">Total Applications</p>
                <p className="text-4xl font-bold bg-gradient-to-r from-slate-700 to-slate-900 bg-clip-text text-transparent mt-2">
                  {loading ? "..." : totalApps}
                </p>
              </div>
              <div className="w-14 h-14 bg-gradient-to-br from-slate-600 to-slate-800 rounded-2xl shadow-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
            </div>
          </div>

          <div className="backdrop-blur-xl bg-gradient-to-br from-amber-500/10 to-orange-500/10 rounded-3xl border border-white/40 shadow-xl p-6 hover:shadow-2xl hover:scale-[1.02] transition-all duration-300">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-bold text-slate-700">In Pipeline</p>
                <p className="text-4xl font-bold bg-gradient-to-r from-amber-600 to-orange-600 bg-clip-text text-transparent mt-2">
                  {loading ? "..." : remaining}
                </p>
              </div>
              <div className="w-14 h-14 bg-gradient-to-br from-amber-600 to-orange-600 rounded-2xl shadow-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
          </div>

          <div className="backdrop-blur-xl bg-gradient-to-br from-blue-500/10 to-cyan-500/10 rounded-3xl border border-white/40 shadow-xl p-6 hover:shadow-2xl hover:scale-[1.02] transition-all duration-300">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-bold text-slate-700">Active Jobs</p>
                <p className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent mt-2">
                  {loading ? "..." : jobsCount}
                </p>
              </div>
              <div className="w-14 h-14 bg-gradient-to-br from-blue-600 to-cyan-600 rounded-2xl shadow-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2-2v2m8 0V6a2 2 0 012 2v6M8 8v10l4-2 4 2V8a2 2 0 00-2-2H10a2 2 0 00-2 2z" />
                </svg>
              </div>
            </div>
          </div>
        </div>

        {/* Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Bar Chart */}
          <div className="backdrop-blur-xl bg-white/60 rounded-3xl border border-white/40 shadow-xl p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-slate-900">Applications by Stage</h3>
              {error && <div className="text-sm text-red-600 font-semibold">{error}</div>}
            </div>
            
            {loading ? (
              <div className="h-80 flex items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={320}>
                <BarChart data={barChartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="stage" stroke="#64748b" fontSize={12} />
                  <YAxis stroke="#64748b" fontSize={12} />
                  <Tooltip 
                    contentStyle={{
                      backgroundColor: 'white',
                      border: '1px solid #e2e8f0',
                      borderRadius: '8px',
                      boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)'
                    }}
                  />
                  <Bar dataKey="count" fill="#64748b" radius={4} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* Pie Chart */}
          <div className="backdrop-blur-xl bg-white/60 rounded-3xl border border-white/40 shadow-xl p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-slate-900">Stage Distribution</h3>
            </div>
            
            {loading ? (
              <div className="h-80 flex items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
              </div>
            ) : pieChartData.length === 0 ? (
              <div className="h-80 flex items-center justify-center">
                <div className="text-center">
                  <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                  <p className="text-gray-600">No application data yet</p>
                </div>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={320}>
                <PieChart>
                  <Pie
                    data={pieChartData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={100}
                    paddingAngle={2}
                    dataKey="value"
                  >
                    {pieChartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{
                      backgroundColor: 'white',
                      border: '1px solid #e2e8f0',
                      borderRadius: '8px',
                      boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)'
                    }}
                  />
                  <Legend 
                    wrapperStyle={{
                      paddingTop: '20px',
                      fontSize: '12px'
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}