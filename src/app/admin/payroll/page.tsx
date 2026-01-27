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
  BarChart,
  Bar,
  Legend,
  AreaChart,
  Area,
} from "recharts";
import { Download, DollarSign, CheckCircle2, Clock3, CreditCard, ChevronDown, ShieldCheck, Sparkles, Undo2, Globe2 } from "lucide-react";

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
  monthlyPayroll: 0,
  processed: 0,
  pending: 0,
  avgSalary: 0,
};

type UIRecord = {
  id?: number;
  employee: string;
  department: string;
  base: number; // Base salary
  bonus: number;
  deductions: number;
  net: number;
  status: "Processed" | "Pending" | "Failed";
  date: string;
  unpaidLeaveDays?: number;
  paidLeaveDays?: number;
  absentDays?: number;
  taxAmount?: number;
  workingDays?: number;
  manualAdjustments?: number;
  overrideNetPay?: number | null;
  periodYear?: number;
  periodMonth?: number;
  overtimeHours?: number;
  chargeableLeave?: number;
};

const integrationStatuses = [
  { label: "Attendance Sync", state: "Live", detail: "Overtime + absences auto-applied" },
  { label: "Leave Sync", state: "Live", detail: "Paid/unpaid leave reflected" },
];

const auditLogSeed: { at: string; actor: string; action: string; scope: string }[] = [];

const currencySymbol: Record<Currency, string> = { USD: "$", EUR: "€", PKR: "Rs " };
// Rates set to 1 so values display exactly as stored (no auto-conversion)
const currencyRate: Record<Currency, number> = { USD: 1, PKR: 1, EUR: 1 };

// Simple formatting to avoid hydration mismatches
const formatCurrency = (usdAmount: number, c: Currency) => {
  const val = Math.round(usdAmount * currencyRate[c]);
  return `${currencySymbol[c]}${val.toLocaleString()}`;
};
const formatShort = (usdAmount: number, c: Currency) => {
  const val = Math.round((usdAmount * currencyRate[c]) / 1000);
  return `${currencySymbol[c]}${val}k`;
};
const formatCurrencyCompact = (usdAmount: number, c: Currency) => {
  const val = usdAmount * currencyRate[c];
  if (val >= 1000000) return `${currencySymbol[c]}${(val / 1000000).toFixed(1)}M`;
  if (val >= 1000) return `${currencySymbol[c]}${(val / 1000).toFixed(1)}K`;
  return `${currencySymbol[c]}${Math.round(val)}`;
};

function KPI({ title, value, subtitle, icon, gradient }: { title: string; value: string; subtitle?: string; icon: React.ReactNode; gradient: string }) {
  return (
    <div className={`rounded-2xl border border-white/60 bg-white/70 backdrop-blur shadow-lg p-3 sm:p-4 ${gradient}`}>
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-lg bg-white/90 border border-white/60 text-gray-800 shadow-sm">{icon}</div>
        <div className="min-w-0">
          <p className="text-xs sm:text-sm text-gray-700 truncate">{title}</p>
          <p className="mt-1 text-lg sm:text-2xl font-semibold text-gray-900 leading-tight break-words">{value}</p>
          {subtitle && <p className="text-[10px] sm:text-xs text-gray-500 mt-0.5 truncate">{subtitle}</p>}
        </div>
      </div>
    </div>
  );
}

function SectionCard({ title, children }: React.PropsWithChildren<{ title: string }>) {
  return (
    <div className="rounded-2xl border border-white/60 bg-white/75 backdrop-blur shadow-xl shadow-slate-200/40">
      <div className="p-3 sm:p-4">
        <h3 className="text-sm sm:text-base font-semibold text-gray-900 mb-3 sm:mb-4">{title}</h3>
        {children}
      </div>
    </div>
  );
}

