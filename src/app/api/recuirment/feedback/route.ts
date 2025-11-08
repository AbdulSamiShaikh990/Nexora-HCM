import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

function analyzeSentiment(text: string) {
  const positive = ["great","good","excellent","strong","impressive","fit","positive","outstanding"];
  const negative = ["poor","bad","weak","concern","negative","lack","insufficient"];
  const t = text.toLowerCase();
  let score = 0;
  for (const w of positive) if (t.includes(w)) score += 1;
  for (const w of negative) if (t.includes(w)) score -= 1;
  const label = score > 0 ? "positive" : score < 0 ? "negative" : "neutral" as const;
  return { score, label };
}

export async function GET() {
  try {
    const list = await prisma.feedback.findMany({ orderBy: { createdAt: "desc" } });
    return NextResponse.json(list, { status: 200 });
  } catch (err) {
    console.error("Feedback GET error:", err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const applicationId = Number(String(body?.applicationId || "").trim());
    const by = String(body?.by || "Admin");
    const text = String(body?.text || "").trim();
    if (!applicationId || !text) return NextResponse.json({ error: "applicationId and text are required" }, { status: 400 });

    const sentiment = analyzeSentiment(text);
    const item = await prisma.feedback.create({
      data: {
        applicationId,
        by,
        text,
        sentimentScore: sentiment.score,
        sentimentLabel: sentiment.label,
      },
    });
    return NextResponse.json(item, { status: 201 });
  } catch (err) {
    console.error("Feedback POST error:", err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
