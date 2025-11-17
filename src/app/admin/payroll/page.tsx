"use client";

import React from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { Download, DollarSign, CheckCircle2, Clock3, CreditCard, ChevronDown } from "lucide-react";

type TabKey = "overview" | "records" | "analytics" | "settings";
type Currency = "USD" | "EUR" | "PKR";

// Simple toast system (no external deps)
function useToasts() {
  const [toasts, setToasts] = React.useState<Array<{ id: number; message: string }>>([]);
  const add = React.useCallback((message: string) => {
    const id = Date.now();
    setToasts((t) => [...t, { id, message }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 2500);
  }, []);
  return { toasts, add };
}

// Mock data
const initialKpis = {
  monthlyPayroll: 2650000,
  processed: 1247,
  pending: 48,
  avgSalary: 82400,
};

const payrollTrend = [
  { month: "Jan", amount: 180000 },
  { month: "Feb", amount: 200000 },
  { month: "Mar", amount: 215000 },
  { month: "Apr", amount: 205000 },
  { month: "May", amount: 230000 },
  { month: "Jun", amount: 245000 },
];

const departmentDistribution = [
  { name: "Engineering", value: 44, color: "#3B82F6" },
  { name: "Sales", value: 29, color: "#22C55E" },
  { name: "Marketing", value: 15, color: "#F59E0B" },
  { name: "HR", value: 7, color: "#A855F7" },
  { name: "Finance", value: 5, color: "#EF4444" },
];

type UIRecord = {
  employee: string;
  department: string;
  base: number; // USD baseline
  bonus: number;
  deductions: number;
  net: number;
  status: "Processed" | "Pending";
  date: string;
  unpaidLeaveDays?: number; // UI-only for preview
  workingDays?: number; // UI-only for preview
  manualAdjustments?: number; // +/-
  overrideNetPay?: number | null;
};

const initialRecords: UIRecord[] = [
  {
    employee: "Sarah Johnson",
    department: "Engineering",
    base: 95000,
    bonus: 5000,
    deductions: 8500,
    net: 91500,
    status: "Processed",
    date: "1/31/2024",
  },
  {
    employee: "Michael Chen",
    department: "Product",
    base: 88000,
    bonus: 3000,
    deductions: 7800,
    net: 83200,
    status: "Processed",
    date: "1/31/2024",
  },
  {
    employee: "Emily Rodriguez",
    department: "Marketing",
    base: 75000,
    bonus: 2500,
    deductions: 6800,
    net: 70700,
    status: "Pending",
    date: "2/1/2024",
  },
];

const costAnalysis = [
  { label: "Total Compensation", value: 2650000 },
  { label: "Benefits & Insurance", value: 318000 },
  { label: "Taxes & Deductions", value: 477000 },
  { label: "Net Payroll", value: 1855000 },
];

const compliance = [
  { label: "Tax Compliance", state: "Compliant" },
  { label: "Labor Law Compliance", state: "Compliant" },
  { label: "Benefits Compliance", state: "Compliant" },
  { label: "Audit Readiness", state: "In Progress" },
];

const currencySymbol: Record<Currency, string> = { USD: "$", EUR: "€", PKR: "Rs" };
// Simple conversion rates from USD -> target (mock, client-side only)
const currencyRate: Record<Currency, number> = { USD: 1, PKR: 280, EUR: 0.92 };
const formatCurrency = (usdAmount: number, c: Currency) =>
  new Intl.NumberFormat(c === "PKR" ? "en-PK" : c === "EUR" ? "de-DE" : "en-US", {
    style: "currency",
    currency: c,
    maximumFractionDigits: 0,
  }).format(usdAmount * currencyRate[c]);
const formatShort = (usdAmount: number, c: Currency) => `${currencySymbol[c]}${Math.round((usdAmount * currencyRate[c]) / 1000)}k`;
const formatCurrencyCompact = (usdAmount: number, c: Currency) =>
  new Intl.NumberFormat(c === "PKR" ? "en-PK" : c === "EUR" ? "de-DE" : "en-US", {
    style: "currency",
    currency: c,
    maximumFractionDigits: 1,
    notation: "compact",
  }).format(usdAmount * currencyRate[c]);

function KPI({ title, value, subtitle, icon, gradient }: { title: string; value: string; subtitle?: string; icon: React.ReactNode; gradient: string }) {
  return (
    <div className={`rounded-xl border shadow-sm p-3 sm:p-4 bg-white ${gradient}`}> 
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-lg bg-white/70 border text-gray-800">{icon}</div>
        <div className="min-w-0">
          <p className="text-xs sm:text-sm text-gray-600 truncate">{title}</p>
          <p className="mt-1 text-lg sm:text-2xl font-semibold text-gray-900 leading-tight break-words">{value}</p>
          {subtitle && <p className="text-[10px] sm:text-xs text-gray-500 mt-0.5 truncate">{subtitle}</p>}
        </div>
      </div>
    </div>
  );
}

function SectionCard({ title, children }: React.PropsWithChildren<{ title: string }>) {
  return (
    <div className="rounded-xl border bg-white shadow-sm">
      <div className="p-3 sm:p-4">
        <h3 className="text-sm sm:text-base font-semibold text-gray-900 mb-3 sm:mb-4">{title}</h3>
        {children}
      </div>
    </div>
  );
}

export default function Page() {
  const [tab, setTab] = React.useState<TabKey>("overview");
  const [currency, setCurrency] = React.useState<Currency>("USD");
  const { toasts, add } = useToasts();
  const [kpi, setKpi] = React.useState(initialKpis);
  const [recs, setRecs] = React.useState<UIRecord[]>(
    initialRecords.map((r) => ({
      ...r,
      unpaidLeaveDays: r.unpaidLeaveDays ?? 0,
      workingDays: r.workingDays ?? 22,
      manualAdjustments: r.manualAdjustments ?? 0,
      overrideNetPay: r.overrideNetPay ?? null,
    }))
  );
  const [editIdx, setEditIdx] = React.useState<number | null>(null);
  const [editDraft, setEditDraft] = React.useState<UIRecord | null>(null);
  const [periodOpen, setPeriodOpen] = React.useState(false);
  const [periodLabel, setPeriodLabel] = React.useState("Current Month");
  const now = new Date();
  const [year, setYear] = React.useState<number>(now.getFullYear());
  const [month, setMonth] = React.useState<number>(now.getMonth() + 1); // 1-12
  const periodStr = React.useMemo(() => `${year}-${String(month).padStart(2, "0")}`, [year, month]);
  const [genLoading, setGenLoading] = React.useState(false);
  const [loadLoading, setLoadLoading] = React.useState(false);
  const handleSaveEdit = (updated: UIRecord) => {
    if (editIdx == null) return;
    setRecs((prev) => prev.map((r, i) => (i === editIdx ? { ...updated } : r)));
    setEditIdx(null);
    setEditDraft(null);
    add("Record updated");
  };

  // Backend hooks (optional; works when API + DB are ready)
  const loadFromBackend = async (period: string) => {
    try {
      setLoadLoading(true);
      const res = await fetch(`/api/payroll?period=${encodeURIComponent(period)}&page=1&pageSize=200`);
      if (!res.ok) throw new Error("Failed to load records");
      const json = await res.json();
      const mapped: UIRecord[] = (json.data || []).map((rec: any) => ({
        employee: rec.employee ? `${rec.employee.firstName} ${rec.employee.lastName}` : `#${rec.employeeId}`,
        department: rec.department || rec.employee?.department || "-",
        base: Number(rec.baseSalary || 0),
        bonus: Number(rec.bonus || 0),
        deductions: Number(rec.deductions || 0),
        net: Number(rec.netPay || 0),
        status: rec.status || "Pending",
        date: rec.payDate ? new Date(rec.payDate).toLocaleDateString() : "-",
        unpaidLeaveDays: 0,
        workingDays: 22,
        manualAdjustments: 0,
        overrideNetPay: null,
      }));
      setRecs(mapped);
      add(`Loaded ${mapped.length} records for ${period}`);
    } catch (e) {
      add("Failed to load from backend");
      console.error(e);
    } finally {
      setLoadLoading(false);
    }
  };

  const generateRun = async () => {
    try {
      setGenLoading(true);
      const res = await fetch(`/api/payroll?year=${year}&month=${month}`, { method: "POST" });
      if (!res.ok) throw new Error("Failed to generate run");
      add("Payroll run generated");
      await loadFromBackend(periodStr);
      setPeriodLabel("Current Month");
    } catch (e) {
      add("Failed to generate run");
      console.error(e);
    } finally {
      setGenLoading(false);
    }
  };

  // Period filtering: determine newest month present, then filter accordingly
  const displayedRecs = React.useMemo(() => {
    if (recs.length === 0) return [] as UIRecord[];
    const parse = (d: string) => new Date(d);
    const today = new Date();
    const curY = today.getFullYear();
    const curM = today.getMonth(); // 0-11
    const lastY = curM === 0 ? curY - 1 : curY;
    const lastM = curM === 0 ? 11 : curM - 1;
    if (periodLabel === "All Records") return recs;
    if (periodLabel === "Last Month") {
      return recs.filter((r) => {
        const d = parse(r.date);
        return d.getFullYear() === lastY && d.getMonth() === lastM;
      });
    }
    // Current Month (relative to today)
    return recs.filter((r) => {
      const d = parse(r.date);
      return d.getFullYear() === curY && d.getMonth() === curM;
    });
  }, [recs, periodLabel]);

  const onProcess = () => {
    add("Processing payroll...");
    setTimeout(() => {
      // mark pending records as processed and update KPIs
      setRecs((prev) => prev.map((r) => (r.status === "Pending" ? { ...r, status: "Processed" } : r)));
      setKpi((prev) => ({ ...prev, processed: prev.processed + prev.pending, pending: 0 }));
      add("Payroll processed successfully (mock)");
    }, 900);
  };

  // helpers for leave-based deduction + net
  const computeLeaveDeduction = (baseUSD: number, unpaidDays = 0, workingDays = 22) => {
    const wd = Math.max(1, Number(workingDays || 22));
    const ud = Math.max(0, Number(unpaidDays || 0));
    const daily = baseUSD / wd;
    return daily * ud;
  };
  const computeNet = (r: UIRecord) => {
    const leaveDed = computeLeaveDeduction(r.base, r.unpaidLeaveDays, r.workingDays);
    const computed = r.base + (r.bonus || 0) - (r.deductions || 0) - leaveDed + (r.manualAdjustments || 0);
    return r.overrideNetPay != null && !isNaN(r.overrideNetPay) ? r.overrideNetPay : computed;
  };

  const onExport = () => {
    // Build CSV from current records
    const rows = [
      ["Employee", "Department", "Base Salary", "Bonus", "Deductions", "Net Pay", "Status", "Pay Date"],
      ...recs.map((r) => [
        r.employee,
        r.department,
        formatCurrency(r.base, currency),
        formatCurrency(r.bonus, currency),
        formatCurrency(r.deductions, currency),
        formatCurrency(r.net, currency),
        r.status,
        r.date,
      ]),
    ];
    const csv = rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `payroll-records-${new Date().toISOString().slice(0,10)}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    add("CSV exported");
  };

  return (
    <div className="min-h-screen w-full overflow-x-hidden bg-gray-50">
      {/* Toasts */}
      <div className="fixed top-3 right-3 z-50 space-y-2">
        {toasts.map((t) => (
          <div key={t.id} className="px-3 py-2 rounded-md shadow-md bg-gray-900 text-white text-xs sm:text-sm">{t.message}</div>
        ))}
      </div>

      <div className="mx-auto w-full max-w-7xl p-2 sm:p-4 lg:p-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 sm:gap-4">
          <div className="min-w-0">
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-semibold text-gray-900 truncate">Payroll Management</h1>
            <p className="mt-1 sm:mt-2 text-xs sm:text-sm text-gray-600">Manage employee compensation and payroll processing</p>
          </div>
          <div className="flex flex-wrap gap-1.5 sm:gap-2">
            <button onClick={onExport} className="h-8 sm:h-9 px-3 rounded-md text-xs sm:text-sm font-medium border border-gray-300 bg-white hover:bg-gray-50 text-gray-800 flex items-center gap-2 shadow-sm hover:shadow">
              <Download className="w-4 h-4" />
              <span>Export Report</span>
            </button>
            <button onClick={onProcess} className="h-8 sm:h-9 px-3 rounded-md text-xs sm:text-sm font-medium bg-blue-600 text-white hover:bg-blue-700 focus:ring-2 focus:ring-blue-400/50 flex items-center gap-2 shadow-sm hover:shadow">
              <CreditCard className="w-4 h-4" />
              <span>Process Payroll</span>
            </button>
          </div>
        </div>

        {/* KPIs */}
        <div className="mt-3 sm:mt-4 grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3 lg:gap-4">
          <KPI
            title="Monthly Payroll"
            value={formatCurrencyCompact(kpi.monthlyPayroll, currency)}
            subtitle="↗ +2.3% from last month"
            icon={<DollarSign className="w-4 h-4" />}
            gradient="hover:shadow-md transition-shadow"
          />
          <KPI
            title="Processed"
            value={kpi.processed.toLocaleString()}
            subtitle="96.3% completion rate"
            icon={<CheckCircle2 className="w-4 h-4 text-green-600" />}
            gradient="hover:shadow-md transition-shadow"
          />
          <KPI
            title="Pending"
            value={String(kpi.pending)}
            subtitle="Awaiting approval"
            icon={<Clock3 className="w-4 h-4 text-orange-600" />}
            gradient="hover:shadow-md transition-shadow"
          />
          <KPI
            title="Avg. Salary"
            value={`${currencySymbol[currency]}${(kpi.avgSalary / 1000).toFixed(1)}K`}
            subtitle="Annual average"
            icon={<CreditCard className="w-4 h-4 text-purple-600" />}
            gradient="hover:shadow-md transition-shadow"
          />
        </div>

        {/* Tabs */}
        <div className="mt-3 sm:mt-4">
          <div className="inline-flex rounded-full border bg-white p-1 shadow-sm">
            {([
              ["overview", "Overview"],
              ["records", "Payroll Records"],
              ["analytics", "Analytics"],
              ["settings", "Settings"],
            ] as [TabKey, string][]).map(([k, label]) => (
              <button
                key={k}
                onClick={() => setTab(k)}
                className={`px-3 sm:px-4 py-1.5 text-xs sm:text-sm rounded-full ${
                  tab === k ? "bg-blue-600 text-white shadow" : "text-gray-700 hover:bg-gray-50"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Overview */}
        {tab === "overview" && (
          <div className="mt-4 grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4">
            <SectionCard title="Payroll Trend">
              <div className="h-64 sm:h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={payrollTrend}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis dataKey="month" stroke="#6b7280" tick={{ fontSize: 12 }} />
                    <YAxis stroke="#6b7280" tick={{ fontSize: 12 }} tickFormatter={(v) => formatShort(v as number, currency)} />
                    <Tooltip contentStyle={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 8 }} formatter={(v: any) => formatCurrency(v as number, currency)} />
                    <Line type="monotone" dataKey="amount" stroke="#2563eb" strokeWidth={2} dot={{ r: 3 }} activeDot={{ r: 5 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </SectionCard>

            <SectionCard title="Department Distribution">
              <div className="h-64 sm:h-72 flex items-center justify-center">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={departmentDistribution} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} label>
                      {departmentDistribution.map((d) => (
                        <Cell key={d.name} fill={d.color} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 8 }} formatter={(v: any) => `${v}%`} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                {departmentDistribution.map((d) => (
                  <span key={d.name} className="inline-flex items-center gap-2 rounded-full border px-2.5 py-1 text-xs">
                    <span className="h-2.5 w-2.5 rounded-full" style={{ background: d.color }} />
                    <span className="text-gray-800">{d.name}</span>
                    <span className="text-gray-500">{d.value}%</span>
                  </span>
                ))}
              </div>
            </SectionCard>

            <div className="lg:col-span-2">
              <SectionCard title="Processing Status">
                <div className="space-y-4">
                  <div>
                    <p className="text-xs text-gray-600 mb-2">Overall Progress</p>
                    <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                      <div className="h-2 bg-gradient-to-r from-blue-500 to-indigo-600" style={{ width: "96.3%" }} />
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    <div className="rounded-lg border p-3 text-center bg-white hover:shadow-sm">
                      <p className="text-green-600 text-sm font-medium">Completed</p>
                      <p className="mt-1 text-lg sm:text-2xl font-semibold text-gray-900">1,247</p>
                    </div>
                    <div className="rounded-lg border p-3 text-center bg-white hover:shadow-sm">
                      <p className="text-orange-600 text-sm font-medium">In Progress</p>
                      <p className="mt-1 text-lg sm:text-2xl font-semibold text-gray-900">48</p>
                    </div>
                    <div className="rounded-lg border p-3 text-center bg-white hover:shadow-sm">
                      <p className="text-red-600 text-sm font-medium">Failed</p>
                      <p className="mt-1 text-lg sm:text-2xl font-semibold text-gray-900">0</p>
                    </div>
                  </div>
                </div>
              </SectionCard>
            </div>
          </div>
        )}

        {/* Records */}
        {tab === "records" && (
          <div className="mt-4">
            <SectionCard title="Payroll Records">
              <div className="relative flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-3">
                <div className="flex items-center gap-2">
                  <input type="number" className="h-9 w-24 rounded-md border px-3 text-sm text-gray-900" value={year} onChange={(e) => setYear(Number(e.target.value))} />
                  <select className="h-9 w-28 rounded-md border px-2 text-sm text-gray-900" value={month} onChange={(e) => setMonth(Number(e.target.value))}>
                    {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                      <option key={m} value={m}>{String(m).padStart(2, '0')}</option>
                    ))}
                  </select>
                  <button onClick={generateRun} disabled={genLoading} className={`h-9 px-3 rounded-md text-sm text-white ${genLoading ? 'bg-green-400' : 'bg-green-600 hover:bg-green-700'}`}>
                    {genLoading ? 'Generating…' : 'Generate Run'}
                  </button>
                  <button onClick={() => loadFromBackend(periodStr)} disabled={loadLoading} className={`h-9 px-3 rounded-md border text-sm ${loadLoading ? 'bg-gray-100 text-gray-500' : 'bg-white hover:bg-gray-50 text-gray-800'}`}>
                    {loadLoading ? 'Loading…' : 'Load Records'}
                  </button>
                </div>
                <button onClick={() => setPeriodOpen((v) => !v)} className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-blue-200 text-blue-700 rounded-md text-xs sm:text-sm bg-blue-50 hover:bg-blue-100 cursor-pointer shadow-sm">
                  {periodLabel} <ChevronDown className="w-4 h-4" />
                </button>
                {periodOpen && (
                  <div className="absolute z-30 mt-10 right-0 w-48 rounded-md border bg-white shadow-xl">
                    {[
                      "Current Month",
                      "Last Month",
                      "All Records",
                    ].map((opt) => (
                      <button
                        key={opt}
                        onClick={() => {
                          setPeriodLabel(opt);
                          setPeriodOpen(false);
                        }}
                        className="w-full text-left px-3 py-2 text-sm text-gray-800 hover:bg-blue-50 hover:text-blue-700"
                      >
                        {opt}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full text-xs sm:text-sm divide-y divide-gray-200">
                  <thead className="bg-gray-50 text-gray-600 sticky top-0 z-10">
                    <tr>
                      <th className="px-3 py-2 text-left font-medium">Employee</th>
                      <th className="px-3 py-2 text-left font-medium">Department</th>
                      <th className="px-3 py-2 text-left font-medium">Base Salary</th>
                      <th className="px-3 py-2 text-left font-medium">Bonus</th>
                      <th className="px-3 py-2 text-left font-medium">Deductions</th>
                      <th className="px-3 py-2 text-left font-medium">Net Pay</th>
                      <th className="px-3 py-2 text-left font-medium">Status</th>
                      <th className="px-3 py-2 text-left font-medium">Pay Date</th>
                      <th className="px-3 py-2 text-left font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-100">
                    {displayedRecs.map((r, i) => (
                      <tr key={i} className="hover:bg-gray-50 odd:bg-gray-50/40">
                        <td className="px-3 py-2 text-gray-900">{r.employee}</td>
                        <td className="px-3 py-2 text-gray-700">{r.department}</td>
                        <td className="px-3 py-2 text-gray-900">{formatCurrency(r.base, currency)}</td>
                        <td className="px-3 py-2 text-gray-900">{formatCurrency(r.bonus, currency)}</td>
                        <td className="px-3 py-2 text-gray-900">{formatCurrency(r.deductions, currency)}</td>
                        <td className="px-3 py-2 font-medium text-gray-900">{formatCurrency(computeNet(r), currency)}</td>
                        <td className="px-3 py-2">
                          <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] sm:text-xs font-medium ${
                            r.status === "Processed" ? "bg-green-100 text-green-800" : "bg-orange-100 text-orange-800"
                          }`}>
                            <span className={`h-1.5 w-1.5 rounded-full ${r.status === "Processed" ? "bg-green-600" : "bg-orange-600"}`} />
                            {r.status}
                          </span>
                        </td>
                        <td className="px-3 py-2 text-gray-700">{r.date}</td>
                        <td className="px-3 py-2">
                          <button
                            className="inline-flex items-center px-2.5 py-1.5 border border-blue-200 text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-md text-xs cursor-pointer shadow-sm"
                            onClick={() => { setEditIdx(i); setEditDraft({ ...r }); }}
                          >
                            Edit
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </SectionCard>
          </div>
        )}

        {/* Analytics */}
        {tab === "analytics" && (
          <div className="mt-4 grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4">
            <SectionCard title="Cost Analysis">
              <div className="space-y-2">
                {costAnalysis.map((c) => (
                  <div key={c.label} className="flex items-center justify-between rounded-lg border px-3 py-2 bg-white">
                    <span className="text-sm text-gray-800">{c.label}</span>
                    <span className="text-sm sm:text-base font-semibold text-gray-900">{formatCurrency(c.value, currency)}</span>
                  </div>
                ))}
              </div>
            </SectionCard>

            <SectionCard title="Compliance Status">
              <div className="space-y-2">
                {compliance.map((c) => (
                  <div key={c.label} className="flex items-center justify-between rounded-lg border px-3 py-2 bg-white">
                    <span className="text-sm text-gray-700">{c.label}</span>
                    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] sm:text-xs font-medium ${
                      c.state === "Compliant" ? "bg-green-100 text-green-800" : "bg-orange-100 text-orange-800"
                    }`}>{c.state}</span>
                  </div>
                ))}
              </div>
            </SectionCard>
          </div>
        )}

        {/* Settings */}
        {tab === "settings" && (
          <div className="mt-4">
            <SectionCard title="Payroll Settings">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <div>
                  <label className="block text-xs sm:text-sm text-gray-800 mb-1">Pay Period</label>
                  <select className="w-full h-9 px-3 rounded-md border bg-white text-sm text-gray-900">
                    <option>Monthly</option>
                    <option>Bi-weekly</option>
                    <option>Weekly</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs sm:text-sm text-gray-800 mb-1">Default Pay Date</label>
                  <input type="text" defaultValue="01/31/2024" className="w-full h-9 px-3 rounded-md border bg-white text-sm text-gray-900 placeholder:text-gray-500" />
                </div>
                <div>
                  <label className="block text-xs sm:text-sm text-gray-800 mb-1">Default Tax Rate (%)</label>
                  <input type="number" defaultValue={18} className="w-full h-9 px-3 rounded-md border bg-white text-sm text-gray-900 placeholder:text-gray-500" />
                </div>
                <div>
                  <label className="block text-xs sm:text-sm text-gray-800 mb-1">Currency</label>
                  <select
                    className="w-full h-9 px-3 rounded-md border bg-white text-sm text-gray-900"
                    value={currency}
                    onChange={(e) => setCurrency(e.target.value as Currency)}
                  >
                    <option value="USD">USD ($)</option>
                    <option value="PKR">PKR (Rs)</option>
                    <option value="EUR">EUR (€)</option>
                  </select>
                </div>
              </div>
              <div className="mt-4">
                <button
                  onClick={() => {
                    add(`Settings saved. Displaying all values in ${currency}.`);
                  }}
                  className="px-4 py-2 rounded-md bg-blue-600 text-white text-sm hover:bg-blue-700"
                >
                  Save Settings
                </button>
              </div>
            </SectionCard>
          </div>
        )}
      </div>
      {/* Edit Modal Mount */}
      <EditModal
        open={editIdx !== null}
        record={editDraft}
        onClose={() => {
          setEditIdx(null);
          setEditDraft(null);
        }}
        onSave={handleSaveEdit}
        currency={currency}
        formatCurrency={formatCurrency}
        computeNet={computeNet}
        computeLeaveDeduction={computeLeaveDeduction}
      />
    </div>
  );
}

// Edit Modal
function EditModal({ open, record, onClose, onSave, currency, formatCurrency, computeNet, computeLeaveDeduction }: {
  open: boolean;
  record: UIRecord | null;
  onClose: () => void;
  onSave: (rec: UIRecord) => void;
  currency: Currency;
  formatCurrency: (n: number, c: Currency) => string;
  computeNet: (r: UIRecord) => number;
  computeLeaveDeduction: (base: number, unpaid?: number, wd?: number) => number;
}) {
  const [draft, setDraft] = React.useState<UIRecord | null>(null);
  React.useEffect(() => {
    setDraft(record ? { ...record } : null);
  }, [record, open]);
  if (!open || !draft) return null;
  const r = draft;
  const leaveDed = computeLeaveDeduction(r.base, r.unpaidLeaveDays, r.workingDays);
  const previewNet = computeNet(r);
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      <div className="relative z-10 w-full max-w-2xl rounded-t-xl sm:rounded-xl bg-white border shadow-lg p-4 sm:p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between">
          <h3 className="text-base sm:text-lg font-semibold text-gray-900">Edit Payroll – {r.employee}</h3>
          <button onClick={onClose} className="rounded-md p-1 hover:bg-gray-100">✕</button>
        </div>
        <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
          <LabeledNumber label="Base Salary" value={r.base} onChange={(v) => setDraft({ ...r, base: v })} />
          <LabeledNumber label="Bonus" value={r.bonus} onChange={(v) => setDraft({ ...r, bonus: v })} />
          <LabeledNumber label="Other Deductions" value={r.deductions} onChange={(v) => setDraft({ ...r, deductions: v })} />
          <LabeledNumber label="Manual Adjustments (+/-)" value={r.manualAdjustments || 0} onChange={(v) => setDraft({ ...r, manualAdjustments: v })} />
          <LabeledNumber label="Unpaid Leave Days" value={r.unpaidLeaveDays || 0} onChange={(v) => setDraft({ ...r, unpaidLeaveDays: v })} />
          <LabeledNumber label="Working Days (period)" value={r.workingDays || 22} onChange={(v) => setDraft({ ...r, workingDays: v })} />
          <LabeledNumber label="Override Net Pay (optional)" value={r.overrideNetPay ?? NaN} allowEmpty onChange={(v) => setDraft({ ...r, overrideNetPay: isNaN(v) ? null : v })} />
        </div>
        <div className="mt-4 rounded-lg border bg-gray-50 p-3 text-sm">
          <div className="flex flex-wrap gap-4">
            <div>
              <p className="text-gray-600">Leave Deduction</p>
              <p className="font-semibold text-gray-900">{formatCurrency(leaveDed, currency)}</p>
            </div>
            <div>
              <p className="text-gray-600">Preview Net Pay</p>
              <p className="font-semibold text-gray-900">{formatCurrency(previewNet, currency)}</p>
            </div>
          </div>
        </div>
        <div className="mt-6 flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
          <button onClick={onClose} className="h-9 px-3 rounded-md border border-red-200 bg-red-50 text-red-700 hover:bg-red-100">Cancel</button>
          <button onClick={() => draft && onSave({ ...draft, net: previewNet })} className="h-9 px-3 rounded-md bg-blue-600 text-white hover:bg-blue-700">Save</button>
        </div>
      </div>
    </div>
  );
}

function LabeledNumber({ label, value, onChange, allowEmpty = false }: { label: string; value: number; onChange: (v: number) => void; allowEmpty?: boolean }) {
  const display = isNaN(value) ? "" : String(value);
  return (
    <label className="block">
      <span className="block text-xs sm:text-sm text-gray-800 mb-1">{label}</span>
      <input
        type="number"
        value={display}
        onChange={(e) => {
          const v = e.target.value;
          if (allowEmpty && v === "") onChange(NaN);
          else onChange(Number(v));
        }}
        className="w-full h-9 px-3 rounded-md border bg-white text-sm text-gray-900"
      />
    </label>
  );
}
