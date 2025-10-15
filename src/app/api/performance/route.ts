import { NextResponse } from "next/server";

// GET /api/performance -> list performance records
export async function GET() {
  try {
    // TODO: Implement performance fetching logic
    return NextResponse.json([], { status: 200 });
  } catch (err) {
    console.error("Performance GET error:", err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

// POST /api/performance -> create performance record
export async function POST(req: Request) {
  try {
    const body = await req.json();
    // TODO: Implement performance creation logic
    console.log("Performance data:", body);
    return NextResponse.json({ success: true }, { status: 201 });
  } catch (err) {
    console.error("Performance POST error:", err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}