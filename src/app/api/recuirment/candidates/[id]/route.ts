import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(_: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await ctx.params;
    const cand = await prisma.candidate.findUnique({ where: { id: Number(id) } });
    if (!cand) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json(cand, { status: 200 });
  } catch (err) {
    console.error("Candidate GET error:", err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await ctx.params;
    const body = await req.json();
    const data: any = {};
    if (body.name != null) data.name = String(body.name);
    if (body.email !== undefined) data.email = body.email ? String(body.email).toLowerCase() : null;
    if (body.phone !== undefined) data.phone = body.phone ? String(body.phone) : null;
    if (body.skills != null) data.skills = Array.isArray(body.skills) ? body.skills.map(String) : [];
    const updated = await prisma.candidate.update({ where: { id: Number(id) }, data });
    return NextResponse.json(updated, { status: 200 });
  } catch (err) {
    console.error("Candidate PATCH error:", err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function DELETE(_: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await ctx.params;
    await prisma.candidate.delete({ where: { id: Number(id) } });
    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (err) {
    console.error("Candidate DELETE error:", err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