export default function Page() {
  const [tab, setTab] = React.useState<TabKey>("overview");
  const [currency, setCurrency] = React.useState<Currency>("PKR");
  const { toasts, add } = useToasts();
  const [kpi, setKpi] = React.useState(initialKpis);
  const [recs, setRecs] = React.useState<UIRecord[]>([]);
  const [editIdx, setEditIdx] = React.useState<number | null>(null);
  const [editDraft, setEditDraft] = React.useState<UIRecord | null>(null);
  const [periodOpen, setPeriodOpen] = React.useState(false);
  const [periodLabel, setPeriodLabel] = React.useState("Current Month");
  const [payrollFrozen, setPayrollFrozen] = React.useState(false);
  const [rollbackAvailable, setRollbackAvailable] = React.useState(true);
  const [autoSyncEnabled, setAutoSyncEnabled] = React.useState(true);
  const [aiRulesEnabled, setAiRulesEnabled] = React.useState(true);
  const [auditLog, setAuditLog] = React.useState(auditLogSeed);
  const now = new Date();
  const [year, setYear] = React.useState<number>(now.getFullYear());
  const [month, setMonth] = React.useState<number>(now.getMonth() + 1); // 1-12
  const periodStr = React.useMemo(() => `${year}-${String(month).padStart(2, "0")}`, [year, month]);
  const [genLoading, setGenLoading] = React.useState(false);
  const [loadLoading, setLoadLoading] = React.useState(false);
  const [taxRate, setTaxRate] = React.useState(() => {
    // Load tax rate from localStorage on init
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem("payroll_settings");
        if (saved) {
          const parsed = JSON.parse(saved);
          return parsed.taxRate ?? 0;
        }
      } catch (e) {}
    }
    return 0;
  });
  const computeLeaveDeduction = (baseUSD: number, unpaidDays = 0, workingDays = 22) => {
    const wd = Math.max(1, Number(workingDays || 22));
    const ud = Math.max(0, Number(unpaidDays || 0));
    const daily = baseUSD / wd;
    return daily * ud;
  };
  const computeNet = (r: UIRecord) => {
    const leaveDed = autoSyncEnabled ? computeLeaveDeduction(r.base, r.unpaidLeaveDays, r.workingDays) : 0;
    const computed = r.base + (r.bonus || 0) - (r.deductions || 0) - leaveDed + (r.manualAdjustments || 0);
    return r.overrideNetPay != null && !isNaN(r.overrideNetPay) ? r.overrideNetPay : computed;
  };
  const appendAudit = React.useCallback((action: string, scope: string) => {
    setAuditLog((prev) => [{ at: new Date().toLocaleString(), actor: "System", action, scope }, ...prev].slice(0, 12));
  }, []);
  // Auto-load payroll on mount and when period changes; auto-generate if empty
  const autoLoadAndGenerate = React.useCallback(async () => {
    try {
      setLoadLoading(true);
      console.log("Loading payroll for period:", periodStr, "year:", year, "month:", month);
      const res = await fetch(`/api/payroll?period=${encodeURIComponent(periodStr)}&page=1&pageSize=200`);
      if (!res.ok) throw new Error("Failed to load records");
      const json = await res.json();
      console.log("API Response:", json);
      const data = json.data || [];
      console.log("Records count:", data.length);
      
      // If no records found, auto-generate
      if (data.length === 0) {
        add("No payroll records found. Auto-generating...");
        console.log("Auto-generating payroll for year:", year, "month:", month, "taxRate:", taxRate);
        const genRes = await fetch(`/api/payroll?year=${year}&month=${month}&taxRate=${taxRate}`, { method: "POST" });
        const genJson = await genRes.json().catch(() => ({}));
        console.log("Generation response:", genRes.status, genJson);
        if (genRes.ok) {
          add("Payroll generated successfully");
          // Reload after generation
          const reloadRes = await fetch(`/api/payroll?period=${encodeURIComponent(periodStr)}&page=1&pageSize=200`);
          if (reloadRes.ok) {
            const reloadJson = await reloadRes.json();
            console.log("Reload response after generation:", reloadJson);
            const reloadData = reloadJson.data || [];
            const mapped: UIRecord[] = reloadData.map((rec: any) => {
              // Calculate next month 4th as pay date
              const nextMonth = month === 12 ? 1 : month + 1;
              const nextYear = month === 12 ? year + 1 : year;
              const defaultPayDate = `${nextMonth.toString().padStart(2, "0")}/04/${nextYear}`;
              
              return {
                id: rec.id,
                employee: rec.employee ? `${rec.employee.firstName} ${rec.employee.lastName}` : rec.employeeName || `#${rec.employeeId || rec.id}`,
                department: rec.department || rec.employee?.department || "-",
                base: Number(rec.baseSalary ?? rec.salary ?? rec.base ?? 0),
                bonus: Number(rec.bonus ?? rec.bonuses ?? 0),
                deductions: Number(rec.deductions ?? 0),
                net: Number(rec.netPay ?? rec.netSalary ?? 0),
                status: rec.status || "Pending",
                date: rec.payDate ? new Date(rec.payDate).toLocaleDateString() : defaultPayDate,
                unpaidLeaveDays: rec.unpaidLeaveDays || 0,
                paidLeaveDays: rec.paidLeaveDays || 0,
                absentDays: rec.absentDays || 0,
                chargeableLeave: rec.chargeableLeave || 0,
                workingDays: rec.workingDays || 22,
                manualAdjustments: 0,
                overrideNetPay: null,
                periodYear: rec.periodYear ?? rec.run?.periodYear,
                periodMonth: rec.periodMonth ?? rec.run?.periodMonth,
                overtimeHours: rec.overtimeHours ?? 0,
              };
            });
            setRecs(mapped);
            const totalNet = mapped.reduce((s, r) => s + computeNet(r), 0);
            const processed = mapped.filter((r) => r.status === "Processed").length;
            const pending = mapped.filter((r) => r.status !== "Processed").length;
            const avgSalary = mapped.length ? mapped.reduce((s, r) => s + r.base, 0) / mapped.length : 0;
            setKpi({ monthlyPayroll: totalNet, processed, pending, avgSalary });
            add(`Loaded ${mapped.length} records for ${periodStr}`);
          }
        } else {
          const errData = await genRes.json().catch(() => ({}));
          add(errData.error || "Failed to auto-generate payroll");
        }
      } else {
        // Records exist, just load them
        const mapped: UIRecord[] = data.map((rec: any) => {
          // Calculate next month 4th as pay date
          const recMonth = rec.periodMonth ?? (new Date().getMonth() + 1);
          const recYear = rec.periodYear ?? new Date().getFullYear();
          const nextMonth = recMonth === 12 ? 1 : recMonth + 1;
          const nextYear = recMonth === 12 ? recYear + 1 : recYear;
          const defaultPayDate = `${nextMonth.toString().padStart(2, "0")}/04/${nextYear}`;
          
          return {
            id: rec.id,
            employee: rec.employee ? `${rec.employee.firstName} ${rec.employee.lastName}` : rec.employeeName || `#${rec.employeeId || rec.id}`,
            department: rec.department || rec.employee?.department || "-",
            base: Number(rec.baseSalary ?? rec.salary ?? rec.base ?? 0),
            bonus: Number(rec.bonus ?? rec.bonuses ?? 0),
            deductions: Number(rec.deductions ?? 0),
            net: Number(rec.netPay ?? rec.netSalary ?? 0),
            status: rec.status || "Pending",
            date: rec.payDate ? new Date(rec.payDate).toLocaleDateString() : defaultPayDate,
            unpaidLeaveDays: rec.unpaidLeaveDays || 0,
            paidLeaveDays: rec.paidLeaveDays || 0,
            absentDays: rec.absentDays || 0,
            chargeableLeave: rec.chargeableLeave || 0,
            workingDays: rec.workingDays || 22,
            manualAdjustments: 0,
            overrideNetPay: null,
            periodYear: rec.periodYear ?? rec.run?.periodYear,
            periodMonth: rec.periodMonth ?? rec.run?.periodMonth,
            overtimeHours: rec.overtimeHours ?? 0,
          };
        });
        setRecs(mapped);
        const totalNet = mapped.reduce((s, r) => s + computeNet(r), 0);
        const processed = mapped.filter((r) => r.status === "Processed").length;
        const pending = mapped.filter((r) => r.status !== "Processed").length;
        const avgSalary = mapped.length ? mapped.reduce((s, r) => s + r.base, 0) / mapped.length : 0;
        setKpi({ monthlyPayroll: totalNet, processed, pending, avgSalary });
        add(`Loaded ${mapped.length} records for ${periodStr}`);
      }
    } catch (e) {
      console.error(e);
      add("Failed to load payroll data");
    } finally {
      setLoadLoading(false);
    }
  }, [periodStr, year, month, taxRate]);

  // Auto-load on mount
  React.useEffect(() => {
    autoLoadAndGenerate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  
  // Auto-load when tab changes to records or when period changes
  React.useEffect(() => {
    if (tab === "records" || tab === "overview" || tab === "analytics") {
      autoLoadAndGenerate();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, periodStr]);
  
  const aiInsights = React.useMemo(() => {
    if (!aiRulesEnabled) return [] as string[];
    const insights: string[] = [];
    const avgNet = recs.length ? recs.reduce((s, r) => s + computeNet(r), 0) / recs.length : 0;
    const overtimeTotal = recs.reduce((s, r) => s + (r.overtimeHours || 0), 0);
    if (overtimeTotal > 150) insights.push("Overtime hours spiked this month → consider bonus or comp time for heavy teams.");
    if (kpi.pending > 30) insights.push("Pending approvals elevated → freeze new runs until managers clear queue.");
    if (avgNet > 90000) insights.push("Net pay trending high → review deductions and benefit caps for top earners.");
    return insights;
  }, [aiRulesEnabled, recs, kpi.pending, autoSyncEnabled]);
  const handleSaveEdit = (updated: UIRecord) => {
    if (editIdx == null) return;
    setRecs((prev) => prev.map((r, i) => (i === editIdx ? { ...updated } : r)));
    setEditIdx(null);
    setEditDraft(null);
    add("Record updated");
  };

  React.useEffect(() => {
    if (recs.length === 0) return;
    const totalNet = recs.reduce((s, r) => s + computeNet(r), 0);
    const processed = recs.filter((r) => r.status === "Processed").length;
    const pending = recs.filter((r) => r.status !== "Processed").length;
    const avgSalary = recs.length ? recs.reduce((s, r) => s + r.base, 0) / recs.length : 0;
    setKpi({ monthlyPayroll: totalNet, processed, pending, avgSalary });
  }, [recs]);

  // Backend hooks (optional; works when API + DB are ready)
  const loadFromBackend = async (period: string) => {
    try {
      setLoadLoading(true);
      const res = await fetch(`/api/payroll?period=${encodeURIComponent(period)}&page=1&pageSize=200`);
      if (!res.ok) throw new Error("Failed to load records");
      const json = await res.json();
      const mapped: UIRecord[] = (json.data || []).map((rec: any) => {
        // Calculate next month 4th as pay date
        const recMonth = rec.periodMonth ?? (new Date().getMonth() + 1);
        const recYear = rec.periodYear ?? new Date().getFullYear();
        const nextMonth = recMonth === 12 ? 1 : recMonth + 1;
        const nextYear = recMonth === 12 ? recYear + 1 : recYear;
        const defaultPayDate = `${nextMonth.toString().padStart(2, "0")}/04/${nextYear}`;
        
        return {
          id: rec.id,
          employee: rec.employee ? `${rec.employee.firstName} ${rec.employee.lastName}` : rec.employeeName || `#${rec.employeeId || rec.id}`,
          department: rec.department || rec.employee?.department || "-",
          base: Number(rec.baseSalary ?? rec.salary ?? rec.base ?? 0),
          bonus: Number(rec.bonus ?? rec.bonuses ?? 0),
          deductions: Number(rec.deductions ?? 0),
          net: Number(rec.netPay ?? rec.netSalary ?? 0),
          status: rec.status || "Pending",
          date: rec.payDate ? new Date(rec.payDate).toLocaleDateString() : defaultPayDate,
          unpaidLeaveDays: rec.unpaidLeaveDays || 0,
          paidLeaveDays: rec.paidLeaveDays || 0,
          absentDays: rec.absentDays || 0,
          chargeableLeave: rec.chargeableLeave || 0,
          workingDays: rec.workingDays || 22,
          manualAdjustments: 0,
          overrideNetPay: null,
          periodYear: rec.periodYear ?? rec.run?.periodYear,
          periodMonth: rec.periodMonth ?? rec.run?.periodMonth,
          overtimeHours: rec.overtimeHours ?? 0,
        };
      });
      setRecs(mapped);
      const totalNet = mapped.reduce((s, r) => s + computeNet(r), 0);
      const processed = mapped.filter((r) => r.status === "Processed").length;
      const pending = mapped.filter((r) => r.status !== "Processed").length;
      const avgSalary = mapped.length ? mapped.reduce((s, r) => s + r.base, 0) / mapped.length : 0;
      setKpi({ monthlyPayroll: totalNet, processed, pending, avgSalary });
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
      if (payrollFrozen) {
        add("Payroll is frozen. Unfreeze to generate.");
        return;
      }
      setGenLoading(true);
      const res = await fetch(`/api/payroll?year=${year}&month=${month}&taxRate=${taxRate}`, { method: "POST" });
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || "Failed to generate run");
      }
      const result = await res.json();
      add("Payroll run generated");
      await loadFromBackend(periodStr);
      setPeriodLabel("Current Month");
      appendAudit("Generated payroll run", `${year}-${String(month).padStart(2, "0")}`);
    } catch (e: any) {
      add(e.message || "Failed to generate run");
      console.error(e);
    } finally {
      setGenLoading(false);
    }
  };

  const onExportPdf = async () => {
    try {
      const payload = recs.slice(0, 20).map((r) => ({ employeeName: r.employee, netPay: computeNet(r), period: periodStr }));
      if (payload.length === 0) {
        add("No records to export");
        return;
      }
      const res = await fetch("/api/payroll/payslips", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ records: payload }),
      });
      const json = await res.json();
      const first = json?.slips?.[0];
      if (!first?.pdfUrl) {
        add("PDF export unavailable");
        return;
      }
      const a = document.createElement("a");
      a.href = first.pdfUrl;
      a.download = `payslips-${periodStr}.pdf`;
      a.click();
      add("PDF exported");
      appendAudit("PDF exported", periodLabel);
    } catch (err) {
      console.error(err);
      add("PDF export failed");
    }
  };

  const onProcess = () => {
    if (payrollFrozen) {
      add("Payroll frozen. Unfreeze to process.");
      return;
    }
    add("Processing payroll...");
    setTimeout(() => {
      // mark pending records as processed and update KPIs
      setRecs((prev) => prev.map((r) => (r.status === "Pending" ? { ...r, status: "Processed" } : r)));
      setKpi((prev) => ({ ...prev, processed: prev.processed + prev.pending, pending: 0 }));
      add("Payroll processed successfully (mock)");
      appendAudit("Payroll processed", periodLabel);
    }, 800);
  };

  const onRollback = () => {
    if (!rollbackAvailable) {
      add("No rollback points left");
      return;
    }
    setRollbackAvailable(false);
    add("Rollback executed: reverted last payroll run");
    appendAudit("Rollback executed", periodLabel);
  };

  const toggleFreeze = () => {
    setPayrollFrozen((prev) => {
      const next = !prev;
      appendAudit(next ? "Payroll frozen" : "Payroll unfrozen", periodLabel);
      return next;
    });
  };

  // Period filtering: use periodYear and periodMonth from records
  const displayedRecs = React.useMemo(() => {
    if (recs.length === 0) return [] as UIRecord[];
    
    if (periodLabel === "All Records") return recs;
    
    const today = new Date();
    const curY = today.getFullYear();
    const curM = today.getMonth() + 1; // 1-12 to match periodMonth
    const lastY = curM === 1 ? curY - 1 : curY;
    const lastM = curM === 1 ? 12 : curM - 1;
    
    if (periodLabel === "Last Month") {
      return recs.filter((r) => r.periodYear === lastY && r.periodMonth === lastM);
    }
    
    // Current Month - show records for current period OR all if no period match
    const currentMonthRecs = recs.filter((r) => r.periodYear === curY && r.periodMonth === curM);
    
    // If no current month records, show all records (they might be from selected year/month)
    if (currentMonthRecs.length === 0) {
      return recs; // Show all loaded records
    }
    
    return currentMonthRecs;
  }, [recs, periodLabel]);

  const departmentDistribution = React.useMemo(() => {
    const map = new Map<string, number>();
    recs.forEach((r) => {
      map.set(r.department, (map.get(r.department) || 0) + computeNet(r));
    });
    const colors = ["#2563eb", "#22c55e", "#f59e0b", "#a855f7", "#ef4444", "#06b6d4", "#f97316"];
    return Array.from(map.entries()).map(([name, value], idx) => ({ name, value, color: colors[idx % colors.length] }));
  }, [recs]);

  const departmentBreakdown = React.useMemo(() => {
    const map: Record<string, { payroll: number; bonus: number; deductions: number }> = {};
    recs.forEach((r) => {
      if (!map[r.department]) map[r.department] = { payroll: 0, bonus: 0, deductions: 0 };
      map[r.department].payroll += r.base;
      map[r.department].bonus += r.bonus;
      map[r.department].deductions += r.deductions;
    });
    return Object.entries(map).map(([dept, v]) => ({ dept, ...v }));
  }, [recs]);

  const payrollTrend = React.useMemo(() => {
    const map = new Map<string, number>();
    recs.forEach((r) => {
      const key = r.periodYear && r.periodMonth ? `${r.periodYear}-${String(r.periodMonth).padStart(2, "0")}` : r.date;
      map.set(key, (map.get(key) || 0) + computeNet(r));
    });
    return Array.from(map.entries())
      .sort(([a], [b]) => (a > b ? 1 : -1))
      .map(([k, v]) => ({ month: k ?? "-", amount: v }));
  }, [recs]);

  const overtimeCosts = React.useMemo(() => {
    const map = new Map<string, { hours: number; cost: number }>();
    recs.forEach((r) => {
      const key = r.periodYear && r.periodMonth ? `${r.periodYear}-${String(r.periodMonth).padStart(2, "0")}` : r.date ?? "";
      const hours = r.overtimeHours || 0;
      const hourlyRate = r.workingDays ? r.base / (r.workingDays * 8) : 0;
      const cost = hours * hourlyRate * 1.5;
      const prev = map.get(key) || { hours: 0, cost: 0 };
      map.set(key, { hours: prev.hours + hours, cost: prev.cost + cost });
    });
    return Array.from(map.entries())
      .sort(([a], [b]) => (a > b ? 1 : -1))
      .map(([month, v]) => ({ month, hours: v.hours, cost: v.cost }));
  }, [recs]);

  const salaryDistribution = React.useMemo(() => {
    const bands = ["0-40k", "40k-60k", "60k-80k", "80k-100k", "100k-120k", "120k+"];
    const buckets = bands.map((band) => ({ band, employees: 0 }));
    recs.forEach((r) => {
      const val = r.base;
      const idx = val >= 120000 ? 5 : val >= 100000 ? 4 : val >= 80000 ? 3 : val >= 60000 ? 2 : val >= 40000 ? 1 : 0;
      buckets[idx].employees += 1;
    });
    return buckets;
  }, [recs]);

  const bonusHeatmap = React.useMemo(() => {
    const months = payrollTrend.map((p) => p.month).slice(-6);
    const deptMap = new Map<string, number[]>();
    recs.forEach((r) => {
      const key = r.periodYear && r.periodMonth ? `${r.periodYear}-${String(r.periodMonth).padStart(2, "0")}` : r.date ?? "";
      const monthIdx = months.indexOf(key);
      if (monthIdx === -1) return;
      if (!deptMap.has(r.department)) deptMap.set(r.department, Array(months.length).fill(0));
      const arr = deptMap.get(r.department)!;
      const pct = r.base ? Math.min(30, Math.round(((r.bonus || 0) / r.base) * 100)) : 0;
      arr[monthIdx] = Math.max(arr[monthIdx], pct);
    });
    return Array.from(deptMap.entries()).map(([department, grants]) => ({ department, grants }));
  }, [recs, payrollTrend]);

  const costAnalysis = React.useMemo(() => {
    const totalComp = recs.reduce((s, r) => s + r.base + (r.bonus || 0), 0);
    const deductions = recs.reduce((s, r) => s + (r.deductions || 0), 0);
    const net = recs.reduce((s, r) => s + computeNet(r), 0);
    const benefits = Math.max(0, totalComp * 0.12);
    return [
      { label: "Total Compensation", value: totalComp },
      { label: "Benefits & Insurance (est)", value: benefits },
      { label: "Taxes & Deductions", value: deductions },
      { label: "Net Payroll", value: net },
    ];
  }, [recs]);

  const heatmapMonths = React.useMemo(() => payrollTrend.map((p) => p.month).slice(-6), [payrollTrend]);

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
        formatCurrency(computeNet(r), currency),
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

  const onExportExcel = () => {
    const header = ["Employee", "Department", "Base", "Bonus", "Deductions", "Net", "Status", "Pay Date"].join("\t");
    const body = recs
      .map((r) => [r.employee, r.department, computeNet(r), r.bonus, r.deductions, computeNet(r), r.status, r.date].join("\t"))
      .join("\n");
    const blob = new Blob([`${header}\n${body}`], { type: "application/vnd.ms-excel" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `payroll-export-${periodStr}.xls`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    add("Excel exported");
  };

  const onQuickBooksSync = () => {
    fetch("/api/payroll/quickbooks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ period: periodStr }),
    }).catch(() => null);
    add("Queued QuickBooks sync");
    appendAudit("QuickBooks sync", periodLabel);
  };

  const onSendPayslips = () => {
    const payload = displayedRecs.slice(0, 20).map((r) => ({ employeeName: r.employee, netPay: computeNet(r), period: periodStr }));
    fetch("/api/payroll/payslips", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ records: payload }),
    }).catch(() => null);
    add("Payslips generated (mock send)");
    appendAudit("Payslips emailed", periodLabel);
  };

  return (
    <div className="relative min-h-screen w-full overflow-x-hidden bg-gradient-to-br from-slate-50 via-white to-slate-100">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(99,102,241,0.12),transparent_32%),radial-gradient(circle_at_80%_0%,rgba(14,165,233,0.12),transparent_30%),radial-gradient(circle_at_60%_70%,rgba(52,211,153,0.12),transparent_28%)]" />
      {/* Toasts */}
      <div className="fixed top-3 right-3 z-50 space-y-2">
        {toasts.map((t) => (
          <div key={t.id} className="px-3 py-2 rounded-md shadow-md bg-gray-900 text-white text-xs sm:text-sm">{t.message}</div>
        ))}
      </div>

      <div className="relative mx-auto w-full max-w-7xl p-2 sm:p-4 lg:p-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 sm:gap-4">
          <div className="min-w-0">
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-semibold text-gray-900 truncate">Payroll Management</h1>
            <p className="mt-1 sm:mt-2 text-xs sm:text-sm text-gray-600">Manage employee compensation and payroll processing</p>
          </div>
          <div className="flex flex-wrap gap-1.5 sm:gap-2">
            <button onClick={onExportPdf} className="h-8 sm:h-9 px-3 rounded-md text-xs sm:text-sm font-medium border border-white/70 bg-white/80 backdrop-blur text-gray-800 flex items-center gap-2 shadow-sm hover:shadow">
              <Download className="w-4 h-4" />
              <span>Export PDF</span>
            </button>
            <button onClick={onProcess} className="h-8 sm:h-9 px-3 rounded-md text-xs sm:text-sm font-medium bg-slate-900 text-white hover:bg-slate-800 focus:ring-2 focus:ring-slate-500/60 flex items-center gap-2 shadow-sm hover:shadow">
              <CreditCard className="w-4 h-4" />
              <span>Process</span>
            </button>
          </div>
        </div>

        <div className="mt-3 grid grid-cols-1 md:grid-cols-3 gap-3 sm:gap-4">
          <div className="rounded-2xl border border-white/60 bg-white/80 backdrop-blur p-3 sm:p-4 shadow-lg shadow-slate-200/60">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-600">Compliance & Controls</p>
                <p className="text-base font-semibold text-gray-900">Freeze & Rollback</p>
              </div>
              <ShieldCheck className="w-5 h-5 text-emerald-600" />
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              <button onClick={toggleFreeze} className={`px-3 h-8 rounded-full text-xs font-medium shadow-sm ${payrollFrozen ? "bg-red-50 text-red-700 border border-red-200" : "bg-emerald-50 text-emerald-700 border border-emerald-200"}`}>
                {payrollFrozen ? "Unfreeze" : "Freeze"} payroll
              </button>
              <button onClick={onRollback} className="px-3 h-8 rounded-full text-xs font-medium bg-slate-900 text-white shadow-sm flex items-center gap-1">
                <Undo2 className="w-4 h-4" /> Rollback
              </button>
              <span className="px-2.5 h-8 inline-flex items-center rounded-full bg-gray-900 text-white text-[11px] font-medium shadow-sm">Audit on</span>
            </div>
            <p className="mt-2 text-[11px] text-gray-600">Full audit trail kept for every payroll action.</p>
          </div>

          <div className="rounded-2xl border border-white/60 bg-white/80 backdrop-blur p-3 sm:p-4 shadow-lg shadow-slate-200/60">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-600">Integrations</p>
                <p className="text-base font-semibold text-gray-900">Live syncs</p>
              </div>
              <Globe2 className="w-5 h-5 text-blue-600" />
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2">
              {integrationStatuses.map((i) => (
                <div key={i.label} className="rounded-xl border border-white/60 bg-white/80 px-2.5 py-2 shadow-sm">
                  <p className="text-[11px] text-gray-600">{i.label}</p>
                  <p className="text-xs font-semibold text-gray-900">{i.state}</p>
                  <p className="text-[10px] text-gray-500">{i.detail}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-white/60 bg-white/80 backdrop-blur p-3 sm:p-4 shadow-lg shadow-slate-200/60">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-600">AI & Insights</p>
                <p className="text-base font-semibold text-gray-900">Rule-based guardrails</p>
              </div>
              <Sparkles className="w-5 h-5 text-purple-600" />
            </div>
            <div className="mt-3 space-y-2">
              <label className="flex items-center justify-between text-xs text-gray-700">
                <span>Rule engine</span>
                <input type="checkbox" checked={aiRulesEnabled} onChange={() => setAiRulesEnabled((v) => !v)} className="h-4 w-4" />
              </label>
              {aiInsights.length === 0 && <p className="text-[11px] text-gray-500">Rules idle. Enable to surface risks.</p>}
              {aiInsights.slice(0, 2).map((msg, idx) => (
                <p key={idx} className="text-[11px] text-gray-800 leading-relaxed bg-white/80 border border-white/60 rounded-lg p-2">{msg}</p>
              ))}
            </div>
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
                  {(() => {
                    const total = recs.length || 1;
                    const completed = kpi.processed;
                    const inProgress = recs.filter((r) => r.status === "Pending").length;
                    const failed = recs.filter((r) => r.status === "Failed").length;
                    const pct = Math.min(100, (completed / total) * 100);
                    return (
                      <>
                        <div>
                          <p className="text-xs text-gray-600 mb-2">Overall Progress</p>
                          <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                            <div className="h-2 bg-gradient-to-r from-blue-500 to-indigo-600" style={{ width: `${pct.toFixed(1)}%` }} />
                          </div>
                          <p className="text-[11px] text-gray-500 mt-1">{pct.toFixed(1)}% of records processed</p>
                        </div>
                        <div className="grid grid-cols-3 gap-3">
                          <div className="rounded-lg border p-3 text-center bg-white hover:shadow-sm">
                            <p className="text-green-600 text-sm font-medium">Completed</p>
                            <p className="mt-1 text-lg sm:text-2xl font-semibold text-gray-900">{completed.toLocaleString()}</p>
                          </div>
                          <div className="rounded-lg border p-3 text-center bg-white hover:shadow-sm">
                            <p className="text-orange-600 text-sm font-medium">In Progress</p>
                            <p className="mt-1 text-lg sm:text-2xl font-semibold text-gray-900">{inProgress.toLocaleString()}</p>
                          </div>
                          <div className="rounded-lg border p-3 text-center bg-white hover:shadow-sm">
                            <p className="text-red-600 text-sm font-medium">Failed</p>
                            <p className="mt-1 text-lg sm:text-2xl font-semibold text-gray-900">{failed.toLocaleString()}</p>
                          </div>
                        </div>
                      </>
                    );
                  })()}
                </div>
              </SectionCard>
            </div>

            <SectionCard title="Salary Breakdown">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={departmentBreakdown} margin={{ top: 8, right: 16, left: -10, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                      <XAxis dataKey="dept" stroke="#6b7280" tick={{ fontSize: 12 }} />
                      <YAxis stroke="#6b7280" tick={{ fontSize: 12 }} tickFormatter={(v) => formatShort(v as number, currency)} />
                      <Tooltip formatter={(v: any) => formatCurrency(v as number, currency)} contentStyle={{ background: "#fff", borderRadius: 12, border: "1px solid #e5e7eb" }} />
                      <Legend />
                      <Bar dataKey="payroll" fill="#2563eb" radius={[6, 6, 0, 0]} />
                      <Bar dataKey="bonus" fill="#22c55e" radius={[6, 6, 0, 0]} />
                      <Bar dataKey="deductions" fill="#f59e0b" radius={[6, 6, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                <div className="space-y-2">
                  {departmentBreakdown.map((d) => (
                    <div key={d.dept} className="flex items-center justify-between rounded-xl border border-white/60 bg-white/80 px-3 py-2 shadow-sm">
                      <div>
                        <p className="text-xs text-gray-600">{d.dept}</p>
                        <p className="text-sm font-semibold text-gray-900">{formatCurrency(d.payroll, currency)}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-[11px] text-gray-600">Bonus {formatCurrency(d.bonus, currency)}</p>
                        <p className="text-[11px] text-gray-600">Deductions {formatCurrency(d.deductions, currency)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </SectionCard>

            <SectionCard title="Overtime & Leave Sync">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="h-60">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={overtimeCosts} margin={{ top: 8, right: 10, left: -10, bottom: 0 }}>
                      <defs>
                        <linearGradient id="ot" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#2563eb" stopOpacity={0.35} />
                          <stop offset="95%" stopColor="#2563eb" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                      <XAxis dataKey="month" stroke="#6b7280" tick={{ fontSize: 12 }} />
                      <YAxis stroke="#6b7280" tick={{ fontSize: 12 }} tickFormatter={(v) => formatShort(v as number, currency)} />
                      <Tooltip contentStyle={{ background: "#fff", borderRadius: 12, border: "1px solid #e5e7eb" }} formatter={(v: any) => formatCurrency(v as number, currency)} />
                      <Area type="monotone" dataKey="cost" stroke="#2563eb" fillOpacity={1} fill="url(#ot)" strokeWidth={2} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between rounded-xl border border-white/60 bg-white/80 px-3 py-2">
                    <div>
                      <p className="text-xs text-gray-600">Auto attendance sync</p>
                      <p className="text-sm font-semibold text-gray-900">{autoSyncEnabled ? "Enabled" : "Paused"}</p>
                    </div>
                    <label className="flex items-center gap-2 text-xs text-gray-700">
                      <span>Apply</span>
                      <input type="checkbox" checked={autoSyncEnabled} onChange={() => setAutoSyncEnabled((v) => !v)} className="h-4 w-4" />
                    </label>
                  </div>
                  <p className="text-[11px] text-gray-600">Overtime, absences, and leave deductions flow into net pay when sync is enabled.</p>
                  <div className="rounded-xl border border-blue-100 bg-blue-50 px-3 py-2 text-[11px] text-blue-800">
                    {overtimeCosts.length > 0
                      ? `Last sync added +${Math.round(overtimeCosts[overtimeCosts.length - 1].hours)} overtime hours and auto-applied leave deductions.`
                      : "Awaiting first attendance sync for this period."}
                  </div>
                </div>
              </div>
            </SectionCard>

            <SectionCard title="Bonus Heatmap">
              <div className="space-y-3">
                {heatmapMonths.length === 0 ? (
                  <p className="text-[11px] text-gray-600">No bonus data yet for this period.</p>
                ) : (
                  <>
                    <div className="grid grid-cols-7 text-[11px] text-gray-600 px-1">
                      <span className="text-gray-700 font-semibold">Dept</span>
                      {heatmapMonths.map((m) => (
                        <span key={m} className="text-center">{m}</span>
                      ))}
                    </div>
                    <div className="space-y-2">
                      {bonusHeatmap.map((row) => (
                        <div key={row.department} className="grid grid-cols-7 gap-1 items-center text-[11px]">
                          <span className="font-medium text-gray-800">{row.department}</span>
                          {row.grants.map((v, idx) => (
                            <div
                              key={idx}
                              className="h-9 rounded-md flex items-center justify-center text-xs font-semibold"
                              style={{
                                background: `rgba(59,130,246,${0.18 + v / 50})`,
                                color: v > 14 ? "#0f172a" : "#1e3a8a",
                              }}
                            >
                              {v}%
                            </div>
                          ))}
                        </div>
                      ))}
                    </div>
                    <p className="text-[11px] text-gray-600">Rule: High overtime + high bonus highlights for retention incentives.</p>
                  </>
                )}
              </div>
            </SectionCard>

            <SectionCard title="Payroll Summary">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="rounded-xl border border-blue-100 bg-blue-50 px-3 py-3">
                  <p className="text-xs text-blue-700 font-medium">Total Employees</p>
                  <p className="text-2xl font-bold text-blue-900">{recs.length}</p>
                  <p className="text-[11px] text-blue-600">Active in current period</p>
                </div>
                <div className="rounded-xl border border-green-100 bg-green-50 px-3 py-3">
                  <p className="text-xs text-green-700 font-medium">Total Base Salary</p>
                  <p className="text-2xl font-bold text-green-900">{formatCurrency(recs.reduce((s, r) => s + r.base, 0), currency)}</p>
                  <p className="text-[11px] text-green-600">Before deductions</p>
                </div>
                <div className="rounded-xl border border-amber-100 bg-amber-50 px-3 py-3">
                  <p className="text-xs text-amber-700 font-medium">Total Deductions</p>
                  <p className="text-2xl font-bold text-amber-900">{formatCurrency(recs.reduce((s, r) => s + r.deductions, 0), currency)}</p>
                  <p className="text-[11px] text-amber-600">Tax + Leave deductions</p>
                </div>
                <div className="rounded-xl border border-purple-100 bg-purple-50 px-3 py-3">
                  <p className="text-xs text-purple-700 font-medium">Total Overtime Bonus</p>
                  <p className="text-2xl font-bold text-purple-900">{formatCurrency(recs.reduce((s, r) => s + r.bonus, 0), currency)}</p>
                  <p className="text-[11px] text-purple-600">{recs.reduce((s, r) => s + (r.overtimeHours || 0), 0).toFixed(1)} hours total</p>
                </div>
              </div>
              <p className="mt-3 text-[11px] text-gray-600">Data synced from attendance and leave records. Tax rate applied as per settings.</p>
            </SectionCard>

            <SectionCard title="Audit Log">
              <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                {auditLog.map((log, idx) => (
                  <div key={idx} className="flex items-center justify-between rounded-xl border border-white/60 bg-white/80 px-3 py-2 text-xs shadow-sm">
                    <div>
                      <p className="font-semibold text-gray-900">{log.action}</p>
                      <p className="text-[11px] text-gray-600">{log.scope}</p>
                    </div>
                    <p className="text-[11px] text-gray-500">{log.at}</p>
                  </div>
                ))}
              </div>
            </SectionCard>
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
              <div className="grid grid-cols-1 md:grid-cols-3 gap-2 mb-3">
                <div className="rounded-xl border border-blue-100 bg-blue-50 px-3 py-2 text-[11px] text-blue-800">
                  Attendance + leave sync is {autoSyncEnabled ? "ON" : "OFF"}; overtime and unpaid leave deductions are applied to net pay.
                </div>
                <div className="rounded-xl border border-purple-100 bg-purple-50 px-3 py-2 text-[11px] text-purple-800">
                  AI guardrails {aiRulesEnabled ? "ON" : "OFF"}; rule-based insights flag high overtime and pending approvals.
                </div>
                <div className="rounded-xl border border-amber-100 bg-amber-50 px-3 py-2 text-[11px] text-amber-800">
                  {payrollFrozen ? "Payroll is frozen until compliance approves." : "Live state – you can process or export."}
                </div>
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
                  <div key={c.label} className="flex items-center justify-between rounded-lg border px-3 py-2 bg-white/80 backdrop-blur">
                    <span className="text-sm text-gray-800">{c.label}</span>
                    <span className="text-sm sm:text-base font-semibold text-gray-900">{formatCurrency(c.value, currency)}</span>
                  </div>
                ))}
              </div>
            </SectionCard>

            <SectionCard title="Salary Distribution (bands)">
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={salaryDistribution} margin={{ top: 8, right: 16, left: -10, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis dataKey="band" stroke="#6b7280" tick={{ fontSize: 12 }} />
                    <YAxis stroke="#6b7280" tick={{ fontSize: 12 }} />
                    <Tooltip contentStyle={{ background: "#fff", borderRadius: 12, border: "1px solid #e5e7eb" }} />
                    <Bar dataKey="employees" fill="#0ea5e9" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </SectionCard>

            <SectionCard title="Overtime Costs">
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={overtimeCosts} margin={{ top: 8, right: 10, left: -10, bottom: 0 }}>
                    <defs>
                      <linearGradient id="ot2" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#14b8a6" stopOpacity={0.35} />
                        <stop offset="95%" stopColor="#14b8a6" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis dataKey="month" stroke="#6b7280" tick={{ fontSize: 12 }} />
                    <YAxis stroke="#6b7280" tick={{ fontSize: 12 }} tickFormatter={(v) => formatShort(v as number, currency)} />
                    <Tooltip contentStyle={{ background: "#fff", borderRadius: 12, border: "1px solid #e5e7eb" }} formatter={(v: any) => formatCurrency(v as number, currency)} />
                    <Area type="monotone" dataKey="cost" stroke="#14b8a6" fillOpacity={1} fill="url(#ot2)" strokeWidth={2} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </SectionCard>

            <SectionCard title="Bonus Heatmap">
              <div className="space-y-3">
                {heatmapMonths.length === 0 ? (
                  <p className="text-[11px] text-gray-600">No bonus data yet for this period.</p>
                ) : (
                  <>
                    <div className="grid grid-cols-7 text-[11px] text-gray-600 px-1">
                      <span className="text-gray-700 font-semibold">Dept</span>
                      {heatmapMonths.map((m) => (
                        <span key={m} className="text-center">{m}</span>
                      ))}
                    </div>
                    <div className="space-y-2">
                      {bonusHeatmap.map((row) => (
                        <div key={row.department} className="grid grid-cols-7 gap-1 items-center text-[11px]">
                          <span className="font-medium text-gray-800">{row.department}</span>
                          {row.grants.map((v, idx) => (
                            <div
                              key={idx}
                              className="h-9 rounded-md flex items-center justify-center text-xs font-semibold"
                              style={{
                                background: `rgba(99,102,241,${0.18 + v / 50})`,
                                color: v > 14 ? "#0f172a" : "#312e81",
                              }}
                            >
                              {v}%
                            </div>
                          ))}
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>
            </SectionCard>
          </div>
        )}

        {/* Settings */}
        {tab === "settings" && (
          <SettingsTab
            currency={currency}
            setCurrency={setCurrency}
            autoSyncEnabled={autoSyncEnabled}
            setAutoSyncEnabled={setAutoSyncEnabled}
            aiRulesEnabled={aiRulesEnabled}
            setAiRulesEnabled={setAiRulesEnabled}
            add={add}
            year={year}
            month={month}
            taxRate={taxRate}
            setTaxRate={setTaxRate}
          />
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
  const [payNow, setPayNow] = React.useState(false);
  
  React.useEffect(() => {
    setDraft(record ? { ...record } : null);
    setPayNow(false);
  }, [record, open]);
  
  if (!open || !draft) return null;
  const r = draft;
  const leaveDed = computeLeaveDeduction(r.base, r.unpaidLeaveDays, r.workingDays);
  const previewNet = computeNet(r);
  
  // Calculate individual deduction components
  const dailyRate = r.workingDays ? r.base / r.workingDays : 0;
  const unpaidLeaveDeduction = Math.round(dailyRate * (r.unpaidLeaveDays || 0));
  const absentDaysDeduction = Math.round(dailyRate * (r.absentDays || 0));
  const totalLeaveDeduction = unpaidLeaveDeduction + absentDaysDeduction;
  const taxDeduction = Math.max(0, r.deductions - totalLeaveDeduction); // Remaining is tax
  
  // Pay date options
  const today = new Date();
  const todayStr = today.toLocaleDateString();
  const scheduledDate = r.date;
  
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      <div className="relative z-10 w-full max-w-3xl rounded-t-xl sm:rounded-xl bg-white border shadow-lg p-4 sm:p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base sm:text-lg font-semibold text-gray-900">Edit Payroll – {r.employee}</h3>
          <button onClick={onClose} className="rounded-md p-1 hover:bg-gray-100 text-gray-500">✕</button>
        </div>
        
        {/* Deduction Breakdown */}
        <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 p-4">
          <p className="text-sm font-semibold text-amber-800 mb-3">Deduction Breakdown - This Month</p>
          <div className="space-y-2">
            {/* Unpaid Leave */}
            <div className="flex justify-between items-center py-1">
              <span className="text-sm text-gray-700">Unpaid Leave ({r.unpaidLeaveDays || 0} days)</span>
              <span className="font-medium text-red-700">{formatCurrency(unpaidLeaveDeduction, currency)}</span>
            </div>
            
            {/* Absent Days */}
            <div className="flex justify-between items-center py-1">
              <span className="text-sm text-gray-700">Absent Without Leave ({r.absentDays || 0} days)</span>
              <span className="font-medium text-red-700">{formatCurrency(absentDaysDeduction, currency)}</span>
            </div>
            
            {/* Tax */}
            <div className="flex justify-between items-center py-1">
              <span className="text-sm text-gray-700">Tax Deduction</span>
              <span className="font-medium text-red-700">{formatCurrency(taxDeduction, currency)}</span>
            </div>
            
            {/* Paid Leave (No deduction) */}
            <div className="flex justify-between items-center py-1">
              <span className="text-sm text-green-700">Paid Leave ({r.paidLeaveDays || 0} days)</span>
              <span className="font-medium text-green-700">No deduction ✓</span>
            </div>
            
            {/* Overtime Bonus */}
            <div className="flex justify-between items-center py-1 border-t border-amber-200 pt-2 mt-2">
              <span className="text-sm text-blue-700">Overtime Hours: {(r.overtimeHours || 0).toFixed(1)} hrs</span>
              <span className="font-medium text-green-700">+{formatCurrency(r.bonus, currency)}</span>
            </div>
          </div>
          
          <div className="mt-3 pt-3 border-t border-amber-300 flex justify-between text-base">
            <span className="font-semibold text-amber-900">Total Deductions:</span>
            <span className="font-bold text-red-800">{formatCurrency(r.deductions, currency)}</span>
          </div>
        </div>
        
        {/* Pay Date Options */}
        <div className="mb-4 rounded-lg border border-blue-200 bg-blue-50 p-3">
          <p className="text-sm font-semibold text-blue-800 mb-3">Pay Date</p>
          <div className="flex flex-col sm:flex-row gap-3">
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input 
                type="radio" 
                name="payDate" 
                checked={!payNow} 
                onChange={() => setPayNow(false)}
                className="h-4 w-4"
              />
              <span className="text-gray-700">Scheduled: <strong className="text-blue-800">{scheduledDate}</strong></span>
            </label>
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input 
                type="radio" 
                name="payDate" 
                checked={payNow} 
                onChange={() => setPayNow(true)}
                className="h-4 w-4"
              />
              <span className="text-gray-700">Pay Now: <strong className="text-green-700">{todayStr}</strong></span>
            </label>
          </div>
        </div>
        
        {/* Edit Fields */}
        <div className="mb-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
          <LabeledNumber label="Base Salary" value={r.base} onChange={(v) => setDraft({ ...r, base: v })} />
          <LabeledNumber label="Bonus (Overtime)" value={r.bonus} onChange={(v) => setDraft({ ...r, bonus: v })} />
          <LabeledNumber label="Manual Adjustments (+/-)" value={r.manualAdjustments || 0} onChange={(v) => setDraft({ ...r, manualAdjustments: v })} />
          <LabeledNumber label="Override Net Pay (optional)" value={r.overrideNetPay ?? NaN} allowEmpty onChange={(v) => setDraft({ ...r, overrideNetPay: isNaN(v) ? null : v })} />
        </div>
        
        {/* Net Pay Display */}
        <div className="mb-6 rounded-lg border border-green-200 bg-green-50 p-4">
          <div className="flex justify-between items-center">
            <span className="text-green-800 font-medium text-lg">Final Net Pay:</span>
            <span className="text-2xl font-bold text-green-900">{formatCurrency(previewNet, currency)}</span>
          </div>
          <p className="text-sm text-green-700 mt-1">Base + Overtime - Deductions</p>
        </div>
        
        {/* Action Buttons */}
        <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
          <button onClick={onClose} className="h-10 px-4 rounded-md border border-red-200 bg-red-50 text-red-700 hover:bg-red-100 font-medium">
            Cancel
          </button>
          <button 
            onClick={() => draft && onSave({ 
              ...draft, 
              net: previewNet,
              date: payNow ? todayStr : scheduledDate,
              status: payNow ? "Processed" : draft.status
            })} 
            className="h-10 px-4 rounded-md bg-blue-600 text-white hover:bg-blue-700 font-medium"
          >
            {payNow ? "Pay Now & Save" : "Save Changes"}
          </button>
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

// Settings Tab Component
function SettingsTab({
  currency,
  setCurrency,
  autoSyncEnabled,
  setAutoSyncEnabled,
  aiRulesEnabled,
  setAiRulesEnabled,
  add,
  year,
  month,
  taxRate,
  setTaxRate,
}: {
  currency: Currency;
  setCurrency: (c: Currency) => void;
  autoSyncEnabled: boolean;
  setAutoSyncEnabled: (fn: (v: boolean) => boolean) => void;
  aiRulesEnabled: boolean;
  setAiRulesEnabled: (fn: (v: boolean) => boolean) => void;
  add: (msg: string) => void;
  year: number;
  month: number;
  taxRate: number;
  setTaxRate: (v: number) => void;
}) {
  // Get last day of selected month
  const lastDayOfMonth = new Date(year, month, 0).getDate();
  const defaultPayDate = `${month.toString().padStart(2, "0")}/${lastDayOfMonth}/${year}`;
  
  const [payPeriod, setPayPeriod] = React.useState("Monthly");
  const [payDate, setPayDate] = React.useState(defaultPayDate);
  const [localTaxRate, setLocalTaxRate] = React.useState(taxRate);
  const [localCurrency, setLocalCurrency] = React.useState<Currency>(currency);
  const [localAutoSync, setLocalAutoSync] = React.useState(autoSyncEnabled);
  const [localAiRules, setLocalAiRules] = React.useState(aiRulesEnabled);
  const [quickbooksSync, setQuickbooksSync] = React.useState(true);
  const [saving, setSaving] = React.useState(false);

  // Update pay date when year/month changes
  React.useEffect(() => {
    const lastDay = new Date(year, month, 0).getDate();
    setPayDate(`${month.toString().padStart(2, "0")}/${lastDay}/${year}`);
  }, [year, month]);

  const handleSave = async () => {
    setSaving(true);
    try {
      // Apply settings to parent
      setCurrency(localCurrency);
      setAutoSyncEnabled(() => localAutoSync);
      setAiRulesEnabled(() => localAiRules);
      setTaxRate(localTaxRate); // Update parent's taxRate
      
      // Save to localStorage
      localStorage.setItem("payroll_settings", JSON.stringify({
        payPeriod,
        payDate,
        taxRate: localTaxRate,
        currency: localCurrency,
        autoSync: localAutoSync,
        aiRules: localAiRules,
        quickbooksSync,
      }));
      
      add(`Settings saved. Tax: ${localTaxRate}%, Currency: ${localCurrency}, Pay Date: ${payDate}`);
    } catch (e) {
      add("Failed to save settings");
    } finally {
      setSaving(false);
    }
  };

  // Load saved settings on mount
  React.useEffect(() => {
    try {
      const saved = localStorage.getItem("payroll_settings");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.payPeriod) setPayPeriod(parsed.payPeriod);
        if (parsed.taxRate !== undefined) {
          setLocalTaxRate(parsed.taxRate);
          setTaxRate(parsed.taxRate); // Also update parent
        }
        if (parsed.currency) setLocalCurrency(parsed.currency);
        if (parsed.autoSync !== undefined) setLocalAutoSync(parsed.autoSync);
        if (parsed.aiRules !== undefined) setLocalAiRules(parsed.aiRules);
        if (parsed.quickbooksSync !== undefined) setQuickbooksSync(parsed.quickbooksSync);
      }
    } catch (e) {
      // ignore
    }
  }, [setTaxRate]);

  return (
    <div className="mt-4">
      <SectionCard title="Payroll Settings">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
          <div>
            <label className="block text-xs sm:text-sm text-gray-800 mb-1">Pay Period</label>
            <select 
              className="w-full h-9 px-3 rounded-md border bg-white text-sm text-gray-900"
              value={payPeriod}
              onChange={(e) => setPayPeriod(e.target.value)}
            >
              <option>Monthly</option>
              <option>Bi-weekly</option>
              <option>Weekly</option>
            </select>
          </div>
          <div>
            <label className="block text-xs sm:text-sm text-gray-800 mb-1">Default Pay Date (Last day of month)</label>
            <input 
              type="text" 
              value={payDate} 
              onChange={(e) => setPayDate(e.target.value)}
              className="w-full h-9 px-3 rounded-md border bg-white text-sm text-gray-900 placeholder:text-gray-500" 
            />
          </div>
          <div>
            <label className="block text-xs sm:text-sm text-gray-800 mb-1">Default Tax Rate (%)</label>
            <input 
              type="number" 
              value={localTaxRate} 
              onChange={(e) => setLocalTaxRate(Number(e.target.value))}
              className="w-full h-9 px-3 rounded-md border bg-white text-sm text-gray-900 placeholder:text-gray-500" 
            />
          </div>
          <div>
            <label className="block text-xs sm:text-sm text-gray-800 mb-1">Currency</label>
            <select
              className="w-full h-9 px-3 rounded-md border bg-white text-sm text-gray-900"
              value={localCurrency}
              onChange={(e) => setLocalCurrency(e.target.value as Currency)}
            >
              <option value="PKR">PKR (Rs)</option>
              <option value="USD">USD ($)</option>
              <option value="EUR">EUR (€)</option>
            </select>
          </div>
        </div>
        <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
          <label className="flex items-center justify-between rounded-xl border border-white/60 bg-white/80 px-3 py-2 text-xs text-gray-800">
            <span>Attendance + leave sync</span>
            <input 
              type="checkbox" 
              checked={localAutoSync} 
              onChange={() => setLocalAutoSync(!localAutoSync)} 
              className="h-4 w-4" 
            />
          </label>
          <label className="flex items-center justify-between rounded-xl border border-white/60 bg-white/80 px-3 py-2 text-xs text-gray-800">
            <span>AI guardrails</span>
            <input 
              type="checkbox" 
              checked={localAiRules} 
              onChange={() => setLocalAiRules(!localAiRules)} 
              className="h-4 w-4" 
            />
          </label>
          <label className="flex items-center justify-between rounded-xl border border-white/60 bg-white/80 px-3 py-2 text-xs text-gray-800">
            <span>QuickBooks sync</span>
            <input 
              type="checkbox" 
              checked={quickbooksSync} 
              onChange={() => setQuickbooksSync(!quickbooksSync)} 
              className="h-4 w-4" 
            />
          </label>
        </div>
        <div className="mt-4">
          <button
            onClick={handleSave}
            disabled={saving}
            className={`px-4 py-2 rounded-md text-white text-sm ${saving ? "bg-blue-400" : "bg-blue-600 hover:bg-blue-700"}`}
          >
            {saving ? "Saving..." : "Save Settings"}
          </button>
        </div>
      </SectionCard>
    </div>
  );
}
