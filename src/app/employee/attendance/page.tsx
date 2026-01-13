"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";

// Types
type AttendanceRecord = {
  id: number;
  date: string;
  checkIn: string | null;
  checkOut: string | null;
  totalHours: number;
  overtime: number;
  breakTime: number;
  status: string;
};

type CorrectionRequest = {
  id: number;
  date: string;
  issue: string;
  requestedCheckIn: string | null;
  requestedCheckOut: string | null;
  note: string | null;
  state: string;
  createdAt: string;
};

type RemoteWorkRequest = {
  id: number;
  startDate: string;
  endDate: string;
  reason: string;
  state: string;
  createdAt: string;
  approvedBy: string | null;
  approvedAt: string | null;
};

type Summary = {
  totalHours: number;
  avgHours: number;
  attendanceRate: number;
  overtimeHours: number;
  presentDays: number;
  lateDays: number;
  absentDays: number;
  halfDays: number;
};

type TodayStatus = {
  id: number;
  date: string;
  checkIn: string | null;
  checkOut: string | null;
  status: string;
} | null;

type AttendanceData = {
  employee: { id: number; name: string; email: string };
  today: TodayStatus;
  summary: Summary;
  records: AttendanceRecord[];
  corrections: CorrectionRequest[];
  month: string;
};

// Demo data for fallback
const getDemoData = (): AttendanceData => {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  
  const records: AttendanceRecord[] = [];
  for (let d = 1; d <= 15; d++) {
    const date = new Date(year, month, d);
    if (date.getDay() === 0 || date.getDay() === 6) continue;
    
    const statuses = ["present", "present", "present", "late", "half-day"];
    const status = statuses[Math.floor(Math.random() * statuses.length)];
    const checkInHour = 8 + Math.floor(Math.random() * 2);
    const checkInMin = Math.floor(Math.random() * 60);
    const checkOutHour = 17 + Math.floor(Math.random() * 2);
    const checkOutMin = Math.floor(Math.random() * 60);
    
    records.push({
      id: d,
      date: `${year}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`,
      checkIn: `${String(checkInHour).padStart(2, "0")}:${String(checkInMin).padStart(2, "0")}`,
      checkOut: `${String(checkOutHour).padStart(2, "0")}:${String(checkOutMin).padStart(2, "0")}`,
      totalHours: checkOutHour - checkInHour + (checkOutMin - checkInMin) / 60,
      overtime: Math.max(0, checkOutHour - 18 + checkOutMin / 60),
      breakTime: 1,
      status,
    });
  }

  return {
    employee: { id: 1, name: "Demo User", email: "demo@nexora.com" },
    today: null,
    summary: {
      totalHours: 62.3,
      avgHours: 7.8,
      attendanceRate: 62.5,
      overtimeHours: 2.0,
      presentDays: 12,
      lateDays: 2,
      absentDays: 1,
      halfDays: 1,
    },
    records: records.reverse(),
    corrections: [],
    month: `${year}-${String(month + 1).padStart(2, "0")}`,
  };
};

// Format time to 12-hour clock
const to12Hour = (time: string | null) => {
  if (!time) return "-";
  const [h, m] = time.split(":").map(Number);
  if (Number.isNaN(h) || Number.isNaN(m)) return time;
  const date = new Date();
  date.setHours(h, m, 0, 0);
  return date.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: true });
};

const formatDateDisplay = (dateStr: string) => {
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
};

const getMonthLabel = (month: string) => {
  const [y, m] = month.split("-").map(Number);
  if (Number.isNaN(y) || Number.isNaN(m)) return month;
  const d = new Date(y, m - 1, 1);
  return d.toLocaleDateString("en-US", { month: "long", year: "numeric" });
};

