import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

// GET /api/employees/list - Fetch all employees for dropdowns/filters
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const active = searchParams.get("active"); // filter by status

    const where: any = {};
    if (active === "true") where.status = "Active";

    const employees = await prisma.employee.findMany({
      where,
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        department: true,
        jobTitle: true,
        status: true,
        leaveBalance: true,
      },
      orderBy: { firstName: "asc" },
    });

    // Also get unique departments
    const departments = [...new Set(employees.map((e) => e.department))].sort();

    return NextResponse.json({
      employees: employees.map((e) => ({
        id: e.id,
        name: `${e.firstName} ${e.lastName}`,
        email: e.email,
        department: e.department,
        jobTitle: e.jobTitle,
        status: e.status,
        leaveBalance: e.leaveBalance ?? 0,
      })),
      departments,
    });
  } catch (e: any) {
    console.error("[Employees List API Error]", e);
    return NextResponse.json({ error: e.message || "Internal Server Error" }, { status: 500 });
  }
}
