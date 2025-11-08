import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

const ALLOWED: Array<"applied" | "screening" | "interview" | "hired" | "rejected"> = [
  "applied",
  "screening",
  "interview",
  "hired",
  "rejected",
];

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await ctx.params;
    const body = await req.json().catch(() => ({}));
    const stage = String(body?.stage || "").toLowerCase();
    if (!ALLOWED.includes(stage as any)) {
      return NextResponse.json({ error: "Invalid stage" }, { status: 400 });
    }
    const updated = await prisma.application.update({ where: { id: Number(id) }, data: { stage } });
    await prisma.notification.create({ data: { type: "application.stageChanged", payload: { applicationId: Number(id), stage } } });
    return NextResponse.json(updated, { status: 200 });
  } catch (err) {
    console.error("Stage PATCH error:", err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
