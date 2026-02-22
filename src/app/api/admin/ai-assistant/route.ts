/* eslint-disable @typescript-eslint/no-explicit-any */
// cspell:ignore CEREBRAS Nexora NEXORA
import dns from "node:dns";
dns.setDefaultResultOrder("ipv4first");

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

const CEREBRAS_API_URL = "https://api.cerebras.ai/v1/chat/completions";
const CEREBRAS_MODEL = "llama3.1-8b";

// ─── Navigation registry ────────────────────────────────────────────────────
const NAV_SECTIONS = [
  { path: "/admin/dashboard", label: "Dashboard", keywords: ["dashboard", "overview", "summary", "home"] },
  { path: "/admin/employees", label: "Employees", keywords: ["employee", "employees", "staff", "worker", "hire", "hiring", "headcount", "team", "department"] },
  { path: "/admin/attendance", label: "Attendance", keywords: ["attendance", "present", "absent", "late", "check-in", "check-out", "time"] },
  { path: "/admin/leave", label: "Leave Management", keywords: ["leave", "vacation", "sick", "time off", "absence", "annual leave"] },
  { path: "/admin/payroll", label: "Payroll", keywords: ["payroll", "salary", "pay", "compensation", "payslip", "wage", "gross", "net"] },
  { path: "/admin/performance", label: "Performance", keywords: ["performance", "rating", "review", "appraisal", "goal", "okr", "kpi", "score"] },
  { path: "/admin/recruitment", label: "Recruitment", keywords: ["recruitment", "job", "jobs", "applicant", "application", "candidate", "vacancy", "open position", "hiring"] },
  { path: "/admin/attrition", label: "Attrition", keywords: ["attrition", "turnover", "resign", "resignation", "quit", "churn", "retention"] },
  { path: "/admin/sentiment", label: "Sentiment", keywords: ["sentiment", "mood", "satisfaction", "engagement", "wellbeing", "feedback"] },
  { path: "/admin/task", label: "Tasks", keywords: ["task", "tasks", "todo", "assignment", "project"] },
  { path: "/admin/settings", label: "Settings", keywords: ["setting", "settings", "config", "configuration"] },
];

function detectNav(text: string): { path: string; label: string }[] {
  const lower = text.toLowerCase();
  const matched: { path: string; label: string }[] = [];
  const seen = new Set<string>();
  for (const section of NAV_SECTIONS) {
    if (section.keywords.some((k) => lower.includes(k)) && !seen.has(section.path)) {
      seen.add(section.path);
      matched.push({ path: section.path, label: section.label });
    }
  }
  return matched;
}

// ─── Live data fetchers ──────────────────────────────────────────────────────
async function fetchEmployeeSummary() {
  try {
    const [total, active, byDept] = await Promise.all([
      prisma.employee.count(),
      prisma.employee.count({ where: { status: "Active" } }),
      prisma.employee.groupBy({ by: ["department"], _count: { id: true }, orderBy: { _count: { id: "desc" } }, take: 8 }),
    ]);
    const recentHires = await prisma.employee.findMany({
      orderBy: { joinDate: "desc" },
      take: 5,
      select: { firstName: true, lastName: true, department: true, jobTitle: true, joinDate: true },
    });
    return {
      total,
      active,
      inactive: total - active,
      departments: byDept.map((d) => ({ name: d.department ?? "Unknown", count: d._count.id })),
      recentHires: recentHires.map((e) => ({
        name: `${e.firstName} ${e.lastName}`,
        department: e.department,
        title: e.jobTitle,
        joinDate: e.joinDate?.toISOString().split("T")[0],
      })),
    };
  } catch { return null; }
}

async function fetchAttendanceSummary() {
  try {
    const today = new Date();
    const todayStr = today.toISOString().split("T")[0];
    const startOfDay = new Date(`${todayStr}T00:00:00.000Z`);
    const endOfDay = new Date(`${todayStr}T23:59:59.999Z`);
    const [present, late, absent] = await Promise.all([
      (prisma as any).attendance.count({ where: { date: { gte: startOfDay, lte: endOfDay }, status: "Present" } }),
      (prisma as any).attendance.count({ where: { date: { gte: startOfDay, lte: endOfDay }, status: "Late" } }),
      (prisma as any).attendance.count({ where: { date: { gte: startOfDay, lte: endOfDay }, status: "Absent" } }),
    ]);
    return { date: todayStr, present, late, absent, total: present + late + absent };
  } catch { return null; }
}

