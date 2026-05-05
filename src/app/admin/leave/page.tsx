"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { CalendarDays, Info, RefreshCw, X } from "lucide-react";
import LoadingSpinner from "@/components/LoadingSpinner";

type LeaveRow = {
  id: number;
  type: string;
  startDate: string; 
  endDate: string; 
  days: number;
  reason: string;
  status: string;
  employeeId: number;
  employee: string;
  employeeEmail: string;
  employeeJobTitle: string;
  employeePhone: string;
  employeeStatus: string;
  department: string;
  leaveBalance: number;
  totalLeaveBalance: number;
  isPaid?: boolean | null;
};

const STATUSES = ["all", "Pending", "Approved", "Rejected"] as const;
const TYPES = [
  "all",
  "Annual",
  "Sick",
  "Casual",
  "Emergency",
] as const;

export default function Page() {
  const defaultMonth = () => {
    const d = new Date();
    return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
  };

  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [status, setStatus] = useState<(typeof STATUSES)[number]>("all");
  const [type, setType] = useState<(typeof TYPES)[number]>("all");
  const [q, setQ] = useState("");
  const [month, setMonth] = useState<string>(() => {
    return defaultMonth();
  });
  const [department, setDepartment] = useState("all");
  const [data, setData] = useState<LeaveRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [searchToken, setSearchToken] = useState(0);
  const [rejectModal, setRejectModal] = useState<{ id: number | null; reason: string }>({ id: null, reason: "" });
  const [approveModal, setApproveModal] = useState<{ id: number | null; reason: string; paid: boolean }>({ id: null, reason: "", paid: false });
  const [stats, setStats] = useState<{ totalThisMonth: number; pendingThisMonth: number; avgPerEmployee: number } | null>(null);
  const [calendar, setCalendar] = useState<Record<string, "Approved" | "Pending" | "Rejected">>({});
  const [error, setError] = useState<string>("");
  const [insights, setInsights] = useState<Array<{ id: number; suggestion: string; category: string }>>([]);
  const [alerts, setAlerts] = useState<{ overlappingDepartments: Array<{ department: string; count: number }>; nearingLeaveLimits: Array<{ employeeId: number; employee: string }>; highAbsenteeism: number } | null>(null);
  const prevDataRef = useRef<LeaveRow[] | null>(null);
  const [toasts, setToasts] = useState<Array<{ id: number; text: string; tone: "success" | "error" | "info" | "warning" }>>([]);
  const [departments, setDepartments] = useState<string[]>([]);

  function pushToast(text: string, tone: "success" | "error" | "info" | "warning" = "info") {
    const id = Date.now() + Math.floor(Math.random() * 1000);
    setToasts((t) => [...t, { id, text, tone }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 4000);
  }

  // Fetch departments on mount
  useEffect(() => {
    async function fetchDepartments() {
      try {
        const res = await fetch("/api/employees/list?active=true");
        const json = await res.json();
        setDepartments(json.departments || []);
      } catch (e) {
        console.error("Failed to fetch departments", e);
      }
    }
    fetchDepartments();
  }, []);

  async function load() {
    setLoading(true);
    try {
      const params = new URLSearchParams();

      if (from) params.set("from", from);
      if (to) params.set("to", to);
      if (month) params.set("month", month);
      if (status && status !== "all") params.set("status", status);
      if (type && type !== "all") params.set("type", type);
      if (q) params.set("q", q);
      if (department && department !== "all") params.set("department", department);

      params.set("page", String(page));
      params.set("limit", "10");

      const res = await fetch(`/api/leave/admin?${params.toString()}`, { 
        cache: "no-store",
        headers: { "Content-Type": "application/json" }
      });
      if (!res.ok) throw new Error(`API Error: ${res.statusText}`);
      
      const json = await res.json();
      if (!json.success) throw new Error(json.error || "Failed to load leaves");

      setData(json.data);
      setStats({
        totalThisMonth: json.stats.total,
        pendingThisMonth: json.stats.pending,
        avgPerEmployee: Math.round(json.stats.total / Math.max(1, json.stats.total)),
      });
      setTotalPages(json.pagination.totalPages);
      
      // Populate calendar from leave data
      const cal: Record<string, "Approved" | "Pending" | "Rejected"> = {};
      json.data.forEach((leave: LeaveRow) => {
        const start = new Date(leave.startDate);
        const end = new Date(leave.endDate);
        for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
          const key = d.toISOString().split('T')[0];
          // Priority: Rejected > Pending > Approved
          if (!cal[key] || 
              (leave.status === 'Rejected') ||
              (leave.status === 'Pending' && cal[key] !== 'Rejected')) {
            cal[key] = leave.status as "Approved" | "Pending" | "Rejected";
          }
        }
      });
      setCalendar(cal);
      setError("");
    } catch (e: any) {
      console.error("[Load Error]", e);
      setError(e.message || "Failed to load leave requests");
      setData([]);
      pushToast(e.message || "Failed to load data", "error");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, status, department, searchToken]);

  async function updateStatus(id: number, next: "Approved" | "Rejected") {
    if (next === "Rejected") {
      setRejectModal({ id, reason: "" });
      return;
    }

    const prev = data;
    setData((d) => d.map((r) => (r.id === id ? { ...r, status: next } : r)));

    try {
      const res = await fetch("/api/leave/admin", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id,
          status: next,
          approverComment: "",
        }),
      });

      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error || "Failed to update leave");
      }

      const result = await res.json();
      pushToast(result.data.message, "success");
      await load(); // Refresh data
    } catch (e) {
      setData(prev);
      const message = (e as Error).message;
      setError(message);
      pushToast(message, "error");
      setTimeout(() => setError(""), 3000);
    }
  }

  async function submitReject() {
    if (!rejectModal.id) return;
    const prev = data;
    setData((d) =>
      d.map((r) =>
        r.id === rejectModal.id ? { ...r, status: "Rejected" } : r
      )
    );
    try {
      const res = await fetch("/api/leave/admin", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: rejectModal.id,
          status: "Rejected",
          approverComment: rejectModal.reason,
        }),
      });

      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error || "Failed to reject leave");
      }

      pushToast("Leave rejected successfully", "success");
      setRejectModal({ id: null, reason: "" });
      await load();
    } catch (e) {
      setData(prev);
      const message = (e as Error).message;
      setError(message);
      pushToast(message, "error");
    }
  }

  function resetFilters() {
    setFrom("");
    setTo("");
    setStatus("all");
    setType("all");
    setQ("");
    setDepartment("all");
    setPage(1);
    setMonth(defaultMonth());
    setSearchToken((t) => t + 1);
  }

  function applyFilters() {
    setPage(1);
    setSearchToken((t) => t + 1);
  }

  return (
    <div className="min-h-screen relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-blue-600/10 via-cyan-600/10 to-teal-600/10"></div>
      <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiM5YzkyYWMiIGZpbGwtb3BhY2l0eT0iMC4wNSI+PHBhdGggZD0iTTM2IDM0djItaDJ2LTJoLTJ6bTAtNHYyaDJ2LTJoLTJ6bTAtNHYyaDJ2LTJoLTJ6bTAtNHYyaDJ2LTJoLTJ6Ii8+PC9nPjwvZz48L3N2Zz4=')] opacity-30"></div>
      <div className="relative z-10 w-full px-3 sm:px-5 lg:px-8 py-4 sm:py-6">
      {error && (
        <div className="mb-2 rounded-2xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</div>
      )}

      {/* Alerts & Insights */}
      {(alerts || insights.length > 0) && (
        <div className="mt-4 grid grid-cols-1 lg:grid-cols-2 gap-3">
          {alerts && (
            <div className="rounded-3xl bg-white/60 backdrop-blur-xl border border-white/40 p-4 shadow-lg relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 via-cyan-500/5 to-teal-500/5"></div>
              <div className="relative text-sm font-semibold text-slate-900 mb-2">Alerts</div>
              <div className="space-y-1 text-sm">
                <div className="text-slate-700">High absenteeism: <span className="font-medium">{alerts.highAbsenteeism}</span> employee(s)</div>
                <div className="text-slate-700">Overlapping departments:</div>
                <ul className="ml-4 list-disc text-slate-700">
                  {alerts.overlappingDepartments.map((o) => (
                    <li key={o.department}>{o.department}: {o.count}</li>
                  ))}
                </ul>
                <div className="text-slate-700">Nearing leave limits:</div>
                <ul className="ml-4 list-disc text-slate-700">
                  {alerts.nearingLeaveLimits.map((n, idx) => (
                    <li key={`${n.employeeId}-${idx}`}>{n.employee}</li>
                  ))}
                </ul>
              </div>
            </div>
          )}
          {insights.length > 0 && (
            <div className="rounded-3xl bg-white/60 backdrop-blur-xl border border-white/40 p-4 shadow-lg relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 via-cyan-500/5 to-teal-500/5"></div>
              <div className="relative text-sm font-semibold text-slate-900 mb-2">AI Insights</div>
              <ul className="relative text-sm text-slate-700 space-y-1">
                {insights.slice(0,6).map((i) => (
                  <li key={i.id}>Request #{i.id}: Suggest {i.suggestion} • <span className="text-gray-500">{i.category}</span></li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
      <div className="mt-2 backdrop-blur-xl bg-white/60 rounded-3xl border border-white/40 shadow-xl p-5 sm:p-6 lg:p-8 flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold bg-gradient-to-r from-blue-600 via-cyan-600 to-teal-600 bg-clip-text text-transparent">Leave</h1>
          <p className="mt-2 text-sm text-slate-700 font-medium">Manage leave requests and track balances.</p>
        </div>
        <button
          onClick={() => load()}
          className="inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-blue-600 to-cyan-600 text-white px-4 py-2.5 text-sm font-semibold shadow-lg hover:brightness-110 active:scale-[.98]"
        >
          <RefreshCw className="h-4 w-4" />
          Refresh
        </button>
      </div>

      {/* Glass filter panel */}
      <div className="mt-4 rounded-3xl border border-white/40 bg-white/60 backdrop-blur-xl shadow-lg p-3 sm:p-4 md:p-6 relative overflow-hidden">
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-blue-500/5 via-cyan-500/5 to-teal-500/5"></div>
        <div className="relative z-10 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">From Date</label>
            <input type="date" value={from} onChange={(e) => setFrom(e.target.value)}
              className="w-full rounded-2xl border border-white/40 bg-white/80 px-3 py-2.5 text-sm text-slate-700 outline-none focus:ring-2 focus:ring-blue-500/60" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Month</label>
            <input type="month" value={month} onChange={(e) => setMonth(e.target.value)}
              className="w-full rounded-2xl border border-white/40 bg-white/80 px-3 py-2.5 text-sm text-slate-700 outline-none focus:ring-2 focus:ring-blue-500/60" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">To Date</label>
            <input type="date" value={to} onChange={(e) => setTo(e.target.value)}
              className="w-full rounded-2xl border border-white/40 bg-white/80 px-3 py-2.5 text-sm text-slate-700 outline-none focus:ring-2 focus:ring-blue-500/60" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Show Leave with Status</label>
            <select value={status} onChange={(e) => setStatus(e.target.value as any)}
              className="w-full rounded-2xl border border-white/40 bg-white/80 px-3 py-2.5 text-sm text-slate-700 outline-none focus:ring-2 focus:ring-blue-500/60">
              {STATUSES.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Leave Type</label>
            <select value={type} onChange={(e) => setType(e.target.value as any)}
              className="w-full rounded-2xl border border-white/40 bg-white/80 px-3 py-2.5 text-sm text-slate-700 outline-none focus:ring-2 focus:ring-blue-500/60">
              {TYPES.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Employee Name / Email</label>
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Type for hints..."
              className="w-full rounded-2xl border border-white/40 bg-white/80 px-3 py-2.5 text-sm text-slate-700 outline-none focus:ring-2 focus:ring-blue-500/60" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Department</label>
            <select value={department} onChange={(e) => setDepartment(e.target.value)}
              className="w-full rounded-2xl border border-white/40 bg-white/80 px-3 py-2.5 text-sm text-slate-700 outline-none focus:ring-2 focus:ring-blue-500/60">
              <option value="all">All</option>
              {departments.map((d) => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="relative z-10 mt-4 flex items-center justify-end gap-2">
          <button onClick={resetFilters}
            className="rounded-2xl border border-slate-200 bg-white/70 px-4 py-2 text-sm text-slate-700 hover:bg-white">
            Reset
          </button>
          <button onClick={applyFilters}
            className="rounded-2xl bg-gradient-to-r from-blue-600 to-cyan-600 px-5 py-2 text-sm font-semibold text-white shadow-lg hover:brightness-110 active:scale-[.98]">
            Search
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      {stats && (
        <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="rounded-3xl bg-white/60 backdrop-blur-xl border border-white/40 p-4 shadow-lg relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 via-cyan-500/5 to-teal-500/5"></div>
            <div className="relative text-xs text-slate-500">Total leaves this month</div>
            <div className="relative mt-1 text-2xl font-semibold text-slate-900">{stats.totalThisMonth}</div>
          </div>
          <div className="rounded-3xl bg-white/60 backdrop-blur-xl border border-white/40 p-4 shadow-lg relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-amber-500/8 via-orange-500/8 to-rose-500/8"></div>
            <div className="relative text-xs text-slate-500">Pending requests</div>
            <div className="relative mt-1 text-2xl font-semibold text-amber-600">{stats.pendingThisMonth}</div>
          </div>
          <div className="rounded-3xl bg-white/60 backdrop-blur-xl border border-white/40 p-4 shadow-lg relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-blue-500/6 via-cyan-500/6 to-teal-500/6"></div>
            <div className="relative text-xs text-slate-500">Avg. leave per employee</div>
            <div className="relative mt-1 text-2xl font-semibold text-blue-700">{stats.avgPerEmployee}</div>
          </div>
        </div>
      )}

      {/* Calendar (color-coded) */}
      {month && (
        <div className="mt-4 rounded-3xl bg-white/60 backdrop-blur-xl border border-white/40 p-4 shadow-lg relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 via-cyan-500/5 to-teal-500/5"></div>
          <div className="relative flex items-center gap-2 text-sm font-semibold text-slate-900">
            <CalendarDays className="h-4 w-4 text-blue-600" />
            Calendar
          </div>
          <div className="mt-3 grid grid-cols-7 gap-2 text-center text-xs">
            {["Sun","Mon","Tue","Wed","Thu","Fri","Sat"].map((d)=>(<div key={d} className="text-slate-500">{d}</div>))}
            {(() => {
              const [y, m] = month.split("-").map(Number);
              const first = new Date(Date.UTC(y, m - 1, 1));
              const startPad = first.getUTCDay();
              const daysInMonth = new Date(Date.UTC(y, m, 0)).getUTCDate();
              const cells: any[] = [];
              for (let i=0;i<startPad;i++) cells.push(<div key={`pad-${i}`} />);
              for (let d=1; d<=daysInMonth; d++) {
                const key = `${y}-${String(m).padStart(2,"0")}-${String(d).padStart(2,"0")}`;
                const st = calendar[key];
                const color = st === 'Approved' ? 'bg-emerald-500' : st === 'Rejected' ? 'bg-rose-500' : st === 'Pending' ? 'bg-amber-500' : 'bg-slate-200';
                cells.push(
                  <div key={key} className="rounded-2xl border border-white/60 bg-white/80 py-3">
                    <div className="text-slate-700 mb-1">{d}</div>
                    <span className={`mx-auto block h-2 w-2 rounded-full ${color}`} />
                  </div>
                );
              }
              return cells;
            })()}
          </div>
        </div>
      )}

      {/* Results */}
      <div className="mt-4 overflow-x-auto">
        <div className="min-w-[720px] rounded-3xl border border-white/40 bg-white/60 backdrop-blur-xl shadow-lg">
          <div className="p-3 sm:p-4 border-b border-white/40 text-sm text-slate-700">{`(${data.length}) Record${data.length === 1 ? "" : "s"} Found`}</div>
          {loading ? (
            <div className="p-6 flex justify-center"><LoadingSpinner /></div>
          ) : (
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="text-slate-600">
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">Employee Name</th>
                  <th className="px-4 py-3">Department</th>
                  <th className="px-4 py-3">Leave Type</th>
                  <th className="px-4 py-3">Leave Balance (Days)</th>
                  <th className="px-4 py-3">Days</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Comments</th>
                  <th className="px-4 py-3">Paid</th>
                  <th className="px-4 py-3">AI Suggestion</th>
                  <th className="px-4 py-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {data.map((r) => (
                  <tr key={r.id} className="border-t border-white/30 hover:bg-white/70">
                    <td className="px-4 py-3 whitespace-nowrap text-slate-800">
                      {new Date(r.startDate).toLocaleDateString()} – {new Date(r.endDate).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-col">
                        <span className="font-medium text-slate-900">{r.employee}</span>
                        <span className="text-xs text-slate-500">{r.employeeEmail}</span>
                        <span className="text-xs text-slate-500">{r.employeeJobTitle}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-slate-800">{r.department}</td>
                    <td className="px-4 py-3 text-slate-800">{r.type}</td>
                    <td className="px-4 py-3 text-slate-800">
                      <div className="text-sm font-medium text-slate-900">
                        {Number(r.leaveBalance).toFixed(0)}/{Number(r.totalLeaveBalance).toFixed(0)}
                      </div>
                      <div className="text-xs text-slate-500">remaining/total</div>
                    </td>
                    <td className="px-4 py-3 text-slate-800">{r.days.toFixed(0)}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${
                        r.status === "Approved"
                          ? "bg-emerald-50 text-emerald-700"
                          : r.status === "Rejected"
                          ? "bg-rose-50 text-rose-700"
                          : "bg-amber-50 text-amber-700"
                      }`}>
                        {r.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 max-w-[260px] truncate text-slate-800" title={r.reason}>{r.reason}</td>
                    <td className="px-4 py-3">
                      {(() => {
                        const label = r.isPaid === true ? 'Paid' : r.isPaid === false ? 'Unpaid' : (r.leaveBalance > 0 ? 'Paid' : 'Unpaid');
                        const cls = label === 'Paid' ? 'bg-indigo-50 text-indigo-700' : 'bg-gray-100 text-gray-600';
                        return <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${cls}`}>{label}</span>;
                      })()}
                    </td>
                    <td className="px-4 py-3">
                      {(() => {
                        const s = insights.find((i) => i.id === r.id)?.suggestion || 'review';
                        const cls = s === 'approve' ? 'bg-emerald-50 text-emerald-700' : s === 'reject' ? 'bg-rose-50 text-rose-700' : 'bg-sky-50 text-sky-700';
                        return <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${cls}`}>{s}</span>;
                      })()}
                    </td>
                    <td className="px-4 py-3 space-x-2 whitespace-nowrap">
                      <button
                        onClick={() => {
                          const eligible = Number(r.leaveBalance) >= Number(r.days);
                          setApproveModal({ id: r.id, reason: "", paid: eligible });
                        }}
                        className="rounded-2xl bg-emerald-100 text-emerald-700 px-3 py-1.5 text-xs font-semibold hover:bg-emerald-200 disabled:opacity-50"
                        disabled={r.status === "Approved"}
                      >
                        Approve
                      </button>
                      <button
                        onClick={() => updateStatus(r.id, "Rejected")}
                        className="rounded-2xl bg-rose-100 text-rose-700 px-3 py-1.5 text-xs font-semibold hover:bg-rose-200 disabled:opacity-50"
                        disabled={r.status === "Rejected"}
                      >
                        Reject
                      </button>
                    </td>
                  </tr>
                ))}
                {data.length === 0 && (
                  <tr>
                    <td className="px-4 py-8 text-center text-slate-500" colSpan={8}>No records found</td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex justify-end items-center gap-2 mt-3">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="rounded-2xl border border-slate-200 bg-white px-3 py-1.5 text-xs disabled:opacity-50"
              disabled={page <= 1}
            >
              Prev
            </button>
            <span className="text-xs text-slate-600">Page {page} of {totalPages}</span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              className="rounded-2xl border border-slate-200 bg-white px-3 py-1.5 text-xs disabled:opacity-50"
              disabled={page >= totalPages}
            >
              Next
            </button>
          </div>
        )}
      </div>

      {/* Reject Reason Modal */}
      {rejectModal.id !== null && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => setRejectModal({ id: null, reason: "" })} />
          <div className="relative w-full max-w-md rounded-3xl bg-white/95 backdrop-blur-xl p-4 sm:p-6 shadow-2xl border border-white/40">
            <h3 className="text-lg font-semibold text-slate-900">Reject Leave</h3>
            <p className="mt-1 text-sm text-slate-600">Please provide a visible reason for rejection.</p>
            {(() => {
              const row = data.find(d => d.id === rejectModal.id);
              return row && row.status === "Approved" ? (
                <p className="mt-2 rounded-xl bg-blue-50 px-3 py-2 text-xs text-blue-700 inline-flex items-center gap-2">
                  <Info className="h-3.5 w-3.5" />
                  Leave balance will be restored by {row.days} days after rejection.
                </p>
              ) : null;
            })()}
            <textarea
              value={rejectModal.reason}
              onChange={(e) => setRejectModal((m) => ({ ...m, reason: e.target.value }))}
              rows={4}
              className="mt-3 w-full rounded-2xl border border-slate-200 px-3 py-2 text-sm text-slate-700 outline-none focus:ring-2 focus:ring-rose-300"
              placeholder="Reason..."
            />
            <div className="mt-4 flex justify-end gap-2">
              <button
                className="rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm"
                onClick={() => setRejectModal({ id: null, reason: "" })}
              >
                Cancel
              </button>
              <button
                className="rounded-2xl bg-rose-600 text-white px-4 py-2 text-sm font-semibold shadow hover:shadow-md"
                onClick={async () => {
                  if (!rejectModal.reason.trim()) return;
                  const prev = data;
                  setData((d) => d.map((r) => (r.id === rejectModal.id ? { ...r, status: "Rejected", reason: rejectModal.reason } : r)));
                  try {
                    const res = await fetch("/api/leave", {
                      method: "PUT",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ id: rejectModal.id, status: "Rejected", reason: rejectModal.reason }),
                    });
                    if (!res.ok) throw new Error("Failed");
                    setRejectModal({ id: null, reason: "" });
                  } catch (e) {
                    setData(prev);
                    setError((e as Error).message);
                    setTimeout(() => setError(""), 3000);
                    pushToast((e as Error).message, "error");
                  }
                }}
              >
                Submit Reason
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Approve Comment Modal */}
      {approveModal.id !== null && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => setApproveModal({ id: null, reason: "", paid: false })} />
          <div className="relative w-full max-w-md rounded-3xl bg-white/95 backdrop-blur-xl p-4 sm:p-6 shadow-2xl border border-white/40">
            <h3 className="text-lg font-semibold text-slate-900">Approve Leave</h3>
            <p className="mt-1 text-sm text-slate-600">Optional: add a comment.</p>
            <textarea
              value={approveModal.reason}
              onChange={(e) => setApproveModal((m) => ({ ...m, reason: e.target.value }))}
              rows={3}
              className="mt-3 w-full rounded-2xl border border-slate-200 px-3 py-2 text-sm text-slate-700 outline-none focus:ring-2 focus:ring-emerald-300"
              placeholder="Comment..."
            />
            {(() => {
              const row = data.find(d => d.id === approveModal.id);
              return (
                <div className="mt-3 space-y-3">
                  <label className="flex items-center gap-2 text-sm text-slate-800">
                    <input type="checkbox" checked={approveModal.paid}
                      onChange={(e) => {
                        const checked = e.target.checked;
                        setApproveModal(m => ({ ...m, paid: checked }));
                      }} />
                    <span>Mark as Paid</span>
                  </label>
                  {row && (
                    <p className="mt-1 text-xs text-slate-600">
                      Leave Days: {row.days} | Available: {row.leaveBalance}/{row.totalLeaveBalance}
                    </p>
                  )}
                </div>
              );
            })()}
            <div className="mt-4 flex justify-end gap-2">
              <button className="rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm" onClick={() => setApproveModal({ id: null, reason: "", paid: false })}>Cancel</button>
              <button
                className="rounded-2xl bg-emerald-600 text-white px-4 py-2 text-sm font-semibold shadow hover:shadow-md"
                onClick={async () => {
                  const id = approveModal.id!;
                  const prev = data;
                  setData((d) => d.map((r) => (r.id === id ? { ...r, status: "Approved", reason: approveModal.reason || r.reason, isPaid: approveModal.paid } : r)));
                  try {
                    const res = await fetch("/api/leave/admin", {
                      method: "PUT",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ 
                        id, 
                        status: "Approved", 
                        approverComment: approveModal.reason,
                        paid: approveModal.paid
                      }),
                    });
                    if (!res.ok) {
                      const j = await res.json().catch(() => ({}));
                      throw new Error(j.error || "Failed");
                    }
                    setApproveModal({ id: null, reason: "", paid: false });
                    await load(); // refresh to show updated remaining balance
                    pushToast("Leave approved", "success");
                  } catch (e) {
                    setData(prev);
                    setError((e as Error).message);
                    setTimeout(() => setError(""), 3000);
                    pushToast((e as Error).message, "error");
                  }
                }}
              >
                Confirm Approve
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toasts bottom-left */}
      <div className="fixed left-3 bottom-3 z-[70] space-y-2 w-[calc(100%-24px)] sm:w-80">
        {toasts.map((t) => {
          const toneCls = t.tone === 'success' ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
            : t.tone === 'error' ? 'border-rose-200 bg-rose-50 text-rose-800'
            : t.tone === 'warning' ? 'border-amber-200 bg-amber-50 text-amber-800'
            : 'border-sky-200 bg-sky-50 text-sky-800';
          return (
            <div key={t.id} className={`rounded-2xl border px-3 py-2 text-sm shadow-sm ${toneCls}`}>
              <div className="flex items-start justify-between gap-3">
                <span className="leading-5">{t.text}</span>
                <button onClick={() => setToasts((x) => x.filter((i) => i.id !== t.id))} className="opacity-70 hover:opacity-100">
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          );
        })}
      </div>
      </div>
    </div>
  );
}
