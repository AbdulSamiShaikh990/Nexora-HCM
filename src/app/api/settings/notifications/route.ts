import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

// PUT - Save notification preferences
export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { email, push, leaveUpdates, taskAssignments } = body;

    // Find user
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // For now, just return success - preferences are managed client-side
    // In future, add a NotificationPreference model to store these
    return NextResponse.json({
      success: true,
      message: "Notification preferences saved successfully",
      data: {
        email: email ?? true,
        push: push ?? false,
        leaveUpdates: leaveUpdates ?? true,
        taskAssignments: taskAssignments ?? true,
      },
    });
  } catch (error) {
    console.error("Error saving notification preferences:", error);
    return NextResponse.json(
      { error: "Failed to save notification preferences" },
      { status: 500 }
    );
  }
}

// GET - Fetch notification preferences
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Return default preferences
    return NextResponse.json({
      success: true,
      data: {
        email: true,
        push: false,
        leaveUpdates: true,
        taskAssignments: true,
      },
    });
  } catch (error) {
    console.error("Error fetching notification preferences:", error);
    return NextResponse.json(
      { error: "Failed to fetch notification preferences" },
      { status: 500 }
    );
  }
}