async function fetchLeaveSummary() {
  try {
    const today = new Date();
    const [pending, onLeaveToday, byType] = await Promise.all([
      prisma.leave.count({ where: { status: "Pending" } }),
      prisma.leave.count({ where: { status: "Approved", startDate: { lte: today }, endDate: { gte: today } } }),
      prisma.leave.groupBy({ by: ["type"], _count: { id: true }, orderBy: { _count: { id: "desc" } }, take: 5 }),
    ]);
    const recentPending = await prisma.leave.findMany({
      where: { status: "Pending" },
      take: 5,
      orderBy: { id: "desc" },
      include: { employee: { select: { firstName: true, lastName: true, department: true } } },
    });
    return {
      pending,
      onLeaveToday,
      byType: byType.map((t) => ({ type: t.type, count: t._count.id })),
      recentPending: recentPending.map((l) => ({
        employee: `${l.employee?.firstName} ${l.employee?.lastName}`,
        department: l.employee?.department,
        type: l.type,
        from: l.startDate?.toISOString().split("T")[0],
        to: l.endDate?.toISOString().split("T")[0],
      })),
    };
  } catch { return null; }
}

async function fetchPayrollSummary() {
  try {
    const [pending, processed, totalPayable] = await Promise.all([
      (prisma as any).payrollRecord.count({ where: { status: "Pending" } }),
      (prisma as any).payrollRecord.count({ where: { status: "Processed" } }),
      (prisma as any).payrollRecord.aggregate({ _sum: { netPay: true }, where: { status: "Processed" } }),
    ]);
    const byDept = await (prisma as any).payrollRecord.groupBy({
      by: ["department"],
      _sum: { netPay: true },
      _count: { id: true },
      orderBy: { _sum: { netPay: "desc" } },
      take: 6,
    });
    return {
      pending,
      processed,
      totalProcessedAmount: totalPayable._sum?.netPay ?? 0,
      byDepartment: byDept.map((d: any) => ({ department: d.department, totalPay: d._sum?.netPay ?? 0, count: d._count?.id ?? 0 })),
    };
  } catch { return null; }
}

async function fetchPerformanceSummary() {
  try {
    const rows = await (prisma as any).performance.findMany({
      take: 200,
      orderBy: [{ periodYear: "desc" }, { periodMonth: "desc" }],
    });
    if (!rows.length) return null;
    const avg = rows.reduce((s: number, r: any) => s + (r.score ?? 0), 0) / rows.length;
    const employeeIds = [...new Set(rows.map((r: any) => r.employeeId))].slice(0, 5);
    const topEmployees = await prisma.employee.findMany({
      where: { id: { in: employeeIds as number[] } },
      select: { id: true, firstName: true, lastName: true, department: true, performanceRating: true },
    });
    return { averageScore: Math.round(avg * 10) / 10, totalRecords: rows.length, topEmployees };
  } catch { return null; }
}

async function fetchRecruitmentSummary() {
  try {
    const [openJobs, totalApplications, pendingApplications] = await Promise.all([
      (prisma as any).job.count({ where: { status: "Open" } }).catch(() => 0),
      (prisma as any).application.count().catch(() => 0),
      (prisma as any).application.count({ where: { status: "Pending" } }).catch(() => 0),
    ]);
    return { openJobs, totalApplications, pendingApplications };
  } catch { return null; }
}

// ─── Intent detection ────────────────────────────────────────────────────────
function detectIntents(text: string): string[] {
  const lower = text.toLowerCase();
  const intents: string[] = [];
  if (/employee|staff|worker|hire|team|headcount/.test(lower)) intents.push("employees");
  if (/attendance|present|absent|late|check.?in|clock|time/.test(lower)) intents.push("attendance");
  if (/leave|vacation|sick|time off|absence/.test(lower)) intents.push("leave");
  if (/payroll|salary|pay|wage|compensation/.test(lower)) intents.push("payroll");
  if (/performance|rating|review|appraisal|goal|okr/.test(lower)) intents.push("performance");
  if (/recruit|job|applicant|candidate|vacancy|position/.test(lower)) intents.push("recruitment");
  return intents;
}

