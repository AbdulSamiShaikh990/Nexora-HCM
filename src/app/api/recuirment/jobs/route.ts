import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { Prisma } from "@prisma/client";
import { generateQuestionTemplate } from "@/lib/questionTemplates";

function nowISO() {
  return new Date().toISOString();
}

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const status = url.searchParams.get("status"); // open | closed
    const q = (url.searchParams.get("q") || "").toLowerCase();
    
    const where: any = {};
    
    // Filter by status
    if (status === "open" || status === "closed") {
      where.status = status;
    }
    
    // Search in title, department, location, type
    if (q) {
      where.OR = [
        { title: { contains: q, mode: "insensitive" } },
        { department: { contains: q, mode: "insensitive" } },
        { location: { contains: q, mode: "insensitive" } },
        { type: { contains: q, mode: "insensitive" } }
      ];
    }
    
    const jobs = await prisma.job.findMany({
      where,
      orderBy: { createdAt: "desc" },
    });
    
    return NextResponse.json(jobs, { status: 200 });
  } catch (err) {
    console.error("Jobs GET error:", err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const title = String(body?.title || "").trim();
    if (!title) return NextResponse.json({ error: "title is required" }, { status: 400 });

    // basic fields
    let description: string | null = body?.description ? String(body.description) : null;
    const descriptionRich: string | null = body?.descriptionRich ? String(body.descriptionRich) : null;
    const autoTemplate = Boolean(body?.autoTemplate);
    const externalPost = Boolean(body?.externalPost);
    const expiresAt = body?.expiresAt ? new Date(body.expiresAt) : null;

    // Optional auto template for description
    if (autoTemplate && !description) {
      description = `We are seeking a ${title} to join our ${body?.department ? String(body.department) : ""} team.\n\nResponsibilities:\n- Work with cross-functional teams\n- Deliver high-quality outcomes\n\nQualifications:\n- Relevant experience\n- Strong communication skills`;
    }

    // Generate question template based on job role
    const questionTemplate = generateQuestionTemplate(title, description || "");

    // Optional test configuration - use generated template by default
    let test = null as null | {
      enabled: boolean;
      passingPercent: number;
      questions: Array<{ id: string; text: string; type?: string; options?: string[]; correctAnswers?: string[]; category?: string }>;
    };
    
    const testEnabled = Boolean(body?.test?.enabled ?? true); // Default to true
    if (testEnabled) {
      const passing = Number(body?.test?.passingPercent ?? 60);
      
      // Use custom questions if provided, otherwise use generated template
      const questions = Array.isArray(body?.test?.questions) && body.test.questions.length > 0 
        ? body.test.questions.map((q: any) => ({
            id: q?.id ? String(q.id) : crypto.randomUUID(),
            text: String(q?.text || ""),
            type: q?.type || 'text',
            options: Array.isArray(q?.options) ? q.options.map(String) : undefined,
            correctAnswers: Array.isArray(q?.correctAnswers) ? q.correctAnswers.map(String) : [],
            category: q?.category || 'custom'
          })).filter((q: any) => q.text)
        : questionTemplate.map(q => ({
            id: q.id,
            text: q.text,
            type: q.type,
            options: q.options,
            correctAnswers: q.correctAnswers || [],
            category: q.category
          }));
      
      test = { enabled: true, passingPercent: Math.max(0, Math.min(100, passing)), questions };
    }

    const created = await prisma.job.create({
      data: {
        title,
        department: body?.department ? String(body.department) : null,
        location: body?.location ? String(body.location) : null,
        type: body?.type ? String(body.type) : null,
        description,
        descriptionRich,
        expiresAt: expiresAt ?? undefined,
        autoTemplate,
        externalPost,
        status: body?.status === "closed" ? "closed" : "open",
        testEnabled: !!test?.enabled,
        testPassingPercent: test?.enabled ? test.passingPercent : null,
        test: test?.enabled ? (test as any) : Prisma.DbNull,
        questionTemplate: questionTemplate as any,
      },
    });

    if (externalPost) {
      await prisma.notification.create({ 
        data: { 
          type: "job.externalPostStub", 
          payload: { jobId: created.id } 
        } 
      });
    }
    
    return NextResponse.json(created, { status: 201 });
  } catch (err) {
    console.error("Jobs POST error:", err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}