import { NextResponse } from "next/server";

// Mock QuickBooks sync endpoint
// POST /api/payroll/quickbooks body: { period?: string, runId?: number }
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const period = body?.period ?? "current";
    // Here you would call QuickBooks API to create journal entries
    return NextResponse.json({ success: true, message: `Queued QuickBooks sync for ${period}` }, { status: 200 });
  } catch (err) {
    console.error("QuickBooks POST error", err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
