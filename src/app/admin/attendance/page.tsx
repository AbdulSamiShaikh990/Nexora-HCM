"use client";

import React from "react";

// Types
type AttendanceStatus = "Present" | "Late" | "Absent";

type AttendanceRecord = {
  id: string | number;
  employee: string;
  department: "engineering" | "marketing" | "sales" | "hr";
  date: string; // YYYY-MM-DD
  checkIn: string; // "09:15 AM" or "-"
  checkOut: string; // "05:30 PM" or "-"
  totalHours?: string;
  status: AttendanceStatus;
  overtime?: string;
};

type SelfServiceItem = {
  id: string;
  employee: string;
  date: string;
  issue: string;
  requestedCheckIn?: string;
  requestedCheckOut?: string;
  note: string;
  state?: "pending" | "approved" | "rejected";
};

// Helpers
function parse12hToMinutes(t: string): number | undefined {
  const s = t?.trim();
  if (!s || s === "-") return undefined;
  const m = s.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (!m) return undefined;
  let h = parseInt(m[1], 10);
  const min = parseInt(m[2], 10);
  const ap = m[3].toUpperCase();
  if (ap === "PM" && h !== 12) h += 12;
  if (ap === "AM" && h === 12) h = 0;
  return h * 60 + min;
}

function parse24hToMinutes(t: string): number | undefined {
  const s = t?.trim();
  if (!s) return undefined;
  const m = s.match(/^(\d{1,2}):(\d{2})$/);
  if (!m) return undefined;
  const h = parseInt(m[1], 10);
  const min = parseInt(m[2], 10);
  if (h < 0 || h > 23 || min < 0 || min > 59) return undefined;
  return h * 60 + min;
}

function minutesToHm(mins?: number): string {
  if (mins == null || isNaN(mins) || mins <= 0) return "0m";
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

function computeDeltas(
  checkIn: string,
  checkOut: string,
  shiftStart: string,
  shiftEnd: string
): { late: number; early: number; ot: number; total: number } {
  const inM = parse12hToMinutes(checkIn);
  const outM = parse12hToMinutes(checkOut);
  const ss = parse24hToMinutes(shiftStart) ?? 0;
  const se = parse24hToMinutes(shiftEnd) ?? 0;
  const late = Math.max(0, (inM ?? ss) - ss);
  const early = Math.max(0, se - (outM ?? se));
  const ot = Math.max(0, (outM ?? se) - se);
  const total = inM != null && outM != null ? Math.max(0, outM - inM) : 0;
  return { late, early, ot, total };
}

// Mock data (demo only)
const demoAttendance: AttendanceRecord[] = [
  {
    id: 1,
    employee: "Sarah Johnson",
    department: "engineering",
    date: "2025-10-08",
    checkIn: "08:15 AM",
    checkOut: "06:30 PM",
    status: "Present",
  },
  {
    id: 2,
    employee: "Michael Chen",
    department: "marketing",
    date: "2025-10-08",
    checkIn: "08:45 AM",
    checkOut: "05:45 PM",
    status: "Present",
  },
  {
    id: 3,
    employee: "Emily Rodriguez",
    department: "sales",
    date: "2025-10-08",
    checkIn: "09:30 AM",
    checkOut: "06:15 PM",
    status: "Present",
  },
  {
    id: 4,
    employee: "David Kim",
    department: "engineering",
    date: "2025-10-08",
    checkIn: "-",
    checkOut: "-",
    status: "Absent",
  },
  {
    id: 5,
    employee: "Lisa Thompson",
    department: "hr",
    date: "2025-10-08",
    checkIn: "08:30 AM",
    checkOut: "05:30 PM",
    status: "Present",
  },
];

const demoRequests: SelfServiceItem[] = [
  {
    id: "r1",
    employee: "David Kim",
    date: "2025-10-08",
    issue: "Missed check-in",
    requestedCheckIn: "09:05 AM",
    note: "Was on a client call during commute.",
    state: "pending",
  },
  {
    id: "r2",
    employee: "Emily Rodriguez",
    date: "2025-10-08",
    issue: "Wrong check-out",
    requestedCheckOut: "06:45 PM",
    note: "Worked late for a handoff.",
    state: "pending",
  },
];

// Simple UI atoms (no external UI library)
function Card({ children, className = "" }: React.PropsWithChildren<{ className?: string }>) {
  return (
    <div
      className={
        `rounded-xl border shadow-sm backdrop-blur supports-[backdrop-filter]:bg-white/70 bg-white/90 ` +
        `border-white/40 ${className}`
      }
    >
      {children}
    </div>
  );
}

function Badge({ color, children }: { color: "green" | "orange" | "red" | "blue"; children: React.ReactNode }) {
  const colors: Record<string, string> = {
    green: "bg-green-100 text-green-800 ring-green-500/30",
    orange: "bg-orange-100 text-orange-800 ring-orange-500/30",
    red: "bg-red-100 text-red-800 ring-red-500/30",
    blue: "bg-blue-100 text-blue-800 ring-blue-500/30",
  };
  return (
    <span className={`inline-flex items-center rounded-md px-2.5 py-1 text-xs font-medium ring-1 ring-inset ${colors[color]}`}>
      {children}
    </span>
  );
}

function ToolbarButton({ children, onClick, variant = "default" }: { children: React.ReactNode; onClick?: () => void; variant?: "default" | "primary" | "ghost" }) {
  const styles =
    variant === "primary"
      ? "bg-blue-600 text-white hover:bg-blue-700"
      : variant === "ghost"
      ? "bg-transparent hover:bg-gray-50 border"
      : "bg-gray-100 hover:bg-gray-200 border";
  return (
    <button onClick={onClick} className={`h-8 sm:h-9 px-2 sm:px-3 rounded-md text-xs sm:text-sm font-medium text-gray-800 ${styles}`}>
      {children}
    </button>
  );
}

// Simple Modal Dialog
function Modal({ open, onClose, title, children, footer }: { open: boolean; onClose: () => void; title: string; children: React.ReactNode; footer?: React.ReactNode }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      <div className="relative z-10 w-full max-w-[95vw] sm:max-w-md rounded-t-xl sm:rounded-xl bg-white border shadow-lg p-4 sm:p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between">
          <h3 className="text-base sm:text-lg font-semibold text-gray-900 truncate pr-2">{title}</h3>
          <button onClick={onClose} className="rounded-md p-1 hover:bg-gray-100 flex-shrink-0" aria-label="Close">✕</button>
        </div>
        <div className="mt-3 sm:mt-4">{children}</div>
        {footer && <div className="mt-4 sm:mt-6 flex flex-col-reverse sm:flex-row justify-end gap-2">{footer}</div>}
      </div>
    </div>
  );
}

