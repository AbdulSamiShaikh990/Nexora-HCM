import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(_: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await ctx.params;
    const app = await prisma.application.findUnique({ where: { id: Number(id) } });
    if (!app) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json(app, { status: 200 });
  } catch (err) {
    console.error("Application GET error:", err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await ctx.params;
    const body = await req.json();
    const data: any = {};
    if (body.jobId != null) data.jobId = Number(body.jobId);
    if (body.candidateId != null) data.candidateId = Number(body.candidateId);
    if (["applied","screening","interview","offer","hired","rejected"].includes(body?.stage)) data.stage = String(body.stage);
    if (body.notes !== undefined) data.notes = body.notes ? String(body.notes) : null;
    const updated = await prisma.application.update({ where: { id: Number(id) }, data });
    return NextResponse.json(updated, { status: 200 });
  } catch (err) {
    console.error("Application PATCH error:", err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function DELETE(_: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await ctx.params;
    await prisma.application.delete({ where: { id: Number(id) } });
    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (err) {
    console.error("Application DELETE error:", err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
