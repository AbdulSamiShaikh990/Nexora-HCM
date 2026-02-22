/* eslint-disable @typescript-eslint/no-explicit-any */
// cspell:ignore CEREBRAS Nexora NEXORA
import dns from "node:dns";
dns.setDefaultResultOrder("ipv4first");

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

const CEREBRAS_API_URL = "https://api.cerebras.ai/v1/chat/completions";
const CEREBRAS_MODEL = "llama3.1-8b";

// ─── Navigation registry (employee sections) ─────────────────────────────────
const NAV_SECTIONS = [
  { path: "/employee/dashboard",   label: "Dashboard",    keywords: ["dashboard", "home", "overview", "summary"] },
  { path: "/employee/attendance",  label: "Attendance",   keywords: ["attendance", "check-in", "check-out", "present", "absent", "late", "clock", "time"] },
  { path: "/employee/leave",       label: "Leaves",       keywords: ["leave", "leaves", "vacation", "sick", "time off", "absence", "annual"] },
  { path: "/employee/payroll",     label: "Payroll",      keywords: ["payroll", "salary", "pay", "payslip", "wage", "compensation", "net pay"] },
  { path: "/employee/performance", label: "Performance",  keywords: ["performance", "review", "rating", "goal", "okr", "kpi", "appraisal", "score"] },
  { path: "/employee/task",        label: "Tasks",        keywords: ["task", "tasks", "todo", "assignment", "work", "project"] },
  { path: "/employee/reports",     label: "Reports",      keywords: ["report", "reports", "history", "record", "export"] },
  { path: "/employee/sentiment",   label: "Sentiment",    keywords: ["sentiment", "mood", "wellbeing", "feedback", "satisfaction"] },
  { path: "/employee/settings",    label: "Settings",     keywords: ["setting", "settings", "profile", "password", "account", "config"] },
];

function detectNav(text: string): { path: string; label: string }[] {
  const lower = text.toLowerCase();
  const matched: { path: string; label: string }[] = [];
  const seen = new Set<string>();
  for (const s of NAV_SECTIONS) {
    if (s.keywords.some((k) => lower.includes(k)) && !seen.has(s.path)) {
      seen.add(s.path);
      matched.push({ path: s.path, label: s.label });
    }
  }
  return matched;
}

// ─── Intent detection ────────────────────────────────────────────────────────
function detectIntents(text: string): string[] {
  const lower = text.toLowerCase();
  const intents: string[] = [];
  if (/attendance|check.?in|present|absent|late|clock/.test(lower)) intents.push("attendance");
  if (/leave|vacation|sick|time.?off|absence|balance/.test(lower))   intents.push("leave");
  if (/payroll|salary|pay|wage|payslip|net.?pay/.test(lower))        intents.push("payroll");
  if (/performance|rating|review|goal|okr|kpi|score/.test(lower))    intents.push("performance");
  if (/task|tasks|todo|assignment|due/.test(lower))                   intents.push("tasks");
  return intents;
}

// ─── Employee data fetchers ───────────────────────────────────────────────────
async function fetchMyAttendance(employeeId: number) {
  try {
    const today = new Date();
    const thirtyDaysAgo = new Date(today);
    thirtyDaysAgo.setDate(today.getDate() - 30);

    const records = await prisma.attendance.findMany({
      where: { employeeId, date: { gte: thirtyDaysAgo } },
      orderBy: { date: "desc" },
      take: 30,
    });

    const present = records.filter((r) => r.status === "Present").length;
    const late    = records.filter((r) => r.status === "Late").length;
    const absent  = records.filter((r) => r.status === "Absent").length;
    const todayRec = records.find(
      (r) => new Date(r.date).toDateString() === today.toDateString()
    );

    return {
      last30Days: { present, late, absent, total: records.length },
      todayStatus: todayRec?.status ?? "Not recorded",
      checkedInToday: !!todayRec?.checkIn,
      checkedOutToday: !!todayRec?.checkOut,
    };
  } catch { return null; }
}