// Page Component
export default function Page() {
  // Tab state
  const [tab, setTab] = React.useState<"shift" | "self" | "live">("shift");

  // Date state
  const todayIso = React.useMemo(() => new Date().toISOString().slice(0, 10), []);
  const [selectedDate, setSelectedDate] = React.useState<string>(todayIso);
  const [tempDate, setTempDate] = React.useState<string>(todayIso);
  const [isDateDialogOpen, setIsDateDialogOpen] = React.useState<boolean>(false);
  const [showDaily, setShowDaily] = React.useState<boolean>(true);

  // Shift config
  const [shiftStart, setShiftStart] = React.useState<string>("09:00");
  const [shiftEnd, setShiftEnd] = React.useState<string>("18:00");

  // Department filter
  const [department, setDepartment] = React.useState<"all" | "engineering" | "marketing" | "sales" | "hr">("all");

  // Self-service items state
  const [requests, setRequests] = React.useState<SelfServiceItem[]>(demoRequests);

  const dailyData = React.useMemo(() => {
    const date = selectedDate;
    const base = demoAttendance.filter((r) => r.date === date);
    return department === "all" ? base : base.filter((r) => r.department === department);
  }, [selectedDate, department]);

  const summary = React.useMemo(() => {
    const total = dailyData.length;
    const present = dailyData.filter((d) => d.status !== "Absent").length;
    const late = dailyData.filter((d) => d.status === "Late").length;
    const absent = dailyData.filter((d) => d.status === "Absent").length;
    const avgMinutes = dailyData.reduce((acc, d) => {
      const { total } = computeDeltas(d.checkIn, d.checkOut, shiftStart, shiftEnd);
      return acc + total;
    }, 0);
    const avgPer = total ? Math.round((present / total) * 1000) / 10 : 0;
    const avgHours = total ? Math.round((avgMinutes / total / 60) * 10) / 10 : 0;
    return { present, late, absent, avgPer, avgHours };
  }, [dailyData, shiftStart, shiftEnd]);

  const liveIn = dailyData.filter((d) => d.status !== "Absent");
  const liveOut = dailyData.filter((d) => d.status === "Absent");

  const handleApplyDate = () => {
    setSelectedDate(tempDate);
    setIsDateDialogOpen(false);
    setShowDaily(true);
  };

  return (
    <div className="min-h-screen w-full overflow-x-hidden bg-gradient-to-br from-indigo-50 to-purple-50">
      <div className="mx-auto w-full max-w-7xl p-2 sm:p-4 lg:p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 sm:gap-4">
        <div className="min-w-0 flex-1">
          <h1 className="text-xl sm:text-2xl font-semibold text-gray-900 truncate">Attendance Tracking</h1>
          <p className="text-xs sm:text-sm text-gray-600">Monitor employee attendance and working hours</p>
        </div>
        <div className="flex flex-wrap gap-1.5 sm:gap-2">
          <ToolbarButton variant="ghost" onClick={() => alert("Export PDF (placeholder)")}>Export PDF</ToolbarButton>
          <ToolbarButton variant="ghost" onClick={() => alert("Export Excel (placeholder)")}>Export Excel</ToolbarButton>
        </div>
      </div>

      {/* Stats */}
      <div className="mt-3 sm:mt-4 grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3 lg:gap-4">
        <Card className="p-2 sm:p-3 lg:p-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div className="min-w-0 flex-1">
              <p className="text-xs sm:text-sm text-gray-600 truncate">Present Today</p>
              <p className="mt-1 sm:mt-2 text-lg sm:text-2xl font-semibold text-gray-900">{summary.present}</p>
              <p className="text-[10px] sm:text-xs text-gray-500 mt-0.5 sm:mt-1 truncate">{summary.avgPer}% attendance rate</p>
            </div>
            <Badge color="green">OK</Badge>
          </div>
        </Card>
        <Card className="p-2 sm:p-3 lg:p-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div className="min-w-0 flex-1">
              <p className="text-xs sm:text-sm text-gray-600 truncate">Late Arrivals</p>
              <p className="mt-1 sm:mt-2 text-lg sm:text-2xl font-semibold text-gray-900">{summary.late}</p>
              <p className="text-[10px] sm:text-xs text-gray-500 mt-0.5 sm:mt-1 truncate">of workforce</p>
            </div>
            <Badge color="orange">Late</Badge>
          </div>
        </Card>
        <Card className="p-2 sm:p-3 lg:p-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div className="min-w-0 flex-1">
              <p className="text-xs sm:text-sm text-gray-600 truncate">Absent</p>
              <p className="mt-1 sm:mt-2 text-lg sm:text-2xl font-semibold text-gray-900">{summary.absent}</p>
              <p className="text-[10px] sm:text-xs text-gray-500 mt-0.5 sm:mt-1 truncate">of workforce</p>
            </div>
            <Badge color="red">Issue</Badge>
          </div>
        </Card>
        <Card className="p-2 sm:p-3 lg:p-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div className="min-w-0 flex-1">
              <p className="text-xs sm:text-sm text-gray-600 truncate">Avg. Hours</p>
              <p className="mt-1 sm:mt-2 text-lg sm:text-2xl font-semibold text-gray-900">{summary.avgHours}h</p>
              <p className="text-[10px] sm:text-xs text-gray-500 mt-0.5 sm:mt-1 truncate">Per employee today</p>
            </div>
            <Badge color="blue">Info</Badge>
          </div>
        </Card>
      </div>

      {/* Tabs */}
      <div className="mt-3 sm:mt-4">
        <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
          <ToolbarButton variant={tab === "shift" ? "primary" : "ghost"} onClick={() => setTab("shift")}>Shift Management</ToolbarButton>
          <ToolbarButton variant={tab === "self" ? "primary" : "ghost"} onClick={() => setTab("self")}>Self-Service</ToolbarButton>
          <ToolbarButton variant={tab === "live" ? "primary" : "ghost"} onClick={() => setTab("live")}>Live Status</ToolbarButton>
        </div>
      </div>

      {/* Top toolbar */}
      <div className="mt-3 sm:mt-4 flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
        <div className="flex items-center gap-2">
          <ToolbarButton onClick={() => setIsDateDialogOpen(true)}>
            <span className="mr-2">🗓️</span>
            <span className="hidden xs:inline">Select Date</span><span className="xs:hidden">Date</span>
          </ToolbarButton>
          <span className="text-xs sm:text-sm text-gray-600 truncate">{new Date(selectedDate).toLocaleDateString()}</span>
        </div>
      </div>

      {/* Shift Management */}
      {tab === "shift" && (
        <div className="mt-4 flex flex-col gap-6 items-start">
          {showDaily && (
            <Card className="w-full">
              <div className="p-2 sm:p-3 lg:p-4">
                <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3 sm:gap-4">
                  <div className="min-w-0 flex-1">
                    <h2 className="text-base sm:text-lg font-semibold text-gray-900 truncate">
                      Daily Attendance – {new Date(selectedDate).toLocaleDateString()}
                    </h2>
                  </div>
                  <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                    <select
                      className="h-9 rounded-md border border-gray-300 px-3 text-sm bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      value={department}
                      onChange={(e) => setDepartment(e.target.value as "all" | "engineering" | "marketing" | "sales" | "hr")}
                    >
                      <option value="all">All Departments</option>
                      <option value="engineering">Engineering</option>
                      <option value="marketing">Marketing</option>
                      <option value="sales">Sales</option>
                      <option value="hr">HR</option>
                    </select>
                    <ToolbarButton onClick={() => setIsDateDialogOpen(true)}>Change Date</ToolbarButton>
                    <ToolbarButton onClick={() => alert("Filter dialog (placeholder)")}>Filter</ToolbarButton>
                    <ToolbarButton variant="primary" onClick={() => alert("Assign Shifts (placeholder)")}>Assign Shifts</ToolbarButton>
                  </div>
                </div>

                {/* Shift inputs */}
                <div className="mt-3 sm:mt-4 grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3">
                  <div className="flex items-center gap-2">
                    <label className="text-xs sm:text-sm text-gray-700 w-20 sm:w-24 flex-shrink-0">Shift Start</label>
                    <input
                      type="time"
                      className="h-9 w-full rounded-md border border-gray-300 px-3 text-sm bg-white text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      value={shiftStart}
                      onChange={(e) => setShiftStart(e.target.value)}
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <label className="text-xs sm:text-sm text-gray-700 w-20 sm:w-24 flex-shrink-0">Shift End</label>
                    <input
                      type="time"
                      className="h-9 w-full rounded-md border border-gray-300 px-3 text-sm bg-white text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      value={shiftEnd}
                      onChange={(e) => setShiftEnd(e.target.value)}
                    />
                  </div>
                </div>

                {/* Table */}
                <div className="mt-4 sm:mt-6 -mx-2 sm:mx-0">
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200 text-xs sm:text-sm">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-2 sm:px-4 py-2 sm:py-3 text-left text-[10px] sm:text-xs font-medium text-gray-600 uppercase tracking-wider">Employee</th>
                        <th className="px-2 sm:px-4 py-2 sm:py-3 text-left text-[10px] sm:text-xs font-medium text-gray-600 uppercase tracking-wider">Check In</th>
                        <th className="px-2 sm:px-4 py-2 sm:py-3 text-left text-[10px] sm:text-xs font-medium text-gray-600 uppercase tracking-wider">Check Out</th>
                        <th className="px-2 sm:px-4 py-2 sm:py-3 text-left text-[10px] sm:text-xs font-medium text-gray-600 uppercase tracking-wider hidden md:table-cell">Total Hours</th>
                        <th className="px-2 sm:px-4 py-2 sm:py-3 text-left text-[10px] sm:text-xs font-medium text-gray-600 uppercase tracking-wider hidden md:table-cell">Late</th>
                        <th className="px-2 sm:px-4 py-2 sm:py-3 text-left text-[10px] sm:text-xs font-medium text-gray-600 uppercase tracking-wider hidden lg:table-cell">Early Dep.</th>
                        <th className="px-2 sm:px-4 py-2 sm:py-3 text-left text-[10px] sm:text-xs font-medium text-gray-600 uppercase tracking-wider hidden lg:table-cell">Overtime</th>
                        <th className="px-2 sm:px-4 py-2 sm:py-3 text-left text-[10px] sm:text-xs font-medium text-gray-600 uppercase tracking-wider">Status</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-100">
                      {dailyData.map((row) => {
                        const deltas = computeDeltas(row.checkIn, row.checkOut, shiftStart, shiftEnd);
                        const statusColor = row.status === "Present" ? "green" : row.status === "Late" ? "orange" : "red";
                        const totalStr = minutesToHm(deltas.total);
                        const lateStr = minutesToHm(deltas.late);
                        const earlyStr = minutesToHm(deltas.early);
                        const otStr = minutesToHm(deltas.ot);
                        return (
                          <tr key={row.id} className="hover:bg-gray-50">
                            <td className="px-2 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm text-gray-900 max-w-[100px] sm:max-w-[160px] truncate">{row.employee}</td>
                            <td className="px-2 sm:px-4 py-2 sm:py-3 whitespace-nowrap text-xs sm:text-sm text-gray-900">{row.checkIn}</td>
                            <td className="px-2 sm:px-4 py-2 sm:py-3 whitespace-nowrap text-xs sm:text-sm text-gray-900">{row.checkOut}</td>
                            <td className="px-2 sm:px-4 py-2 sm:py-3 whitespace-nowrap text-xs sm:text-sm text-gray-900 hidden md:table-cell">{totalStr}</td>
                            <td className="px-2 sm:px-4 py-2 sm:py-3 whitespace-nowrap text-xs sm:text-sm text-gray-700 hidden md:table-cell">
                              {deltas.late > 0 ? <Badge color="orange">{lateStr}</Badge> : <span className="text-gray-400">-</span>}
                            </td>
                            <td className="px-2 sm:px-4 py-2 sm:py-3 whitespace-nowrap text-xs sm:text-sm text-gray-700 hidden lg:table-cell">
                              {deltas.early > 0 ? <Badge color="orange">{earlyStr}</Badge> : <span className="text-gray-400">-</span>}
                            </td>
                            <td className="px-2 sm:px-4 py-2 sm:py-3 whitespace-nowrap text-xs sm:text-sm text-gray-700 hidden lg:table-cell">
                              {deltas.ot > 0 ? <Badge color="blue">{otStr}</Badge> : <span className="text-gray-400">-</span>}
                            </td>
                            <td className="px-2 sm:px-4 py-2 sm:py-3 whitespace-nowrap text-xs sm:text-sm text-gray-700">
                              <Badge color={statusColor as "green" | "orange" | "red"}>{row.status}</Badge>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                    </table>
                  </div>
                </div>
                <div className="mt-4 flex justify-end">
                  <ToolbarButton onClick={() => setShowDaily(false)}>Hide Daily Attendance</ToolbarButton>
                </div>
              </div>
            </Card>
          )}
        </div>
      )}

      {/* Self-Service */}
      {tab === "self" && (
        <div className="mt-4">
          <Card>
            <div className="p-2 sm:p-3 lg:p-4">
              <h2 className="text-base sm:text-lg font-semibold text-gray-900">Correction Requests</h2>
              <div className="mt-3 sm:mt-4 -mx-2 sm:mx-0">
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200 text-xs sm:text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Employee</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Issue</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Requested (In/Out)</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Note</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-100">
                    {requests.length === 0 && (
                      <tr>
                        <td colSpan={6} className="px-4 py-6 text-center text-sm text-gray-500">
                          No pending requests
                        </td>
                      </tr>
                    )}
                    {requests.map((r) => (
                      <tr key={r.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">{r.employee}</td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">{new Date(r.date).toLocaleDateString()}</td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">{r.issue}</td>
                        <td className="px-4 py-3 text-sm text-gray-700">
                          <div className="flex flex-col gap-1">
                            <div>
                              <span className="text-gray-500 mr-1">In:</span>
                              <span>{r.requestedCheckIn ?? "-"}</span>
                            </div>
                            <div>
                              <span className="text-gray-500 mr-1">Out:</span>
                              <span>{r.requestedCheckOut ?? "-"}</span>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-700 max-w-sm">{r.note}</td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700">
                          {r.state === "pending" ? (
                            <div className="flex flex-col gap-2 items-start">
                              <button
                                className="inline-flex items-center gap-2 rounded-full border border-green-200 bg-white px-3 py-1 text-sm text-green-700 shadow-sm hover:bg-green-50"
                                onClick={() => setRequests((prev) => prev.map((x) => (x.id === r.id ? { ...x, state: "approved" } : x)))}
                              >
                                <span>✅</span>
                                <span>Approve</span>
                              </button>
                              <button
                                className="inline-flex items-center gap-2 rounded-full border border-red-200 bg-white px-3 py-1 text-sm text-red-700 shadow-sm hover:bg-red-50"
                                onClick={() => setRequests((prev) => prev.map((x) => (x.id === r.id ? { ...x, state: "rejected" } : x)))}
                              >
                                <span>❌</span>
                                <span>Reject</span>
                              </button>
                            </div>
                          ) : r.state === "approved" ? (
                            <Badge color="green">Approved</Badge>
                          ) : (
                            <Badge color="red">Rejected</Badge>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  </table>
                </div>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Live Status */}
      {tab === "live" && (
        <div className="mt-4">
          <Card className="p-2 sm:p-3 lg:p-4">
            <h2 className="text-base sm:text-lg font-semibold text-gray-900">Who is In/Out right now</h2>
            <div className="mt-3 sm:mt-4 grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
              <div>
                <div className="flex items-center gap-2 text-xs sm:text-sm text-gray-700">
                  <span>🧑‍💼</span>
                  <span className="font-medium">In</span>
                </div>
                <ul className="mt-2 sm:mt-3 space-y-2 sm:space-y-3">
                  {liveIn.map((d) => (
                    <li key={d.id} className="flex flex-col xs:flex-row xs:items-center xs:justify-between gap-1 xs:gap-2 rounded-lg border bg-white px-2 sm:px-3 py-2 shadow-sm">
                          <div className="text-xs sm:text-sm text-gray-900 truncate">{d.employee}</div>
                          <span className="inline-flex items-center rounded-full border px-2 py-1 text-[10px] sm:text-xs text-gray-900 bg-gray-50 flex-shrink-0">In since <span className="text-gray-900 ml-1">{d.checkIn}</span></span>
                    </li>
                  ))}
                  {liveIn.length === 0 && (
                    <li className="text-sm text-gray-500">No one is currently in</li>
                  )}
                </ul>
              </div>
              <div>
                <div className="flex items-center gap-2 text-xs sm:text-sm text-gray-700">
                  <span>🚪</span>
                  <span className="font-medium">Out</span>
                </div>
                <ul className="mt-2 sm:mt-3 space-y-2 sm:space-y-3">
                  {liveOut.map((d) => (
                    <li key={d.id} className="flex flex-col xs:flex-row xs:items-center xs:justify-between gap-1 xs:gap-2 rounded-lg border bg-white px-2 sm:px-3 py-2 shadow-sm">
                      <div className="text-xs sm:text-sm text-gray-900 truncate">{d.employee}</div>
                      <span className="inline-flex items-center rounded-full border px-2 py-1 text-[10px] sm:text-xs text-gray-900 bg-gray-50 flex-shrink-0">Last out {d.checkOut !== "-" ? d.checkOut : "N/A"}</span>
                    </li>
                  ))}
                  {liveOut.length === 0 && (
                    <li className="text-sm text-gray-500">No one is out</li>
                  )}
                </ul>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Date Selection Modal */}
      <Modal
        open={isDateDialogOpen}
        onClose={() => setIsDateDialogOpen(false)}
        title="Select Date"
        footer={
          <>
            <ToolbarButton onClick={() => setIsDateDialogOpen(false)}>Cancel</ToolbarButton>
            <ToolbarButton variant="primary" onClick={handleApplyDate}>Apply</ToolbarButton>
          </>
        }
      >
        {/* Calendar placeholder: uses native date input for simplicity */}
        <div className="rounded-md border p-3 bg-white">
          <input
            type="date"
            className="h-10 w-full rounded-md border border-gray-300 px-3 text-sm bg-white text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            value={tempDate}
            onChange={(e) => setTempDate(e.target.value)}
          />
        </div>
      </Modal>
      </div>
    </div>
  );
}

export {};
