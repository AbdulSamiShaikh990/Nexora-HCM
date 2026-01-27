import { NextResponse } from "next/server";

// Lightweight PDF placeholder generator (no external deps)
function buildPdfPlaceholder(name: string, net: number, period?: string) {
  const payload = `Payslip\nEmployee: ${name}\nNet Pay: ${net}\nPeriod: ${period ?? "N/A"}\nGenerated: ${new Date().toISOString()}`;
  const base64 = Buffer.from(payload, "utf-8").toString("base64");
  return `data:application/pdf;base64,${base64}`;
}

// POST /api/payroll/payslips
// body: { records: [{ employeeName, netPay, period }] }
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const records: Array<{ employeeName: string; netPay: number; period?: string }> = body?.records ?? [];
    if (!Array.isArray(records) || records.length === 0) {
      return NextResponse.json({ error: "No records provided" }, { status: 400 });
    }
    const slips = records.map((r) => ({
      employeeName: r.employeeName,
      period: r.period ?? "",
      pdfUrl: buildPdfPlaceholder(r.employeeName, Number(r.netPay ?? 0), r.period),
    }));
    // In production, email via SMTP/provider and store audit trail
    return NextResponse.json({ success: true, slips }, { status: 200 });
  } catch (err) {
    console.error("Payslips POST error", err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