async function fetchMyLeaves(employeeId: number) {
  try {
    const leaves = await prisma.leave.findMany({
      where: { employeeId },
      orderBy: { startDate: "desc" },
      take: 20,
    });

    const emp = await prisma.employee.findUnique({
      where: { id: employeeId },
      select: { leaveBalance: true },
    });

    const pending  = leaves.filter((l) => l.status === "Pending").length;
    const approved = leaves.filter((l) => l.status === "Approved").length;
    const rejected = leaves.filter((l) => l.status === "Rejected").length;
    const recent   = leaves.slice(0, 3).map((l) => ({
      type: l.type,
      status: l.status,
      from: l.startDate.toISOString().split("T")[0],
      to:   l.endDate.toISOString().split("T")[0],
    }));

    return {
      balance: emp?.leaveBalance ?? 0,
      total: leaves.length,
      pending,
      approved,
      rejected,
      recent,
    };
  } catch { return null; }
}

async function fetchMyPayroll(employeeId: number) {
  try {
    const records = await prisma.payrollRecord.findMany({
      where: { employeeId },
      orderBy: [{ periodYear: "desc" }, { periodMonth: "desc" }],
      take: 6,
    });

    if (!records.length) return null;

    const latest = records[0];
    const totalPaid = records
      .filter((r) => r.status === "Processed")
      .reduce((s, r) => s + r.netPay, 0);

    return {
      latestMonth: `${latest.periodYear}-${String(latest.periodMonth).padStart(2, "0")}`,
      latestNetPay: latest.netPay,
      latestStatus: latest.status,
      baseSalary: latest.baseSalary,
      bonus: latest.bonus,
      deductions: latest.deductions,
      totalPaidLast6Months: Math.round(totalPaid),
    };
  } catch { return null; }
}

async function fetchMyPerformance(employeeId: number) {
  try {
    const rows = await (prisma as any).performance.findMany({
      where: { employeeId },
      orderBy: [{ periodYear: "desc" }, { periodMonth: "desc" }],
      take: 6,
    });

    if (!rows.length) return null;

    const latest = rows[0];
    const avg = rows.reduce((s: number, r: any) => s + r.score, 0) / rows.length;

    return {
      latestScore: latest.score,
      averageScore: Math.round(avg * 10) / 10,
      trend: rows.map((r: any) => ({
        month: `${r.periodYear}-${String(r.periodMonth).padStart(2, "0")}`,
        score: r.score,
      })).reverse(),
    };
  } catch { return null; }
}

async function fetchMyTasks(employeeId: number) {
  try {
    const tasks = await prisma.task.findMany({
      where: { assignedToId: employeeId },
      orderBy: { dueDate: "asc" },
      take: 20,
    });

    const todo       = tasks.filter((t) => t.status === "TODO").length;
    const inProgress = tasks.filter((t) => t.status === "IN_PROGRESS").length;
    const done       = tasks.filter((t) => t.status === "DONE").length;
    const overdue    = tasks.filter((t) => t.dueDate && new Date(t.dueDate) < new Date() && t.status !== "DONE").length;

    const upcoming = tasks
      .filter((t) => t.status !== "DONE" && t.dueDate)
      .slice(0, 3)
      .map((t) => ({
        title: t.title,
        priority: t.priority,
        dueDate: t.dueDate?.toISOString().split("T")[0],
        status: t.status,
      }));

    return { total: tasks.length, todo, inProgress, done, overdue, upcoming };
  } catch { return null; }
}

