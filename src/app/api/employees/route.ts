import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import bcrypt from "bcryptjs";

// GET /api/employees -> list all employees
export async function GET() {
  try {
    const employees = await prisma.employee.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        AuditLog: true,
        Document: true,
      },
    });

    return NextResponse.json(employees, { status: 200 });
  } catch (err) {
    console.error("Employees GET error:", err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

// POST /api/employees -> create employee
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const {
      firstName,
      lastName,
      email,
      jobTitle,
      department,
      status,
      joinDate,
      phone,
      location,
      performanceRating,
      skills,
      certifications,
      leaveBalance,
      salary,
      projects,
      feedback,
      documents,
      auditLog,
      password,
    } = body || {};

    if (!firstName || !lastName || !email || !jobTitle || !department) {
      return NextResponse.json(
        { error: "firstName, lastName, email, jobTitle, department are required" },
        { status: 400 }
      );
    }
    if (!password || String(password).length < 6) {
      return NextResponse.json(
        { error: "Password is required (min 6 chars)" },
        { status: 400 }
      );
    }

    const now = new Date();

    const created = await prisma.employee.create({
      data: {
        firstName: String(firstName),
        lastName: String(lastName),
        email: String(email).toLowerCase(),
        jobTitle: String(jobTitle),
        department: String(department),
        status: status ? String(status) : "Active",
        joinDate: joinDate ? new Date(joinDate) : now,
        phone: phone ? String(phone) : null,
        location: location ? String(location) : null,
        performanceRating:
          performanceRating != null ? Number(performanceRating) : null,
        skills: Array.isArray(skills) ? skills.map(String) : [],
        certifications: Array.isArray(certifications)
          ? certifications.map(String)
          : [],
        leaveBalance:
          leaveBalance != null ? Number(leaveBalance) : undefined,
        salary: salary != null ? Number(salary) : null,
        projects: Array.isArray(projects) ? projects.map(String) : [],
        feedback: feedback ? String(feedback) : null,
        updatedAt: now,
        // Nested writes for documents and audit logs if provided
        Document: Array.isArray(documents) && documents.length > 0 ? {
          create: documents.map((d: any) => ({
            name: String(d.name ?? "file"),
            type: String(d.type ?? "file"),
            size: Number(d.size ?? 0),
            base64: d.base64 ? String(d.base64) : null,
            uploadedAt: d.uploadedAt ? new Date(d.uploadedAt) : now,
          })),
        } : undefined,
        AuditLog: {
          create: [
            { action: "Created", by: "Admin", createdAt: now },
            ...(
              Array.isArray(auditLog)
                ? auditLog.map((a: any) => ({
                    action: String(a.action ?? "Created"),
                    by: String(a.by ?? "Admin"),
                    createdAt: a.at ? new Date(a.at) : now,
                  }))
                : []
            ),
          ],
        },
      },
      include: { AuditLog: true, Document: true },
    });

    // Ensure corresponding auth user exists with EMPLOYEE role
    const hashed = await bcrypt.hash(String(password), 10);
    await prisma.user.upsert({
      where: { email: String(email).toLowerCase() },
      update: {
        name: `${String(firstName)} ${String(lastName)}`.trim(),
        role: "EMPLOYEE" as any,
        password: hashed,
      },
      create: {
        email: String(email).toLowerCase(),
        name: `${String(firstName)} ${String(lastName)}`.trim(),
        role: "EMPLOYEE" as any,
        password: hashed,
      },
    });

    return NextResponse.json(created, { status: 201 });
  } catch (err) {
    console.error("Employees POST error:", err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

