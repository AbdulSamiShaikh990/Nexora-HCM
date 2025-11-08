import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET() {
  try {
    const list = await prisma.notification.findMany({ orderBy: { createdAt: "desc" }, take: 200 });
    return NextResponse.json(list, { status: 200 });
  } catch (err) {
    console.error("Notifications GET error:", err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