// ─── Build live context ───────────────────────────────────────────────────────
async function buildLiveContext(employeeId: number, intents: string[], employeeName: string): Promise<string> {
  const parts: string[] = [];
  parts.push(`[EMPLOYEE] ${employeeName} (ID: ${employeeId})`);

  await Promise.all(
    intents.map(async (intent) => {
      switch (intent) {
        case "attendance": {
          const d = await fetchMyAttendance(employeeId);
          if (d) parts.push(
            `[MY ATTENDANCE]\nToday: ${d.todayStatus} | Checked in: ${d.checkedInToday ? "Yes" : "No"} | Checked out: ${d.checkedOutToday ? "Yes" : "No"}\nLast 30 days → Present: ${d.last30Days.present} | Late: ${d.last30Days.late} | Absent: ${d.last30Days.absent}`
          );
          break;
        }
        case "leave": {
          const d = await fetchMyLeaves(employeeId);
          if (d) parts.push(
            `[MY LEAVE DATA]\nBalance: ${d.balance} days | Total Requests: ${d.total}\nApproved: ${d.approved} | Pending: ${d.pending} | Rejected: ${d.rejected}\nRecent: ${d.recent.map((l) => `${l.type}(${l.status}) ${l.from}→${l.to}`).join(", ")}`
          );
          break;
        }
        case "payroll": {
          const d = await fetchMyPayroll(employeeId);
          if (d) parts.push(
            `[MY PAYROLL]\nLatest: ${d.latestMonth} | Net Pay: ${d.latestNetPay} | Status: ${d.latestStatus}\nBase: ${d.baseSalary} | Bonus: ${d.bonus} | Deductions: ${d.deductions}\nTotal paid last 6 months: ${d.totalPaidLast6Months}`
          );
          break;
        }
        case "performance": {
          const d = await fetchMyPerformance(employeeId);
          if (d) parts.push(
            `[MY PERFORMANCE]\nLatest Score: ${d.latestScore}/10 | Average: ${d.averageScore}/10\nTrend: ${d.trend.map((t: any) => `${t.month}:${t.score}`).join(", ")}`
          );
          break;
        }
        case "tasks": {
          const d = await fetchMyTasks(employeeId);
          if (d) parts.push(
            `[MY TASKS]\nTotal: ${d.total} | To Do: ${d.todo} | In Progress: ${d.inProgress} | Done: ${d.done} | Overdue: ${d.overdue}\nUpcoming: ${d.upcoming.map((t) => `"${t.title}"(${t.priority}, due ${t.dueDate})`).join(", ")}`
          );
          break;
        }
      }
    })
  );

  return parts.join("\n\n");
}

// ─── System prompt ────────────────────────────────────────────────────────────
function buildSystemPrompt(liveContext: string, employeeName: string): string {
  return `You are Nexora AI, a personal HR assistant for ${employeeName} on the Nexora HCM platform. Help the employee with questions about their own attendance, leaves, payroll, performance, tasks, and general workplace guidance.

NAVIGATION INSTRUCTIONS:
When your response relates to a specific section, embed navigation tokens at the END in this exact format:
[NAV:/employee/path|Button Label]
Examples: [NAV:/employee/leave|View My Leaves] [NAV:/employee/attendance|My Attendance]
Put all NAV tokens on the last line only.

LIVE DATA INSTRUCTIONS:
Use the live data below to give precise, personal answers referencing the employee's actual numbers.

${liveContext ? `LIVE DATA FOR ${employeeName.toUpperCase()}:\n${liveContext}` : ""}

Be warm, supportive, and concise. This is the employee's personal assistant — use "you/your" not third-person.`;
}

// ─── Main handler ─────────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { messages } = await req.json();
    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json({ error: "Invalid request: messages array required" }, { status: 400 });
    }

    const apiKey = process.env.CEREBRAS_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "AI service not configured" }, { status: 500 });
    }

    // Get the logged-in employee record — fall back gracefully if DB is unreachable
    let employee: { id: number; firstName: string; lastName: string; department: string | null } | null = null;
    try {
      employee = await prisma.employee.findUnique({
        where: { email: session.user.email },
        select: { id: true, firstName: true, lastName: true, department: true },
      });
    } catch (dbErr) {
      console.warn("DB unreachable, falling back to session name:", dbErr);
    }

    // Derive name: DB record → session name → email prefix
    const employeeName =
      employee
        ? `${employee.firstName} ${employee.lastName}`
        : (session.user.name ?? session.user.email?.split("@")[0] ?? "Employee");

    const lastUserMessage = [...messages].reverse().find((m) => m.role === "user")?.content ?? "";
    const intents = employee ? detectIntents(lastUserMessage) : [];
    const liveContext = employee
      ? await buildLiveContext(employee.id, intents, employeeName)
      : "";
    const systemPrompt = buildSystemPrompt(liveContext, employeeName);

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
        max_tokens: 1024,
        temperature: 0.7,
        stream: false,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Cerebras API error:", response.status, errorText);
      return NextResponse.json({ error: "AI service unavailable. Please try again." }, { status: 502 });
    }

    const data = await response.json();
    const assistantMessage = data.choices?.[0]?.message?.content ?? "";
    const navFromContent = detectNav(lastUserMessage + " " + assistantMessage);

    return NextResponse.json({
      message: assistantMessage,
      suggestedNav: navFromContent,
      hadLiveData: intents.length > 0 && !!employee,
      employeeName,
    });
  } catch (error) {
    console.error("Employee AI assistant error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
