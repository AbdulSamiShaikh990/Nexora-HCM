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

type LiveRow = {
  id: number;
  employee: string;
  department: string;
  checkIn?: string;
  checkOut?: string;
  status: AttendanceStatus;
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

  // API Data States
  const [dailyData, setDailyData] = React.useState<AttendanceRecord[]>([]);
  const [requests, setRequests] = React.useState<SelfServiceItem[]>([]);
  const [liveIn, setLiveIn] = React.useState<LiveRow[]>([]);
  const [liveOut, setLiveOut] = React.useState<LiveRow[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  // Stats from API
  const [summary, setSummary] = React.useState({
    present: 0,
    late: 0,
    absent: 0,
    avgPer: 0,
    avgHours: 0,
  });

  const [isFilterOpen, setIsFilterOpen] = React.useState<boolean>(false);
  const [statusFilter, setStatusFilter] = React.useState<"all" | AttendanceStatus>("all");
  const [isAssignOpen, setIsAssignOpen] = React.useState<boolean>(false);
  const [assignStart, setAssignStart] = React.useState<string>(shiftStart);
  const [assignEnd, setAssignEnd] = React.useState<string>(shiftEnd);

  const loadAttendanceData = React.useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const params = new URLSearchParams({
        date: selectedDate,
        department,
        shiftStart,
        shiftEnd,
      });
      const response = await fetch(`/api/attendance?${params}`);
      if (!response.ok) throw new Error("Failed to fetch attendance");
      const result = await response.json();
      setDailyData(result.data || []);
    } catch (err) {
      setError("Failed to load attendance data");
      console.error(err);
      setDailyData([]);
    } finally {
      setLoading(false);
    }
  }, [selectedDate, department, shiftStart, shiftEnd]);

  React.useEffect(() => {
    if (tab === "shift" && showDaily) {
      loadAttendanceData();
    }
  }, [tab, showDaily, loadAttendanceData]);

  const loadStats = React.useCallback(async () => {
    try {
      const params = new URLSearchParams({
        date: selectedDate,
        department,
        shiftStart,
        shiftEnd,
        mode: "stats",
      });
      const response = await fetch(`/api/attendance?${params}`);
      if (!response.ok) throw new Error("Failed to fetch stats");
      const result = await response.json();
      setSummary({
        present: result.present || 0,
        late: result.late || 0,
        absent: result.absent || 0,
        avgPer: result.attendanceRate || 0,
        avgHours: result.avgHours || 0,
      });
    } catch (err) {
      console.error("Failed to load stats:", err);
      setSummary({ present: 0, late: 0, absent: 0, avgPer: 0, avgHours: 0 });
    }
  }, [selectedDate, department, shiftStart, shiftEnd]);

  React.useEffect(() => {
    loadStats();
  }, [loadStats]);

  // Fetch correction requests
  const loadCorrectionRequests = React.useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({ state: "pending" });
      if (department !== "all") params.append("department", department);
      const response = await fetch(`/api/attendance/requests?${params}`);
      if (!response.ok) throw new Error("Failed to fetch requests");
      const result = await response.json();
      setRequests(result.data || []);
    } catch (err) {
      setError("Failed to load correction requests");
      console.error(err);
      setRequests([]);
    } finally {
      setLoading(false);
    }
  }, [department]);

  React.useEffect(() => {
    if (tab === "self") {
      loadCorrectionRequests();
    }
  }, [tab, loadCorrectionRequests]);

  // Fetch live status
  const loadLiveStatus = React.useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        date: selectedDate,
        department,
        mode: "live",
      });
      const response = await fetch(`/api/attendance?${params}`);
      if (!response.ok) throw new Error("Failed to fetch live status");
      const result = await response.json();
      setLiveIn(result.in || []);
      setLiveOut(result.out || []);
    } catch (err) {
      setError("Failed to load live status");
      console.error(err);
      setLiveIn([]);
      setLiveOut([]);
    } finally {
      setLoading(false);
    }
  }, [selectedDate, department]);

  React.useEffect(() => {
    if (tab === "live") {
      loadLiveStatus();
    }
  }, [tab, loadLiveStatus]);

  

  const handleApprove = async (id: number) => {
    try {
      const response = await fetch(`/api/attendance/requests?id=${id}`, {
        method: "PUT",
      });
      if (!response.ok) throw new Error("Failed to approve");
      alert("Request approved successfully");
      await loadCorrectionRequests();
      await loadAttendanceData();
    } catch (err) {
      alert("Failed to approve request");
      console.error(err);
    }
  };

  const handleReject = async (id: number) => {
    try {
      const response = await fetch(`/api/attendance/requests?id=${id}`, {
        method: "DELETE",
      });
      if (!response.ok) throw new Error("Failed to reject");
      alert("Request rejected successfully");
      await loadCorrectionRequests();
    } catch (err) {
      alert("Failed to reject request");
      console.error(err);
    }
  };

  const handleApplyDate = () => {
    const finalDate = tempDate > todayIso ? todayIso : tempDate;
    setSelectedDate(finalDate);
    setIsDateDialogOpen(false);
    setShowDaily(true);
  };

  // Export handlers
  

  const handleExportExcel = async () => {
    try {
      const params = new URLSearchParams({ date: selectedDate, department, format: "excel" });
      const url = `/api/attendance?${params}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error("Export Excel failed");
      const blob = await res.blob();
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = `attendance-${selectedDate}.xls`;
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (e) {
      alert("Failed to export Excel");
      console.error(e);
    }
  };

  const handleExportPDF = () => {
    // Simple printable view for now; real PDF can be added later with a lib
    window.print();
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
          <ToolbarButton variant="ghost" onClick={handleExportPDF}>Export PDF</ToolbarButton>
          <ToolbarButton variant="ghost" onClick={handleExportExcel}>Export Excel</ToolbarButton>
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

      {/* Loading & Error */}
      {loading && (
        <div className="mt-4 text-center py-4">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <p className="mt-2 text-sm text-gray-600">Loading...</p>
        </div>
      )}
      {error && (
        <div className="mt-4 bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}

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
                    <ToolbarButton onClick={() => setIsFilterOpen(true)}>Filter</ToolbarButton>
                    <ToolbarButton variant="primary" onClick={() => { setAssignStart(shiftStart); setAssignEnd(shiftEnd); setIsAssignOpen(true); }}>Assign Shifts</ToolbarButton>
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
                        {dailyData
                          .filter((row) => (statusFilter === "all" ? true : row.status === statusFilter))
                          .map((row) => {
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
                                onClick={() => handleApprove(Number(r.id))}
                              >
                                <span>✅</span>
                                <span>Approve</span>
                              </button>
                              <button
                                className="inline-flex items-center gap-2 rounded-full border border-red-200 bg-white px-3 py-1 text-sm text-red-700 shadow-sm hover:bg-red-50"
                                onClick={() => handleReject(Number(r.id))}
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
            max={todayIso}
            onChange={(e) => setTempDate(e.target.value > todayIso ? todayIso : e.target.value)}
          />
        </div>
      </Modal>

      <Modal
        open={isFilterOpen}
        onClose={() => setIsFilterOpen(false)}
        title="Filter Attendance"
        footer={
          <>
            <ToolbarButton onClick={() => { setStatusFilter("all"); setIsFilterOpen(false); }}>Clear</ToolbarButton>
            <ToolbarButton variant="primary" onClick={() => setIsFilterOpen(false)}>Apply</ToolbarButton>
          </>
        }
      >
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <label className="w-24 text-sm text-gray-700">Status</label>
            <select
              className="h-9 rounded-md border border-gray-300 px-3 text-sm bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
            >
              <option value="all">All</option>
              <option value="Present">Present</option>
              <option value="Late">Late</option>
              <option value="Absent">Absent</option>
            </select>
          </div>
        </div>
      </Modal>

      <Modal
        open={isAssignOpen}
        onClose={() => setIsAssignOpen(false)}
        title="Assign Shift"
        footer={
          <>
            <ToolbarButton onClick={() => setIsAssignOpen(false)}>Cancel</ToolbarButton>
            <ToolbarButton
              variant="primary"
              onClick={() => { setShiftStart(assignStart); setShiftEnd(assignEnd); setIsAssignOpen(false); loadAttendanceData(); }}
            >
              Save
            </ToolbarButton>
          </>
        }
      >
        <div className="grid grid-cols-1 gap-3">
          <div className="flex items-center gap-2">
            <label className="text-sm text-gray-700 w-28">Shift Start</label>
            <input
              type="time"
              className="h-9 w-full rounded-md border border-gray-300 px-3 text-sm bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              value={assignStart}
              onChange={(e) => setAssignStart(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-2">
            <label className="text-sm text-gray-700 w-28">Shift End</label>
            <input
              type="time"
              className="h-9 w-full rounded-md border border-gray-300 px-3 text-sm bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              value={assignEnd}
              onChange={(e) => setAssignEnd(e.target.value)}
            />
          </div>
        </div>
      </Modal>
      </div>
    </div>
  );
}
