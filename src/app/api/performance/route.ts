import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

// Minimal API: compute KPIs and trend from single Performance table

// GET /api/performance -> search employees OR get employee performance bundle
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const query = searchParams.get("query")?.trim();
    const employeeId = searchParams.get("employeeId");

    // Search employees by name or ID
    if (query) {
      const employees = await prisma.employee.findMany({
        where: {
          OR: [
            { firstName: { contains: query, mode: "insensitive" } },
            { lastName: { contains: query, mode: "insensitive" } },
            { id: isNaN(Number(query)) ? undefined : Number(query) },
          ],
        },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          department: true,
          email: true,
        },
        take: 10,
      });

      return NextResponse.json({ employees });
    }

    // Get performance bundle for specific employee
    if (employeeId) {
      const empId = Number(employeeId);
      // Fetch last 12 months performance rows (ascending by period)
      const rows = await (prisma as any).performance.findMany({
        where: { employeeId: empId },
        orderBy: [{ periodYear: "asc" }, { periodMonth: "asc" }],
        take: 12,
      });

      const trend = rows.map((r: any) => ({
        month: new Date(r.periodYear, r.periodMonth - 1).toLocaleString("default", {
          month: "short",
        }),
        score: r.score,
      }));

      const latest = rows.length > 0 ? rows[rows.length - 1] : null;
      const prev = rows.length > 1 ? rows[rows.length - 2] : null;
      const delta = latest && prev ? latest.score - prev.score : 0;

      return NextResponse.json({
        kpis: {
          score: latest?.score ?? 0,
          delta,
          okrs: 0,
          okrText: "",
          feedback: 0,
          readiness: 0,
        },
        trend,
        skills: [],
        okrs: [],
        alerts: [],
      });
    }

    // Default: return empty
    return NextResponse.json({ employees: [] });
  } catch (err) {
    console.error("Performance GET error:", err);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}

// POST /api/performance -> create performance snapshot, feedback, or OKR
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { type, ...data } = body;

    if (type === "snapshot") {
      const snapshot = await (prisma as any).performance.create({
        data: {
          employeeId: data.employeeId,
          periodYear: data.periodYear,
          periodMonth: data.periodMonth,
          score: data.score,
        },
      });
      return NextResponse.json({ snapshot }, { status: 201 });
    }

    return NextResponse.json({ error: "Only 'snapshot' is supported" }, { status: 400 });
  } catch (err) {
    console.error("Performance POST error:", err);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}

// PATCH /api/performance -> update OKR progress/status
export async function PATCH(req: Request) {
  return NextResponse.json({ error: "Not supported" }, { status: 400 });
}