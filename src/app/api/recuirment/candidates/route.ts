import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

function nowISO() { return new Date().toISOString(); }

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const q = (url.searchParams.get("q") || "").toLowerCase();
    const where: any = {};
    if (q) {
      where.OR = [
        { name: { contains: q, mode: "insensitive" } },
        { email: { contains: q, mode: "insensitive" } },
      ];
    }
    const list = await prisma.candidate.findMany({ where, orderBy: { createdAt: "desc" } });
    return NextResponse.json(list, { status: 200 });
  } catch (err) {
    console.error("Candidates GET error:", err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const name = String(body?.name || "").trim();
    if (!name) return NextResponse.json({ error: "name is required" }, { status: 400 });
    const created = await prisma.candidate.create({
      data: {
        name,
        email: body?.email ? String(body.email).toLowerCase() : null,
        phone: body?.phone ? String(body.phone) : null,
        skills: Array.isArray(body?.skills) ? body.skills.map(String) : [],
      },
    });
    return NextResponse.json(created, { status: 201 });
  } catch (err) {
    console.error("Candidates POST error:", err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
