import { NextResponse } from "next/server";

// Simple heuristic parser for resume text or base64 .txt/.md content
function extract(text: string) {
  const lower = text.toLowerCase();
  const skillsList = [
    "javascript","typescript","react","next","node","express","postgres","prisma","tailwind",
    "python","django","flask","java","spring","aws","gcp","azure","docker","kubernetes"
  ];
  const skills = Array.from(new Set(skillsList.filter(s => lower.includes(s))));
  const yearsMatch = text.match(/(\d+)[+]?\s*(years|yrs)/i);
  const yearsOfExperience = yearsMatch ? Number(yearsMatch[1]) : undefined;
  const emailMatch = text.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/ig);
  const phoneMatch = text.match(/\+?\d[\d\s\-]{7,}\d/);
  return {
    skills,
    yearsOfExperience,
    email: emailMatch?.[0] || null,
    phone: phoneMatch?.[0] || null,
    summary: text.slice(0, 500)
  };
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    let text = String(body?.text || "");
    if (!text && body?.base64) {
      try {
        const buf = Buffer.from(String(body.base64), 'base64');
        text = buf.toString('utf8');
      } catch {}
    }
    if (!text) return NextResponse.json({ error: "Provide text or base64" }, { status: 400 });
    const parsed = extract(text);
    return NextResponse.json(parsed, { status: 200 });
  } catch (err) {
    console.error("Resume parse error:", err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