export default function AttendancePage() {
  const [data, setData] = useState<AttendanceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  });
  const [locationStatus, setLocationStatus] = useState<string>("");
  const [showCorrectionModal, setShowCorrectionModal] = useState(false);
  const [correctionForm, setCorrectionForm] = useState({
    date: "",
    issue: "",
    requestedCheckIn: "",
    requestedCheckOut: "",
    note: "",
  });
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [reportStart, setReportStart] = useState("");
  const [reportEnd, setReportEnd] = useState("");
  const [showRemoteModal, setShowRemoteModal] = useState(false);
  const [remoteRequests, setRemoteRequests] = useState<RemoteWorkRequest[]>([]);
  const [remoteForm, setRemoteForm] = useState({
    startDate: "",
    endDate: "",
    reason: "",
  });

  // Fetch attendance data
  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/attendance/employee?month=${selectedMonth}`);
      if (!res.ok) throw new Error("API unavailable");
      const json = await res.json();
      setData(json);
    } catch {
      setData(getDemoData());
    } finally {
      setLoading(false);
    }
  }, [selectedMonth]);

  useEffect(() => {
    fetchData();
    fetchRemoteRequests();
  }, [fetchData]);

  const shiftMonth = (delta: number) => {
    const [year, month] = selectedMonth.split("-").map(Number);
    const current = new Date(year, (month || 1) - 1, 1);
    current.setMonth(current.getMonth() + delta);
    const nextValue = `${current.getFullYear()}-${String(current.getMonth() + 1).padStart(2, "0")}`;
    setSelectedMonth(nextValue);
  };

  const fetchRemoteRequests = async () => {
    try {
      const res = await fetch("/api/attendance/employee/remote");
      if (res.ok) {
        const data = await res.json();
        setRemoteRequests(data.requests || []);
      }
    } catch {
      console.error("Failed to fetch remote requests");
    }
  };

  const submitRemoteRequest = async () => {
    try {
      setActionLoading(true);
      const res = await fetch("/api/attendance/employee/remote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(remoteForm),
      });

      const result = await res.json();
      
      if (!res.ok) {
        setMessage({ type: "error", text: result.error });
        return;
      }

      setMessage({ type: "success", text: "Remote work request submitted successfully" });
      setShowRemoteModal(false);
      setRemoteForm({ startDate: "", endDate: "", reason: "" });
      fetchRemoteRequests();
    } catch {
      setMessage({ type: "error", text: "Failed to submit remote work request" });
    } finally {
      setActionLoading(false);
    }
  };

  const filteredRecords = (data?.records || []).filter((record) => {
    const recordDate = new Date(record.date);
    const startOk = reportStart ? recordDate >= new Date(reportStart) : true;
    const endOk = reportEnd ? recordDate <= new Date(reportEnd) : true;
    return startOk && endOk;
  });

  const handleExportPdf = () => {
    if (!data) return;
    const win = window.open("", "_blank");
    if (!win) return;

    const summary = data.summary;
    const rows = filteredRecords
      .map(
        (r) => `
          <tr>
            <td>${formatDateDisplay(r.date)}</td>
            <td>${to12Hour(r.checkIn)}</td>
            <td>${to12Hour(r.checkOut)}</td>
            <td>${r.totalHours.toFixed(2)}h</td>
            <td>${r.overtime.toFixed(2)}h</td>
            <td>${r.breakTime}h</td>
            <td>${r.status}</td>
          </tr>
        `
      )
      .join("");

    const reportRange = reportStart || reportEnd
      ? `${reportStart || "Start"} → ${reportEnd || "End"}`
      : getMonthLabel(selectedMonth);

    win.document.write(`
      <html>
      <head>
        <title>Attendance Report - ${reportRange}</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 24px; color: #111; }
          h1 { margin: 0 0 8px; }
          .muted { color: #555; margin-bottom: 16px; }
          table { width: 100%; border-collapse: collapse; margin-top: 12px; }
          th, td { border: 1px solid #ddd; padding: 8px; font-size: 12px; }
          th { background: #f97316; color: white; text-align: left; }
          .summary { display: grid; grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)); gap: 12px; margin-top: 16px; }
          .card { border: 1px solid #eee; border-radius: 8px; padding: 10px; background: #fafafa; }
          .label { color: #555; font-size: 12px; }
          .value { font-size: 16px; font-weight: 700; }
        </style>
      </head>
      <body>
        <h1>Attendance Report</h1>
        <div class="muted">${reportRange} • ${data.employee.name} (${data.employee.email})</div>
        <div class="summary">
          <div class="card"><div class="label">Total Hours</div><div class="value">${summary.totalHours}h</div></div>
          <div class="card"><div class="label">Average Hours</div><div class="value">${summary.avgHours}h</div></div>
          <div class="card"><div class="label">Attendance Rate</div><div class="value">${summary.attendanceRate}%</div></div>
          <div class="card"><div class="label">Overtime Hours</div><div class="value">${summary.overtimeHours}h</div></div>
        </div>
        <table>
          <thead>
            <tr>
              <th>Date</th><th>Check In</th><th>Check Out</th><th>Total Hours</th><th>Overtime</th><th>Break</th><th>Status</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
        <script>window.onload = () => { window.print(); };</script>
      </body>
      </html>
    `);
    win.document.close();
  };

  // Get current location
  const getCurrentLocation = (): Promise<{ latitude: number; longitude: number }> => {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error("Geolocation not supported"));
        return;
      }
      
      setLocationStatus("Getting location...");
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setLocationStatus("Location acquired");
          resolve({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          });
        },
        (error) => {
          setLocationStatus("Location error");
          reject(error);
        },
        { enableHighAccuracy: true, timeout: 10000 }
      );
    });
  };

  // Mark attendance
  const markAttendance = async (action: "checkIn" | "checkOut") => {
    try {
      setActionLoading(true);
      setMessage(null);
      
      const location = await getCurrentLocation();
      
      const res = await fetch("/api/attendance/employee", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action,
          latitude: location.latitude,
          longitude: location.longitude,
        }),
      });

      const result = await res.json();
      
      if (!res.ok) {
        setMessage({ type: "error", text: result.message || result.error });
        return;
      }

      setMessage({ type: "success", text: result.message });
      fetchData();
    } catch (err) {
      setMessage({ 
        type: "error", 
        text: err instanceof Error ? err.message : "Failed to mark attendance" 
      });
    } finally {
      setActionLoading(false);
      setLocationStatus("");
    }
  };

  // Submit correction request
  const submitCorrection = async () => {
    try {
      setActionLoading(true);
      
      const res = await fetch("/api/attendance/employee/correction", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(correctionForm),
      });

      const result = await res.json();
      
      if (!res.ok) {
        setMessage({ type: "error", text: result.error });
        return;
      }

      setMessage({ type: "success", text: "Correction request submitted" });
      setShowCorrectionModal(false);
      setCorrectionForm({ date: "", issue: "", requestedCheckIn: "", requestedCheckOut: "", note: "" });
      fetchData();
    } catch {
      setMessage({ type: "error", text: "Failed to submit correction" });
    } finally {
      setActionLoading(false);
    }
  };

  // Get status badge color
  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case "present": return "bg-green-100 text-green-800";
      case "late": return "bg-orange-100 text-orange-700";
      case "absent": return "bg-red-600 text-white";
      case "half-day": return "bg-orange-600 text-white";
      default: return "bg-gray-100 text-gray-700";
    }
  };

  // Get calendar status color
  const getCalendarColor = (status: string) => {
    switch (status.toLowerCase()) {
      case "present": return "bg-green-200 border-green-400 text-green-900";
      case "late": return "bg-orange-400 border-orange-500 text-white";
      case "absent": return "bg-red-600 border-red-700 text-white";
      case "half-day": return "bg-orange-600 border-orange-700 text-white";
      default: return "bg-gray-50 border-gray-200 text-gray-700";
    }
  };

  // Generate calendar days
  const getCalendarDays = () => {
    const [year, month] = selectedMonth.split("-").map(Number);
    const firstDay = new Date(year, month - 1, 1);
    const lastDay = new Date(year, month, 0);
    const daysInMonth = lastDay.getDate();
    const startDayOfWeek = firstDay.getDay();
    const today = new Date();
    
    const days: { day: number; status: string | null }[] = [];
    
    for (let i = 0; i < startDayOfWeek; i++) {
      days.push({ day: 0, status: null });
    }
    
    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${year}-${String(month).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
      const record = data?.records.find((r) => r.date === dateStr);
      const dateObj = new Date(year, month - 1, d, 12, 0, 0);
      const isWeekend = dateObj.getDay() === 0 || dateObj.getDay() === 6;
      const isPastDay = dateObj < new Date(today.getFullYear(), today.getMonth(), today.getDate());
      const status = record?.status || (!record && isPastDay && !isWeekend ? "absent" : null);
      days.push({ day: d, status });
    }
    
    return days;
  };

  if (loading) {
    return (
      <div className="w-full flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500"></div>
      </div>
    );
  }

  return (
    <div className="w-full space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-4">
          <Link 
            href="/employee/dashboard" 
            className="flex items-center gap-2 text-gray-600 hover:text-orange-600 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            <span className="text-sm font-medium">Back to Dashboard</span>
          </Link>
        </div>
        <div>
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900">Attendance Details</h1>
          <p className="text-sm text-gray-600">Track your daily attendance and work hours</p>
        </div>
      </div>

      {/* Message */}
      {message && (
        <div className={`p-4 rounded-xl ${message.type === "success" ? "bg-green-50 border border-green-200 text-green-700" : "bg-red-50 border border-red-200 text-red-700"}`}>
          <p className="text-sm font-medium">{message.text}</p>
        </div>
      )}

      {/* Quick Actions Card */}
      <div className="bg-white rounded-2xl shadow-lg border border-orange-100 p-6">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
          {/* Today's Status */}
          <div className="flex items-center gap-4">
            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shadow-lg ${data?.today?.checkIn ? "bg-gradient-to-br from-green-400 to-green-500" : "bg-gradient-to-br from-orange-400 to-orange-500"}`}>
              <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <p className="text-sm text-gray-500">Today&apos;s Status</p>
              <p className="text-lg font-semibold text-gray-900">
                {data?.today?.checkIn 
                  ? `Checked In at ${to12Hour(data.today.checkIn)}` 
                  : "Not Checked In"}
              </p>
              {data?.today?.checkOut && (
                <p className="text-sm text-gray-700">Checked Out at {to12Hour(data.today.checkOut)}</p>
              )}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap gap-3">
            <button
              onClick={() => markAttendance("checkIn")}
              disabled={actionLoading || !!data?.today?.checkIn}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-green-500 to-green-600 text-white font-medium shadow-lg shadow-green-500/30 hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
              </svg>
              Check In
            </button>
            <button
              onClick={() => markAttendance("checkOut")}
              disabled={actionLoading || !data?.today?.checkIn || !!data?.today?.checkOut}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-orange-500 to-orange-600 text-white font-medium shadow-lg shadow-orange-500/30 hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
              Check Out
            </button>
            <button
              onClick={() => setShowCorrectionModal(true)}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl border-2 border-orange-200 text-orange-700 font-medium hover:bg-orange-50 transition-all"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
              Request Correction
            </button>
            <button
              onClick={() => setShowRemoteModal(true)}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl border-2 border-blue-200 text-blue-700 font-medium hover:bg-blue-50 transition-all"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
              </svg>
              Request Remote Work
            </button>
          </div>
        </div>
        {locationStatus && (
          <p className="mt-3 text-sm text-gray-500 flex items-center gap-2">
            <span className="animate-pulse">📍</span> {locationStatus}
          </p>
        )}
        <p className="mt-2 text-xs text-gray-400">
          📍 Location verification required. Office: 33.63°N, 72.92°E (500m radius)
        </p>
      </div>

      {/* Month Selector + Filters */}
      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <label className="text-sm font-semibold text-gray-800">Select Month</label>
          <div className="flex items-center gap-2">
            <button
              onClick={() => shiftMonth(-1)}
              className="px-3 py-2 rounded-xl border border-gray-200 text-gray-700 hover:bg-gray-50"
              aria-label="Previous month"
            >
              ←
            </button>
            <input
              type="month"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="px-4 py-2 rounded-xl border border-gray-200 focus:ring-2 focus:ring-orange-400 focus:border-transparent bg-white text-gray-900"
            />
            <button
              onClick={() => shiftMonth(1)}
              className="px-3 py-2 rounded-xl border border-gray-200 text-gray-700 hover:bg-gray-50"
              aria-label="Next month"
            >
              →
            </button>
          </div>
          <div className="flex items-center gap-2 ml-auto">
            <button
              onClick={handleExportPdf}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-orange-500 text-white font-medium shadow hover:bg-orange-600"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Export PDF
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-700">Report Start</label>
            <input
              type="date"
              value={reportStart}
              onChange={(e) => setReportStart(e.target.value)}
              className="px-4 py-2 rounded-xl border border-gray-200 focus:ring-2 focus:ring-orange-400 focus:border-transparent bg-white text-gray-900"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-700">Report End</label>
            <input
              type="date"
              value={reportEnd}
              onChange={(e) => setReportEnd(e.target.value)}
              className="px-4 py-2 rounded-xl border border-gray-200 focus:ring-2 focus:ring-orange-400 focus:border-transparent bg-white text-gray-900"
            />
          </div>
          <div className="flex items-end">
            <button
              onClick={() => { setReportStart(""); setReportEnd(""); }}
              className="px-4 py-2 rounded-xl border border-gray-200 text-gray-700 hover:bg-gray-50 w-full"
            >
              Clear Filters
            </button>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl shadow-md border border-blue-100 p-5">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center">
              <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <p className="text-xs text-gray-600">Total Hours</p>
              <p className="text-2xl font-bold text-gray-900">{data?.summary.totalHours || 0}h</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-2xl shadow-md border border-green-100 p-5">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-green-100 flex items-center justify-center">
              <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
              </svg>
            </div>
            <div>
              <p className="text-xs text-gray-600">Average Hours</p>
              <p className="text-2xl font-bold text-gray-900">{data?.summary.avgHours || 0}h</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-2xl shadow-md border border-yellow-100 p-5">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-yellow-100 flex items-center justify-center">
              <svg className="w-6 h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <div>
              <p className="text-xs text-gray-600">Attendance Rate</p>
              <p className="text-2xl font-bold text-gray-900">{data?.summary.attendanceRate || 0}%</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-2xl shadow-md border border-purple-100 p-5">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-purple-100 flex items-center justify-center">
              <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <p className="text-xs text-gray-600">Overtime Hours</p>
              <p className="text-2xl font-bold text-gray-900">{data?.summary.overtimeHours || 0}h</p>
            </div>
          </div>
        </div>
      </div>

      {/* Attendance Records Table */}
      <div className="bg-white rounded-2xl shadow-lg border border-orange-100 p-6">
        <div className="mb-6">
          <h2 className="text-lg font-semibold text-gray-900">Attendance Records</h2>
          <p className="text-sm text-gray-500">Detailed view of your daily attendance</p>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Date</th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Check In</th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Check Out</th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Total Hours</th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Overtime</th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Break Time</th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredRecords.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-12 text-gray-500">
                    No attendance records for this month
                  </td>
                </tr>
              ) : (
                filteredRecords.map((record) => (
                  <tr key={record.id} className="hover:bg-orange-50/50 transition-colors">
                    <td className="py-4 px-4 text-sm text-gray-900 font-medium">
                      {formatDateDisplay(record.date)}
                    </td>
                    <td className="py-4 px-4 text-sm text-gray-800">{to12Hour(record.checkIn)}</td>
                    <td className="py-4 px-4 text-sm text-orange-700 font-semibold">{to12Hour(record.checkOut)}</td>
                    <td className="py-4 px-4 text-sm text-gray-800">{record.totalHours.toFixed(2)}h</td>
                    <td className="py-4 px-4 text-sm text-gray-800">{record.overtime.toFixed(2)}h</td>
                    <td className="py-4 px-4 text-sm text-gray-800">{record.breakTime}h</td>
                    <td className="py-4 px-4">
                      <span className={`inline-flex px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(record.status)}`}>
                        {record.status}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Calendar View */}
      <div className="bg-white rounded-2xl shadow-lg border border-orange-100 p-6">
        <div className="mb-6">
          <h2 className="text-lg font-semibold text-gray-900">Calendar View</h2>
          <p className="text-sm text-blue-600">Monthly attendance calendar</p>
        </div>
        
        <div className="grid grid-cols-7 gap-2">
          {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
            <div key={day} className="text-center py-2 text-sm font-semibold text-gray-500">
              {day}
            </div>
          ))}
          {getCalendarDays().map((day, i) => (
            <div
              key={i}
              className={`aspect-square flex items-center justify-center rounded-lg border text-sm font-semibold transition-colors ${
                day.day === 0 
                  ? "bg-transparent border-transparent" 
                  : day.status 
                    ? getCalendarColor(day.status)
                    : "bg-gray-50 border-gray-200 text-gray-700"
              }`}
            >
              {day.day > 0 && day.day}
            </div>
          ))}
        </div>
        
        {/* Legend */}
        <div className="mt-6 flex flex-wrap gap-4 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 rounded bg-green-200 border-2 border-green-400"></div>
            <span className="text-gray-800 font-medium">Present</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 rounded bg-orange-400 border-2 border-orange-500"></div>
            <span className="text-gray-800 font-medium">Late</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 rounded bg-orange-600 border-2 border-orange-700"></div>
            <span className="text-gray-800 font-medium">Half-day</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 rounded bg-red-600 border-2 border-red-700"></div>
            <span className="text-gray-800 font-medium">Absent</span>
          </div>
        </div>
      </div>

      {/* Correction Requests */}
      {data?.corrections && data.corrections.length > 0 && (
        <div className="bg-white rounded-2xl shadow-lg border border-orange-100 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Correction Requests</h2>
          <div className="space-y-3">
            {data.corrections.map((c) => (
              <div key={c.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                <div>
                  <p className="text-sm font-medium text-gray-900">{c.issue}</p>
                  <p className="text-xs text-gray-500">{c.date} • {new Date(c.createdAt).toLocaleDateString()}</p>
                </div>
                <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                  c.state === "approved" ? "bg-green-100 text-green-700" :
                  c.state === "rejected" ? "bg-red-100 text-red-700" :
                  "bg-yellow-100 text-yellow-700"
                }`}>
                  {c.state}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Remote Work Requests */}
      {remoteRequests.length > 0 && (
        <div className="bg-white rounded-2xl shadow-lg border border-blue-100 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Remote Work Requests</h2>
          <div className="space-y-3">
            {remoteRequests.map((r) => (
              <div key={r.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                <div>
                  <p className="text-sm font-medium text-gray-900">{r.reason}</p>
                  <p className="text-xs text-gray-500">
                    {formatDateDisplay(r.startDate)} → {formatDateDisplay(r.endDate)}
                  </p>
                  {r.approvedBy && (
                    <p className="text-xs text-gray-400 mt-1">Approved by {r.approvedBy}</p>
                  )}
                </div>
                <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                  r.state === "approved" ? "bg-green-100 text-green-700" :
                  r.state === "rejected" ? "bg-red-100 text-red-700" :
                  "bg-yellow-100 text-yellow-700"
                }`}>
                  {r.state}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Correction Modal */}
      {showCorrectionModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[999] flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 my-8">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-gray-900">Request Correction</h3>
              <button onClick={() => setShowCorrectionModal(false)} className="text-gray-400 hover:text-gray-600">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-800 mb-1">Date</label>
                <input
                  type="date"
                  value={correctionForm.date}
                  onChange={(e) => setCorrectionForm({ ...correctionForm, date: e.target.value })}
                  className="w-full px-4 py-2 rounded-xl border border-gray-300 focus:ring-2 focus:ring-orange-400 focus:border-transparent text-gray-900 bg-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-800 mb-1">Issue</label>
                <select
                  value={correctionForm.issue}
                  onChange={(e) => setCorrectionForm({ ...correctionForm, issue: e.target.value })}
                  className="w-full px-4 py-2 rounded-xl border border-gray-300 focus:ring-2 focus:ring-orange-400 focus:border-transparent text-gray-900 bg-white"
                >
                  <option value="">Select an issue</option>
                  <option value="Forgot to check in">Forgot to check in</option>
                  <option value="Forgot to check out">Forgot to check out</option>
                  <option value="Wrong check-in time">Wrong check-in time</option>
                  <option value="Wrong check-out time">Wrong check-out time</option>
                  <option value="Location issue">Location issue</option>
                  <option value="Other">Other</option>
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-800 mb-1">Correct Check-in</label>
                  <input
                    type="time"
                    value={correctionForm.requestedCheckIn}
                    onChange={(e) => setCorrectionForm({ ...correctionForm, requestedCheckIn: e.target.value })}
                    className="w-full px-4 py-2 rounded-xl border border-gray-300 focus:ring-2 focus:ring-orange-400 focus:border-transparent text-gray-900 bg-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-800 mb-1">Correct Check-out</label>
                  <input
                    type="time"
                    value={correctionForm.requestedCheckOut}
                    onChange={(e) => setCorrectionForm({ ...correctionForm, requestedCheckOut: e.target.value })}
                    className="w-full px-4 py-2 rounded-xl border border-gray-300 focus:ring-2 focus:ring-orange-400 focus:border-transparent text-gray-900 bg-white"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-800 mb-1">Additional Notes</label>
                <textarea
                  value={correctionForm.note}
                  onChange={(e) => setCorrectionForm({ ...correctionForm, note: e.target.value })}
                  rows={3}
                  className="w-full px-4 py-2 rounded-xl border border-gray-300 focus:ring-2 focus:ring-orange-400 focus:border-transparent resize-none text-gray-900 bg-white"
                  placeholder="Explain the issue..."
                />
              </div>
            </div>
            
            <div className="mt-6 flex gap-3">
              <button
                onClick={() => setShowCorrectionModal(false)}
                className="flex-1 py-2.5 rounded-xl border border-gray-200 text-gray-700 font-medium hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={submitCorrection}
                disabled={actionLoading || !correctionForm.date || !correctionForm.issue}
                className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-orange-500 to-orange-600 text-white font-medium shadow-lg disabled:opacity-50 transition-all"
              >
                {actionLoading ? "Submitting..." : "Submit Request"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Remote Work Modal */}
      {showRemoteModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[999] flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 my-8">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-gray-900">Request Remote Work</h3>
              <button onClick={() => setShowRemoteModal(false)} className="text-gray-400 hover:text-gray-600">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-800 mb-1">Start Date</label>
                <input
                  type="date"
                  value={remoteForm.startDate}
                  onChange={(e) => setRemoteForm({ ...remoteForm, startDate: e.target.value })}
                  className="w-full px-4 py-2 rounded-xl border border-gray-300 focus:ring-2 focus:ring-blue-400 focus:border-transparent text-gray-900 bg-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-800 mb-1">End Date</label>
                <input
                  type="date"
                  value={remoteForm.endDate}
                  onChange={(e) => setRemoteForm({ ...remoteForm, endDate: e.target.value })}
                  className="w-full px-4 py-2 rounded-xl border border-gray-300 focus:ring-2 focus:ring-blue-400 focus:border-transparent text-gray-900 bg-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-800 mb-1">Reason for Remote Work</label>
                <textarea
                  value={remoteForm.reason}
                  onChange={(e) => setRemoteForm({ ...remoteForm, reason: e.target.value })}
                  rows={4}
                  className="w-full px-4 py-2 rounded-xl border border-gray-300 focus:ring-2 focus:ring-blue-400 focus:border-transparent resize-none text-gray-900 bg-white"
                  placeholder="Explain why you need to work remotely..."
                />
              </div>
            </div>
            
            <div className="mt-6 bg-blue-50 border border-blue-200 rounded-xl p-4">
              <p className="text-xs text-blue-700">
                <strong>Note:</strong> If approved, location verification will be bypassed for the selected dates. You can mark attendance from anywhere.
              </p>
            </div>

            <div className="mt-6 flex gap-3">
              <button
                onClick={() => setShowRemoteModal(false)}
                className="flex-1 py-2.5 rounded-xl border border-gray-200 text-gray-700 font-medium hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={submitRemoteRequest}
                disabled={actionLoading || !remoteForm.startDate || !remoteForm.endDate || !remoteForm.reason}
                className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-blue-500 to-blue-600 text-white font-medium shadow-lg disabled:opacity-50 transition-all"
              >
                {actionLoading ? "Submitting..." : "Submit Request"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
