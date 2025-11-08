import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET() {
  try {
    const STAGES = ["applied","screening","interview","offer","hired","rejected"] as const;

    const counts = await prisma.application.groupBy({ by: ["stage"], _count: { stage: true } });
    const byStage: Record<string, number> = Object.fromEntries(STAGES.map(s => [s, 0]));
    for (const c of counts) byStage[c.stage] = c._count.stage;

    const total = await prisma.application.count();
    const interviews = byStage["interview"] || 0;
    const offers = byStage["offer"] || 0;
    const hires = byStage["hired"] || 0;
    const offerToHireRatio = offers > 0 ? +(hires / offers * 100).toFixed(1) : 0;

    const pipelineStages = ["applied","screening","interview","offer"] as const;
    let bottleneck: string | null = null;
    let max = -1;
    for (const s of pipelineStages) {
      const v = byStage[s] || 0;
      if (v > max) { max = v; bottleneck = s; }
    }

    return NextResponse.json({ total, byStage, interviews, offers, hires, offerToHireRatio, bottleneck }, { status: 200 });
  } catch (err) {
    console.error("Analytics GET error:", err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