// ─── Build context string from live data ─────────────────────────────────────
async function buildLiveContext(intents: string[]): Promise<string> {
  if (!intents.length) return "";

  const parts: string[] = [];

  await Promise.all(
    intents.map(async (intent) => {
      switch (intent) {
        case "employees": {
          const d = await fetchEmployeeSummary();
          if (d) parts.push(`[LIVE EMPLOYEE DATA]\nTotal: ${d.total} | Active: ${d.active} | Inactive: ${d.inactive}\nDepartments: ${d.departments.map((dep) => `${dep.name}(${dep.count})`).join(", ")}\nRecent Hires: ${d.recentHires.map((h) => `${h.name} (${h.title}, ${h.department}) joined ${h.joinDate}`).join(" | ")}`);
          break;
        }
        case "attendance": {
          const d = await fetchAttendanceSummary();
          if (d) parts.push(`[LIVE ATTENDANCE DATA - ${d.date}]\nPresent: ${d.present} | Late: ${d.late} | Absent: ${d.absent} | Total Records: ${d.total}`);
          break;
        }
        case "leave": {
          const d = await fetchLeaveSummary();
          if (d) parts.push(`[LIVE LEAVE DATA]\nPending Requests: ${d.pending} | On Leave Today: ${d.onLeaveToday}\nLeave Types: ${d.byType.map((t) => `${t.type}(${t.count})`).join(", ")}\nRecent Pending: ${d.recentPending.map((l) => `${l.employee} (${l.type}) ${l.from}→${l.to}`).join(" | ")}`);
          break;
        }
        case "payroll": {
          const d = await fetchPayrollSummary();
          if (d) parts.push(`[LIVE PAYROLL DATA]\nPending: ${d.pending} | Processed: ${d.processed} | Total Processed Amount: ${d.totalProcessedAmount}\nBy Department: ${d.byDepartment.map((b: any) => `${b.department}(${b.count} employees, PKR ${b.totalPay})`).join(", ")}`);
          break;
        }
        case "performance": {
          const d = await fetchPerformanceSummary();
          if (d) parts.push(`[LIVE PERFORMANCE DATA]\nAverage Score: ${d.averageScore}/10 | Total Reviews: ${d.totalRecords}\nTop Employees: ${d.topEmployees.map((e: any) => `${e.firstName} ${e.lastName} (${e.department}, rating: ${e.performanceRating ?? "N/A"})`).join(" | ")}`);
          break;
        }
        case "recruitment": {
          const d = await fetchRecruitmentSummary();
          if (d) parts.push(`[LIVE RECRUITMENT DATA]\nOpen Jobs: ${d.openJobs} | Total Applications: ${d.totalApplications} | Pending Review: ${d.pendingApplications}`);
          break;
        }
      }
    })
  );

  return parts.join("\n\n");
}

// ─── System prompt ────────────────────────────────────────────────────────────
function buildSystemPrompt(liveContext: string): string {
  return `You are Nexora AI, an intelligent HR assistant for the Nexora Human Capital Management (HCM) platform. You help HR administrators with employee management, attendance, leave, payroll, performance, recruitment, analytics, and all HR operations.

NAVIGATION INSTRUCTIONS:
When your response mentions or relates to a specific section of the platform, always embed navigation tokens at the END of your response in this exact format on its own line:
[NAV:/admin/path|Button Label]
Examples:
[NAV:/admin/employees|View Employees]
[NAV:/admin/leave|Manage Leaves]
[NAV:/admin/payroll|Go to Payroll]
You may embed multiple NAV tokens if relevant. Put them all at the very end.

LIVE DATA INSTRUCTIONS:
When live data is provided below, use it to give precise, data-driven answers referencing actual numbers from the system. Present numbers clearly and in a helpful summary format.

${liveContext ? `CURRENT LIVE DATA FROM NEXORA SYSTEM:\n${liveContext}` : ""}

Always be professional, concise, and helpful. Provide actionable recommendations for HR contexts.`;
}

// ─── Main handler ─────────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  try {
    const { messages } = await req.json();

    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json(
        { error: "Invalid request: messages array required" },
        { status: 400 }
      );
    }

    const apiKey = process.env.CEREBRAS_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "AI service not configured" },
        { status: 500 }
      );
    }

    // Detect intents from the latest user message
    const lastUserMessage = [...messages].reverse().find((m) => m.role === "user")?.content ?? "";
    const intents = detectIntents(lastUserMessage);
    const liveContext = await buildLiveContext(intents);
    const systemPrompt = buildSystemPrompt(liveContext);

    const response = await fetch(CEREBRAS_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: CEREBRAS_MODEL,
        messages: [
          { role: "system", content: systemPrompt },
          ...messages,
        ],
        max_tokens: 1500,
        temperature: 0.7,
        stream: false,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Cerebras API error:", response.status, errorText);
      return NextResponse.json(
        { error: "AI service unavailable. Please try again." },
        { status: 502 }
      );
    }

    const data = await response.json();
    const assistantMessage = data.choices?.[0]?.message?.content ?? "";

    // Also detect nav suggestions from AI-generated response (fallback)
    const navFromContent = detectNav(lastUserMessage + " " + assistantMessage);

    return NextResponse.json({
      message: assistantMessage,
      suggestedNav: navFromContent,
      hadLiveData: intents.length > 0,
    });
  } catch (error) {
    console.error("AI assistant error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
