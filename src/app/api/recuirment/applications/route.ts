import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
function nowISO() { return new Date().toISOString(); }

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const stage = url.searchParams.get("stage");
    const jobId = url.searchParams.get("jobId");
    const candidateId = url.searchParams.get("candidateId");
    const q = (url.searchParams.get("q") || "").toLowerCase();
    const where: any = {};
    if (stage) where.stage = stage;
    if (jobId) where.jobId = Number(jobId);
    if (candidateId) where.candidateId = Number(candidateId);
    if (q) where.notes = { contains: q, mode: "insensitive" };
    const list = await prisma.application.findMany({
      where,
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json(list, { status: 200 });
  } catch (err) {
    console.error("Applications GET error:", err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const jobIdRaw = String(body?.jobId || "").trim();
    const candidateIdRaw = String(body?.candidateId || "").trim();
    if (!jobIdRaw || !candidateIdRaw) {
      return NextResponse.json({ error: "jobId and candidateId are required" }, { status: 400 });
    }
    const jobId = Number(jobIdRaw);
    const candidateId = Number(candidateIdRaw);
    const job = await prisma.job.findUnique({ where: { id: jobId } });
    if (!job) return NextResponse.json({ error: "job not found" }, { status: 404 });
    if (job.status === "closed") {
      return NextResponse.json({ error: "Job is closed. Applications are not allowed." }, { status: 400 });
    }
    if (job.expiresAt && new Date(job.expiresAt) < new Date()) {
      return NextResponse.json({ error: "Job has expired. Applications are not allowed." }, { status: 400 });
    }

    let stage: string = String(body?.stage || "applied");
    let scorePercent: number | undefined = undefined;
    let passed: boolean | undefined = undefined;
    const answers: Array<{ questionId: string; answer: string | string[] }> = Array.isArray(body?.answers)
      ? body.answers.map((a: any) => ({ questionId: String(a?.questionId || ""), answer: Array.isArray(a?.answer) ? a.answer.map(String) : String(a?.answer ?? "") }))
      : [];

    const test = job.testEnabled ? (job.test as any) : null;
    if (test?.enabled && Array.isArray(test.questions) && test.questions.length > 0) {
      const total = test.questions.length;
      let correct = 0;
      for (const q of test.questions) {
        const given = answers.find(a => a.questionId === q.id);
        const givenAns = given ? given.answer : "";
        const givenSet = Array.isArray(givenAns) ? new Set(givenAns.map(String)) : new Set([String(givenAns)]);
        const correctSet = new Set((q.correctAnswers || []).map(String));
        if (givenSet.size === correctSet.size && [...givenSet].every(x => correctSet.has(x))) {
          correct += 1;
        }
      }
      scorePercent = total > 0 ? Math.round((correct / total) * 100) : 0;
      passed = scorePercent >= (job.testPassingPercent ?? 60);
      if (!passed) stage = "rejected";
    }

    const created = await prisma.application.create({
      data: {
        jobId,
        candidateId,
        stage,
        notes: body?.notes ? String(body.notes) : null,
        scorePercent,
        passed,
        answers: answers.length ? (answers as any) : null,
      },
    });
    return NextResponse.json(created, { status: 201 });
  } catch (err) {
    console.error("Applications POST error:", err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
