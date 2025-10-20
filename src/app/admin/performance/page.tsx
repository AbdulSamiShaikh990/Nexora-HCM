"use client";

import { useEffect, useMemo, useState } from "react";
import {
  LineChart,
  Line,
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import {
  Star,
  Target,
  Users,
  Award,
  MessageSquare,
  Plus,
  X,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  Search,
} from "lucide-react";

// API helpers (inline to avoid creating files)
async function searchEmployeesAPI(query: string) {
  const res = await fetch(`/api/performance?query=${encodeURIComponent(query)}`);
  if (!res.ok) return { employees: [] };
  return res.json();
}

async function getEmployeePerformanceAPI(employeeId: number) {
  const res = await fetch(`/api/performance?employeeId=${employeeId}`);
  if (!res.ok) return null;
  return res.json();
}

export default function PerformancePage() {
  const [isOKRDialogOpen, setIsOKRDialogOpen] = useState(false);
  const [isFeedbackDialogOpen, setIsFeedbackDialogOpen] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState("");
  const [feedbackCategory, setFeedbackCategory] = useState("");
  const [feedbackText, setFeedbackText] = useState("");
  const [okrObjective, setOkrObjective] = useState("");
  const [okrKeyResult, setOkrKeyResult] = useState("");
  const [okrDueDate, setOkrDueDate] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [employeeResults, setEmployeeResults] = useState<any[]>([]);
  const [bundle, setBundle] = useState<any | null>(null);
  const [loadingBundle, setLoadingBundle] = useState(false);

  // live search employees
  useEffect(() => {
    let active = true;
    const q = searchQuery.trim();
    if (!q) {
      setEmployeeResults([]);
      return;
    }
    searchEmployeesAPI(q).then((data) => {
      if (!active) return;
      setEmployeeResults(data.employees || []);
    });
    return () => {
      active = false;
    };
  }, [searchQuery]);

  // fetch performance bundle when an employee is selected (numeric id)
  useEffect(() => {
    const idNum = Number(selectedEmployee);
    if (!idNum) {
      setBundle(null);
      return;
    }
    setLoadingBundle(true);
    getEmployeePerformanceAPI(idNum)
      .then((data) => setBundle(data))
      .finally(() => setLoadingBundle(false));
  }, [selectedEmployee]);

  const kpis = bundle?.kpis;
  const trend = bundle?.trend || [];
  const skills = bundle?.skills || [];
  const okrsData = bundle?.okrs || [];
  const alertsData = bundle?.alerts || [];

  const getStatusBadge = (status: string) => {
    const styles = {
      Completed: "bg-green-100 text-green-800",
      "On Track": "bg-blue-100 text-blue-800",
      Behind: "bg-orange-100 text-orange-800",
    };
    return styles[status as keyof typeof styles] || "bg-gray-100 text-gray-800";
  };

  const getAlertIcon = (type: string) => {
    switch (type) {
      case "success":
        return <TrendingUp className="w-5 h-5 text-green-600" />;
      case "danger":
        return <AlertTriangle className="w-5 h-5 text-red-600" />;
      default:
        return <TrendingDown className="w-5 h-5 text-orange-600" />;
    }
  };

  const getAlertStyle = (type: string) => {
    switch (type) {
      case "success":
        return "bg-green-50 border-green-200";
      case "danger":
        return "bg-red-50 border-red-200";
      default:
        return "bg-orange-50 border-orange-200";
    }
  };

  return (
    <div className="w-full min-h-screen bg-gray-50 p-4 sm:p-6 lg:p-8">
      {/* Header */}
      <div className="mb-6 sm:mb-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900">
              Performance Tracking
            </h1>
            <p className="mt-1 text-sm sm:text-base text-gray-700">
              Track goals, feedback, and professional development
            </p>
            {selectedEmployee && (
              <p className="mt-2 text-xs sm:text-sm text-blue-700 font-medium">
                Monitoring: Employee ID {selectedEmployee}
              </p>
            )}
          </div>
          <div className="flex flex-col sm:flex-row gap-3 sm:items-center w-full sm:w-auto">
            {/* Search box */}
            <div className="relative w-full sm:w-72">
              <div className="flex items-center gap-2 px-3 py-2 bg-white border border-gray-300 rounded-lg shadow-sm focus-within:ring-2 focus-within:ring-blue-500">
                <Search className="w-4 h-4 text-gray-700" />
                <input
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setSearchOpen(true);
                  }}
                  onFocus={() => setSearchOpen(true)}
                  placeholder="Search by name or ID..."
                  className="w-full text-sm outline-none placeholder:text-gray-500 text-gray-900"
                />
                {selectedEmployee && (
                  <button
                    onClick={() => {
                      setSelectedEmployee("");
                      setSearchQuery("");
                    }}
                    className="text-gray-600 hover:text-gray-900"
                    title="Clear selection"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
              {searchOpen && (
                <div className="absolute z-10 mt-2 w-full bg-white border border-gray-300 rounded-lg shadow-lg max-h-64 overflow-auto">
                  {employeeResults.length === 0 ? (
                    <div className="px-3 py-2 text-sm text-gray-600">No results</div>
                  ) : (
                    employeeResults.map((e) => (
                      <button
                        key={e.id}
                        onClick={() => {
                          setSelectedEmployee(String(e.id));
                          setSearchQuery(`${e.firstName} ${e.lastName} • ${e.id}`);
                          setSearchOpen(false);
                        }}
                        className="w-full text-left px-3 py-2 hover:bg-gray-100 text-sm"
                      >
                        <span className="font-medium text-gray-900">{e.firstName} {e.lastName}</span>
                        <span className="ml-2 text-xs text-gray-600">{e.id}</span>
                        <span className="ml-2 text-xs text-gray-600">• {e.department}</span>
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>

            <div className="flex flex-wrap gap-2 sm:gap-3">
            <button
              onClick={() => setIsFeedbackDialogOpen(true)}
              className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-100 transition-colors text-sm sm:text-base text-gray-900"
            >
              <MessageSquare className="w-4 h-4 sm:w-5 sm:h-5 text-gray-700" />
              <span className="hidden sm:inline">360° Feedback</span>
              <span className="sm:hidden">Feedback</span>
            </button>
            <button
              onClick={() => setIsOKRDialogOpen(true)}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm sm:text-base"
            >
              <Plus className="w-4 h-4 sm:w-5 sm:h-5" />
              Add OKR
            </button>
            </div>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-6 sm:mb-8">
        {/* Overall Score */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-300 p-4 sm:p-6 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-3">
            <div className="p-2 bg-yellow-100 rounded-lg">
              <Star className="w-5 h-5 sm:w-6 sm:h-6 text-yellow-600" />
            </div>
          </div>
          <h3 className="text-sm text-gray-700 mb-1">Overall Score</h3>
          <p className="text-2xl sm:text-3xl font-bold text-gray-900">{kpis?.score ?? 0}/100</p>
          <p className={`text-xs sm:text-sm mt-2 flex items-center gap-1 ${
            (kpis?.delta ?? 0) >= 0 ? "text-green-700" : "text-red-700"
          }`}>
            {(kpis?.delta ?? 0) >= 0 ? (
              <TrendingUp className="w-3 h-3 sm:w-4 sm:h-4" />
            ) : (
              <TrendingDown className="w-3 h-3 sm:w-4 sm:h-4" />
            )}
            {(kpis?.delta ?? 0) >= 0 ? "+" : ""}
            {kpis?.delta ?? 0} from last month
          </p>
        </div>

        {/* Active OKRs */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-6 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Target className="w-5 h-5 sm:w-6 sm:h-6 text-blue-600" />
            </div>
          </div>
          <h3 className="text-sm text-gray-700 mb-1">Active OKRs</h3>
          <p className="text-2xl sm:text-3xl font-bold text-gray-900">{kpis?.okrs ?? 0}</p>
          <p className="text-xs sm:text-sm text-gray-700 mt-2">{kpis?.okrText ?? "No OKRs"}</p>
        </div>

        {/* Feedback Received */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-6 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <Users className="w-5 h-5 sm:w-6 sm:h-6 text-green-600" />
            </div>
          </div>
          <h3 className="text-sm text-gray-700 mb-1">Feedback Received</h3>
          <p className="text-2xl sm:text-3xl font-bold text-gray-900">{kpis?.feedback ?? 0}</p>
          <p className="text-xs sm:text-sm text-gray-700 mt-2">This quarter</p>
        </div>

        {/* Promotion Readiness */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-6 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-3">
            <div className="p-2 bg-purple-100 rounded-lg">
              <Award className="w-5 h-5 sm:w-6 sm:h-6 text-purple-600" />
            </div>
          </div>
          <h3 className="text-sm text-gray-700 mb-1">Promotion Readiness</h3>
          <p className="text-2xl sm:text-3xl font-bold text-gray-900">{kpis?.readiness ?? 0}%</p>
          <p className="text-xs sm:text-sm text-purple-700 mt-2">
            Ready for review
          </p>
        </div>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 mb-6 sm:mb-8">
        {/* Performance Trend */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-300 p-4 sm:p-6">
          <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <TrendingUp className="w-5 h-5" />
            Performance Trend
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={trend}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis
                dataKey="month"
                tick={{ fontSize: 12 }}
                stroke="#6b7280"
              />
              <YAxis
                domain={[0, 100]}
                tick={{ fontSize: 12 }}
                stroke="#4b5563"
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "#fff",
                  border: "1px solid #e5e7eb",
                  borderRadius: "8px",
                }}
              />
              <Line
                type="monotone"
                dataKey="score"
                stroke="#2563eb"
                strokeWidth={2}
                dot={{ fill: "#2563eb", r: 4 }}
                activeDot={{ r: 6 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Skills Assessment */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-6">
          <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-4">
            Skills Assessment
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <RadarChart data={skills}>
              <PolarGrid stroke="#e5e7eb" />
              <PolarAngleAxis
                dataKey="skill"
                tick={{ fontSize: 11 }}
                stroke="#6b7280"
              />
              <PolarRadiusAxis
                angle={90}
                domain={[0, 100]}
                tick={{ fontSize: 10 }}
                stroke="#6b7280"
              />
              <Radar
                name="Score"
                dataKey="score"
                stroke="#2563eb"
                fill="#2563eb"
                fillOpacity={0.6}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "#fff",
                  border: "1px solid #e5e7eb",
                  borderRadius: "8px",
                }}
              />
            </RadarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Top & Low Performers Section - hidden until backend provides data */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 mb-6 sm:mb-8"></div>

      {/* Alerts & Notifications */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-6 mb-6 sm:mb-8">
        <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <AlertTriangle className="w-5 h-5" />
          Alerts & Notifications
        </h3>
        <div className="space-y-3">
          {alertsData.length === 0 && (
            <div className="text-sm text-gray-600">No alerts yet.</div>
          )}
          {alertsData.map((alert: any, idx: number) => (
            <div
              key={idx}
              className={`flex items-start gap-3 p-4 rounded-lg border ${getAlertStyle(
                alert.type
              )}`}
            >
              <div className="flex-shrink-0 mt-0.5">
                {getAlertIcon(alert.type)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm sm:text-base text-gray-900">
                  {alert.message}
                </p>
                <p className="text-xs text-gray-600 mt-1">{alert.date}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* OKRs Section */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-6">
        <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-4">
          Objectives & Key Results (OKRs)
        </h3>
        <div className="space-y-4">
          {okrsData.length === 0 && (
            <div className="text-sm text-gray-600">No OKRs yet.</div>
          )}
          {okrsData.map((okr: any) => (
            <div
              key={okr.id}
              className="p-4 border border-gray-200 rounded-lg hover:border-gray-300 transition-colors"
            >
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-3">
                <h4 className="font-medium text-gray-900 text-sm sm:text-base">
                  {okr.title}
                </h4>
                <span
                  className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium w-fit ${getStatusBadge(
                    okr.status
                  )}`}
                >
                  {okr.status}
                </span>
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs sm:text-sm">
                  <span className="text-gray-600">Progress</span>
                  <span className="font-medium text-gray-900">
                    {okr.progress}%
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-blue-600 h-2 rounded-full transition-all"
                    style={{ width: `${okr.progress}%` }}
                  />
                </div>
                <p className="text-xs text-gray-600">
                  Due: {okr.dueDate ? new Date(okr.dueDate).toLocaleDateString() : "-"}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 360° Feedback Dialog */}
      {isFeedbackDialogOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold text-gray-900">
                  360° Feedback
                </h2>
                <button
                  onClick={() => setIsFeedbackDialogOpen(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <p className="text-sm text-gray-600 mb-6">
                Provide comprehensive feedback for an employee.
              </p>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Select Employee
                  </label>
                  <select
                    value={selectedEmployee}
                    onChange={(e) => setSelectedEmployee(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">Choose an employee...</option>
                    <option value="sarah">Sarah Johnson</option>
                    <option value="michael">Michael Chen</option>
                    <option value="emily">Emily Davis</option>
                    <option value="john">John Smith</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Feedback Category
                  </label>
                  <select
                    value={feedbackCategory}
                    onChange={(e) => setFeedbackCategory(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">Select category...</option>
                    <option value="technical">Technical</option>
                    <option value="communication">Communication</option>
                    <option value="leadership">Leadership</option>
                    <option value="teamwork">Teamwork</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Feedback
                  </label>
                  <textarea
                    value={feedbackText}
                    onChange={(e) => setFeedbackText(e.target.value)}
                    rows={4}
                    placeholder="Enter your feedback here..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                  />
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => setIsFeedbackDialogOpen(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    // Submit will be handled via Postman per your flow
                    setIsFeedbackDialogOpen(false);
                    setSelectedEmployee("");
                    setFeedbackCategory("");
                    setFeedbackText("");
                  }}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Submit Feedback
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add OKR Dialog */}
      {isOKRDialogOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold text-gray-900">
                  Add New OKR
                </h2>
                <button
                  onClick={() => setIsOKRDialogOpen(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <p className="text-sm text-gray-600 mb-6">
                Set a new objective and key result for tracking.
              </p>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Objective
                  </label>
                  <input
                    type="text"
                    value={okrObjective}
                    onChange={(e) => setOkrObjective(e.target.value)}
                    placeholder="Enter your objective..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Key Result
                  </label>
                  <textarea
                    value={okrKeyResult}
                    onChange={(e) => setOkrKeyResult(e.target.value)}
                    rows={3}
                    placeholder="Define measurable key results..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Due Date
                  </label>
                  <input
                    type="date"
                    value={okrDueDate}
                    onChange={(e) => setOkrDueDate(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => setIsOKRDialogOpen(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    // Submit will be handled via Postman per your flow
                    setIsOKRDialogOpen(false);
                    setOkrObjective("");
                    setOkrKeyResult("");
                    setOkrDueDate("");
                  }}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Add OKR
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

