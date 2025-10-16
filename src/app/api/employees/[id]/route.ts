import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

interface DocumentInput {
  name?: string;
  type?: string;
  size?: number;
  base64?: string;
  uploadedAt?: string;
}

interface EmployeeUpdateData {
  firstName?: string;
  lastName?: string;
  email?: string;
  jobTitle?: string;
  department?: string;
  status?: string;
  joinDate?: Date;
  phone?: string | null;
  location?: string | null;
  performanceRating?: number | null;
  skills?: string[];
  certifications?: string[];
  leaveBalance?: number | null;
  salary?: number | null;
  projects?: string[];
  feedback?: string | null;
  updatedAt?: Date;
  Document?: {
    deleteMany: Record<string, never>;
    create: {
      name: string;
      type: string;
      size: number;
      base64: string | null;
      uploadedAt: Date;
    }[];
  };
}

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: idParam } = await params;
    const id = Number(idParam);
    if (!Number.isFinite(id)) return NextResponse.json({ error: "Invalid id" }, { status: 400 });

    const emp = await prisma.employee.findUnique({
      where: { id },
      include: { AuditLog: true, Document: true },
    });
    if (!emp) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json(emp, { status: 200 });
  } catch (err) {
    console.error("Employee GET error:", err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: idParam } = await params;
    const id = Number(idParam);
    if (!Number.isFinite(id)) return NextResponse.json({ error: "Invalid id" }, { status: 400 });
    const body = await req.json();

    const now = new Date();

    const data: EmployeeUpdateData = {};
    if (body.firstName != null) data.firstName = String(body.firstName);
    if (body.lastName != null) data.lastName = String(body.lastName);
    if (body.email != null) data.email = String(body.email).toLowerCase();
    if (body.jobTitle != null) data.jobTitle = String(body.jobTitle);
    if (body.department != null) data.department = String(body.department);
    if (body.status != null) data.status = String(body.status);
    if (body.joinDate != null) data.joinDate = new Date(body.joinDate);
    if (body.phone != null) data.phone = body.phone ? String(body.phone) : null;
    if (body.location != null) data.location = body.location ? String(body.location) : null;
    if (body.performanceRating !== undefined) data.performanceRating = body.performanceRating != null ? Number(body.performanceRating) : null;
    if (body.skills != null) data.skills = Array.isArray(body.skills) ? body.skills.map(String) : [];
    if (body.certifications != null) data.certifications = Array.isArray(body.certifications) ? body.certifications.map(String) : [];
    if (body.leaveBalance !== undefined) data.leaveBalance = body.leaveBalance != null ? Number(body.leaveBalance) : null;
    if (body.salary !== undefined) data.salary = body.salary != null ? Number(body.salary) : null;
    if (body.projects != null) data.projects = Array.isArray(body.projects) ? body.projects.map(String) : [];
    if (body.feedback !== undefined) data.feedback = body.feedback ? String(body.feedback) : null;
    data.updatedAt = now;

    // If documents are provided, replace the current set
    if (Array.isArray(body.documents)) {
      data.Document = {
        deleteMany: {},
        create: body.documents.map((d: DocumentInput) => ({
          name: String(d.name ?? "file"),
          type: String(d.type ?? "file"),
          size: Number(d.size ?? 0),
          base64: d.base64 ? String(d.base64) : null,
          uploadedAt: d.uploadedAt ? new Date(d.uploadedAt) : now,
        })),
      };
    }

    const updated = await prisma.employee.update({
      where: { id },
      data,
      include: { AuditLog: true, Document: true },
    });

    // Append an audit log for update
    await prisma.auditLog.create({
      data: { employeeId: id, action: "Updated", by: "Admin", createdAt: now },
    });

    return NextResponse.json(updated, { status: 200 });
  } catch (err: unknown) {
    const error = err as { code?: string };
    if (error?.code === "P2002") {
      return NextResponse.json({ error: "Email already exists" }, { status: 409 });
    }
    console.error("Employee PATCH error:", err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: idParam } = await params;
    const id = Number(idParam);
    if (!Number.isFinite(id)) return NextResponse.json({ error: "Invalid id" }, { status: 400 });

    // Get employee email before delete
    const emp = await prisma.employee.findUnique({ where: { id }, select: { email: true } });
    if (!emp) return NextResponse.json({ error: "Not found" }, { status: 404 });

    await prisma.employee.delete({ where: { id } });

    // Best-effort delete corresponding auth user (role EMPLOYEE) by email
    if (emp.email) {
      try {
        await prisma.user.delete({ where: { email: emp.email.toLowerCase() } });
      } catch (e: unknown) {
        // ignore if user does not exist
        const error = e as { code?: string };
        if (error?.code !== "P2025") throw e;
      }
    }

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (err: unknown) {
    const error = err as { code?: string };
    if (error?.code === "P2025") {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    console.error("Employee DELETE error:", err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
