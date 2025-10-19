"use client";

import { useEffect, useMemo, useRef, useState } from "react";
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
  isPaid?: boolean | null;
};

const STATUSES = ["all", "Pending", "Approved", "Rejected"] as const;
const TYPES = [
  "all",
  "Annual",
  "Sick",
  "Personal",
  "Vacation",
  "Half-day",
  "Hourly",
  "Emergency",
] as const;

export default function Page() {
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [status, setStatus] = useState<(typeof STATUSES)[number]>("all");
  const [type, setType] = useState<(typeof TYPES)[number]>("all");
  const [q, setQ] = useState("");
  const [month, setMonth] = useState<string>(() => {
    const d = new Date();
    return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
  });
  const [department, setDepartment] = useState("all");
  const [data, setData] = useState<LeaveRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
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

  const query = useMemo(() => {
    const params = new URLSearchParams();
    if (from) params.set("from", from);
    if (to) params.set("to", to);
    if (status && status !== "all") params.set("status", status);
    if (type && type !== "all") params.set("type", type);
    if (q) params.set("q", q);
    if (month) params.set("month", month);
    if (department && department !== "all") params.set("department", department);
    params.set("page", String(page));
    params.set("size", "10");
    return params.toString();
  }, [from, to, status, type, q, department, page, month]);

  async function load() {
    setLoading(true);
    try {
      const res = await fetch(`/api/leave?${query}`, { cache: "no-store" });
      const json = await res.json();
      const nextData: LeaveRow[] = json.data || [];
      // Detect new leaves (compared to previous result)
      if (prevDataRef.current) {
        const prevIds = new Set(prevDataRef.current.map((r) => r.id));
        const newOnes = nextData.filter((r) => !prevIds.has(r.id));
        if (newOnes.length > 0) {
          pushToast(`${newOnes.length} new leave request${newOnes.length > 1 ? "s" : ""} detected`, "info");
        }
      }
      setData(nextData);
      prevDataRef.current = nextData;
      setTotalPages(json.pagination?.totalPages || 1);
      setStats(json.stats || null);
      setCalendar(json.calendar || {});
      setInsights(json.insights || []);
      setAlerts(json.alerts || null);
      // Surface alert summary
      if (json.alerts) {
        const o = json.alerts.overlappingDepartments?.filter?.((x: any) => x.count > 1) || [];
        if (o.length > 0) pushToast(`Overlaps detected in ${o.length} department(s)`, "warning");
        if ((json.alerts.nearingLeaveLimits || []).length > 0) pushToast(`Some employees nearing leave limits`, "warning");
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]);

  async function updateStatus(id: number, next: "Approved" | "Rejected") {
    const prev = data;
    let payload: any = { id, status: next };
    if (next === "Rejected") {
      // Show modal to capture reason
      setRejectModal({ id, reason: "" });
      return;
    }
    setData((d) => d.map((r) => (r.id === id ? { ...r, status: next } : r)));
    try {
      const res = await fetch("/api/leave", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error || "Failed");
      }
      if (next === "Approved") {
        pushToast("Leave approved", "success");
        await load(); // refresh to show updated remaining balance
      }
    } catch (e) {
      setData(prev);
      setError((e as Error).message);
      setTimeout(() => setError(""), 3000);
      pushToast((e as Error).message, "error");
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
  }

  return (
    <div className="w-full">
      {error && (
        <div className="mb-2 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</div>
      )}

      {/* Alerts & Insights */}
      {(alerts || insights.length > 0) && (
        <div className="mt-4 grid grid-cols-1 lg:grid-cols-2 gap-3">
          {alerts && (
            <div className="rounded-2xl bg-white/60 backdrop-blur-xl border border-white/30 p-4 shadow-sm">
              <div className="text-sm font-medium text-gray-800 mb-2">Alerts</div>
              <div className="space-y-1 text-sm">
                <div className="text-gray-700">High absenteeism: <span className="font-medium">{alerts.highAbsenteeism}</span> employee(s)</div>
                <div className="text-gray-700">Overlapping departments:</div>
                <ul className="ml-4 list-disc text-gray-700">
                  {alerts.overlappingDepartments.map((o) => (
                    <li key={o.department}>{o.department}: {o.count}</li>
                  ))}
                </ul>
                <div className="text-gray-700">Nearing leave limits:</div>
                <ul className="ml-4 list-disc text-gray-700">
                  {alerts.nearingLeaveLimits.map((n, idx) => (
                    <li key={`${n.employeeId}-${idx}`}>{n.employee}</li>
                  ))}
                </ul>
              </div>
            </div>
          )}
          {insights.length > 0 && (
            <div className="rounded-2xl bg-white/60 backdrop-blur-xl border border-white/30 p-4 shadow-sm">
              <div className="text-sm font-medium text-gray-800 mb-2">AI Insights</div>
              <ul className="text-sm text-gray-700 space-y-1">
                {insights.slice(0,6).map((i) => (
                  <li key={i.id}>Request #{i.id}: Suggest {i.suggestion} • <span className="text-gray-500">{i.category}</span></li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-semibold text-gray-900">Leave</h1>
          <p className="mt-1 text-xs sm:text-sm text-gray-600">Manage leave requests and track balances.</p>
        </div>
        <button
          onClick={() => load()}
          className="rounded-full bg-violet-600 text-white px-4 py-2 text-sm shadow hover:shadow-md active:scale-[.98]"
        >
          Refresh
        </button>
      </div>

      {/* Glass filter panel */}
      <div className="mt-4 rounded-2xl border border-white/30 bg-white/50 backdrop-blur-xl shadow-sm p-3 sm:p-4 md:p-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">From Date</label>
            <input type="date" value={from} onChange={(e) => setFrom(e.target.value)}
              className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 outline-none focus:ring-2 focus:ring-violet-300" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Month</label>
            <input type="month" value={month} onChange={(e) => setMonth(e.target.value)}
              className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 outline-none focus:ring-2 focus:ring-violet-300" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">To Date</label>
            <input type="date" value={to} onChange={(e) => setTo(e.target.value)}
              className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 outline-none focus:ring-2 focus:ring-violet-300" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Show Leave with Status</label>
            <select value={status} onChange={(e) => setStatus(e.target.value as any)}
              className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 outline-none focus:ring-2 focus:ring-violet-300">
              {STATUSES.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Leave Type</label>
            <select value={type} onChange={(e) => setType(e.target.value as any)}
              className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 outline-none focus:ring-2 focus:ring-violet-300">
              {TYPES.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Employee Name / Email</label>
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Type for hints..."
              className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 outline-none focus:ring-2 focus:ring-violet-300" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Department</label>
            <select value={department} onChange={(e) => setDepartment(e.target.value)}
              className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 outline-none focus:ring-2 focus:ring-violet-300">
              <option value="all">All</option>
              {departments.map((d) => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="mt-4 flex items-center justify-end gap-2">
          <button onClick={resetFilters}
            className="rounded-full border border-gray-300 bg-white/70 px-4 py-2 text-sm text-gray-700 hover:bg-white">
            Reset
          </button>
          <button onClick={() => { setPage(1); load(); }}
            className="rounded-full bg-indigo-600 px-5 py-2 text-sm text-white shadow hover:shadow-md active:scale-[.98]">
            Search
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      {stats && (
        <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="rounded-2xl bg-white/60 backdrop-blur-xl border border-white/30 p-4 shadow-sm">
            <div className="text-xs text-gray-500">Total leaves this month</div>
            <div className="mt-1 text-2xl font-semibold text-gray-900">{stats.totalThisMonth}</div>
          </div>
          <div className="rounded-2xl bg-white/60 backdrop-blur-xl border border-white/30 p-4 shadow-sm">
            <div className="text-xs text-gray-500">Pending requests</div>
            <div className="mt-1 text-2xl font-semibold text-amber-600">{stats.pendingThisMonth}</div>
          </div>
          <div className="rounded-2xl bg-white/60 backdrop-blur-xl border border-white/30 p-4 shadow-sm">
            <div className="text-xs text-gray-500">Avg. leave per employee</div>
            <div className="mt-1 text-2xl font-semibold text-indigo-700">{stats.avgPerEmployee}</div>
          </div>
        </div>
      )}

      {/* Calendar (color-coded) */}
      {month && (
        <div className="mt-4 rounded-2xl bg-white/60 backdrop-blur-xl border border-white/30 p-4 shadow-sm">
          <div className="text-sm font-medium text-gray-800">Calendar</div>
          <div className="mt-3 grid grid-cols-7 gap-2 text-center text-xs">
            {["Sun","Mon","Tue","Wed","Thu","Fri","Sat"].map((d)=>(<div key={d} className="text-gray-500">{d}</div>))}
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
                const color = st === 'Approved' ? 'bg-emerald-500' : st === 'Rejected' ? 'bg-rose-500' : st === 'Pending' ? 'bg-amber-500' : 'bg-gray-200';
                cells.push(
                  <div key={key} className="rounded-xl border border-gray-100 bg-white py-3">
                    <div className="text-gray-700 mb-1">{d}</div>
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
        <div className="min-w-[720px] rounded-2xl border border-white/30 bg-white/60 backdrop-blur-xl">
          <div className="p-3 sm:p-4 border-b border-gray-100 text-sm text-gray-700">{`(${data.length}) Record${data.length === 1 ? "" : "s"} Found`}</div>
          {loading ? (
            <div className="p-6 flex justify-center"><LoadingSpinner /></div>
          ) : (
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="text-gray-600">
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
                  <tr key={r.id} className="border-t border-gray-100 hover:bg-white/70">
                    <td className="px-4 py-3 whitespace-nowrap text-gray-800">
                      {new Date(r.startDate).toLocaleDateString()} – {new Date(r.endDate).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-col">
                        <span className="font-medium text-gray-900">{r.employee}</span>
                        <span className="text-xs text-gray-500">{r.employeeEmail}</span>
                        <span className="text-xs text-gray-500">{r.employeeJobTitle}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-800">{r.department}</td>
                    <td className="px-4 py-3 text-gray-800">{r.type}</td>
                    <td className="px-4 py-3 text-gray-800">{Number(r.leaveBalance).toFixed(2)}</td>
                    <td className="px-4 py-3 text-gray-800">{r.days.toFixed(0)}</td>
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
                    <td className="px-4 py-3 max-w-[260px] truncate text-gray-800" title={r.reason}>{r.reason}</td>
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
                        className="rounded-full bg-emerald-100 text-emerald-700 px-3 py-1.5 text-xs hover:bg-emerald-200 disabled:opacity-50"
                        disabled={r.status === "Approved"}
                      >
                        Approve
                      </button>
                      <button
                        onClick={() => updateStatus(r.id, "Rejected")}
                        className="rounded-full bg-rose-100 text-rose-700 px-3 py-1.5 text-xs hover:bg-rose-200 disabled:opacity-50"
                        disabled={r.status === "Rejected"}
                      >
                        Reject
                      </button>
                    </td>
                  </tr>
                ))}
                {data.length === 0 && (
                  <tr>
                    <td className="px-4 py-8 text-center text-gray-500" colSpan={8}>No records found</td>
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
              className="rounded-full border border-gray-300 bg-white px-3 py-1.5 text-xs disabled:opacity-50"
              disabled={page <= 1}
            >
              Prev
            </button>
            <span className="text-xs text-gray-600">Page {page} of {totalPages}</span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              className="rounded-full border border-gray-300 bg-white px-3 py-1.5 text-xs disabled:opacity-50"
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
          <div className="relative w-full max-w-md rounded-2xl bg-white p-4 sm:p-6 shadow-xl">
            <h3 className="text-lg font-semibold text-gray-900">Reject Leave</h3>
            <p className="mt-1 text-sm text-gray-600">Please provide a visible reason for rejection.</p>
            <textarea
              value={rejectModal.reason}
              onChange={(e) => setRejectModal((m) => ({ ...m, reason: e.target.value }))}
              rows={4}
              className="mt-3 w-full rounded-xl border border-gray-200 px-3 py-2 text-sm text-gray-700 outline-none focus:ring-2 focus:ring-rose-300"
              placeholder="Reason..."
            />
            <div className="mt-4 flex justify-end gap-2">
              <button
                className="rounded-full border border-gray-300 bg-white px-4 py-2 text-sm"
                onClick={() => setRejectModal({ id: null, reason: "" })}
              >
                Cancel
              </button>
              <button
                className="rounded-full bg-rose-600 text-white px-4 py-2 text-sm shadow hover:shadow-md"
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
          <div className="relative w-full max-w-md rounded-2xl bg-white p-4 sm:p-6 shadow-xl">
            <h3 className="text-lg font-semibold text-gray-900">Approve Leave</h3>
            <p className="mt-1 text-sm text-gray-600">Optional: add a comment.</p>
            <textarea
              value={approveModal.reason}
              onChange={(e) => setApproveModal((m) => ({ ...m, reason: e.target.value }))}
              rows={3}
              className="mt-3 w-full rounded-xl border border-gray-200 px-3 py-2 text-sm text-gray-700 outline-none focus:ring-2 focus:ring-emerald-300"
              placeholder="Comment..."
            />
            {(() => {
              const row = data.find(d => d.id === approveModal.id);
              const eligible = row ? Number(row.leaveBalance) >= Number(row.days) : false;
              return (
                <label className="mt-3 flex items-center gap-2 text-sm text-gray-800">
                  <input type="checkbox" checked={approveModal.paid && eligible} disabled={!eligible}
                    onChange={(e) => setApproveModal(m => ({ ...m, paid: e.target.checked }))} />
                  <span>{eligible ? 'Mark as Paid (deduct from balance)' : 'Insufficient balance: will be Unpaid'}</span>
                </label>
              );
            })()}
            <div className="mt-4 flex justify-end gap-2">
              <button className="rounded-full border border-gray-300 bg-white px-4 py-2 text-sm" onClick={() => setApproveModal({ id: null, reason: "", paid: false })}>Cancel</button>
              <button
                className="rounded-full bg-emerald-600 text-white px-4 py-2 text-sm shadow hover:shadow-md"
                onClick={async () => {
                  const id = approveModal.id!;
                  const prev = data;
                  setData((d) => d.map((r) => (r.id === id ? { ...r, status: "Approved", reason: approveModal.reason || r.reason, isPaid: approveModal.paid && (Number(r.leaveBalance) >= Number(r.days)) } : r)));
                  try {
                    const res = await fetch("/api/leave", {
                      method: "PUT",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ id, status: "Approved", reason: approveModal.reason, maxOverlap: 2, paid: approveModal.paid }),
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
            <div key={t.id} className={`rounded-xl border px-3 py-2 text-sm shadow-sm ${toneCls}`}>
              <div className="flex items-start justify-between gap-3">
                <span className="leading-5">{t.text}</span>
                <button onClick={() => setToasts((x) => x.filter((i) => i.id !== t.id))} className="text-xs opacity-70 hover:opacity-100">✕</button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
