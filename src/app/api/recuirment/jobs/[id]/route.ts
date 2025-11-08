import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(_: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await ctx.params;
    const job = await prisma.job.findUnique({ where: { id: Number(id) } });
    if (!job) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json(job, { status: 200 });
  } catch (err) {
    console.error("Job GET error:", err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await ctx.params;
    const body = await req.json();
    const data: any = {};
    if (body.title != null) data.title = String(body.title);
    if (body.department !== undefined) data.department = body.department ? String(body.department) : null;
    if (body.location !== undefined) data.location = body.location ? String(body.location) : null;
    if (body.type !== undefined) data.type = body.type ? String(body.type) : null;
    if (body.description !== undefined) data.description = body.description ? String(body.description) : null;
    if (body.descriptionRich !== undefined) data.descriptionRich = body.descriptionRich ? String(body.descriptionRich) : null;
    if (body.expiresAt !== undefined) data.expiresAt = body.expiresAt ? new Date(body.expiresAt) : null;
    if (body.status === "open" || body.status === "closed") data.status = body.status;
    const updated = await prisma.job.update({ where: { id: Number(id) }, data });
    return NextResponse.json(updated, { status: 200 });
  } catch (err) {
    console.error("Job PATCH error:", err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function DELETE(_: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await ctx.params;
    await prisma.job.delete({ where: { id: Number(id) } });
    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (err) {
    console.error("Job DELETE error:", err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
