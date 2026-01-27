import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

// GET: Fetch cycles, goals, or reviews based on ?type= param
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const employee = await prisma.employee.findUnique({
      where: { email: session.user.email },
    });

    if (!employee) {
      return NextResponse.json({ error: "Employee not found" }, { status: 404 });
    }

    const { searchParams } = new URL(req.url);
    const type = searchParams.get("type"); // cycles | goals | reviews
    const cycleId = searchParams.get("cycleId");

    // --- CYCLES ---
    if (type === "cycles") {
      const all = searchParams.get("all") === "true";
      if (all) {
        const cycles = await prisma.reviewCycle.findMany({ orderBy: { startDate: "desc" } });
        return NextResponse.json(cycles);
      }
      // Active cycle only
      const activeCycle = await prisma.reviewCycle.findFirst({
        where: { status: "OPEN" },
        orderBy: { startDate: "desc" },
      });
      return NextResponse.json(activeCycle);
    }

    // --- GOALS ---
    if (type === "goals") {
      const where: any = { employeeId: employee.id };
      if (cycleId) where.cycleId = parseInt(cycleId);

      const goals = await prisma.performanceGoal.findMany({
        where,
        include: { cycle: { select: { id: true, name: true, status: true } } },
        orderBy: { createdAt: "desc" },
      });
      return NextResponse.json(goals);
    }

    // --- REVIEWS ---
    if (type === "reviews") {
      const where: any = { employeeId: employee.id };
      if (cycleId) where.cycleId = parseInt(cycleId);

      const reviews = await prisma.performanceReview.findMany({
        where,
        include: { cycle: { select: { id: true, name: true, status: true, startDate: true, endDate: true } } },
        orderBy: { createdAt: "desc" },
      });
      return NextResponse.json(reviews);
    }

    return NextResponse.json({ error: "Invalid type. Use ?type=cycles|goals|reviews" }, { status: 400 });
  } catch (error) {
    console.error("GET /api/performance/employee error:", error);
    return NextResponse.json({ error: "Failed to fetch data" }, { status: 500 });
  }
}

// POST: Create goal or start review based on ?type= param
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const employee = await prisma.employee.findUnique({
      where: { email: session.user.email },
    });

    if (!employee) {
      return NextResponse.json({ error: "Employee not found" }, { status: 404 });
    }

    const { searchParams } = new URL(req.url);
    const type = searchParams.get("type"); // goals | reviews
    const body = await req.json();

    // --- CREATE GOAL ---
    if (type === "goals") {
      const { cycleId, title, description } = body;

      if (!cycleId || !title) {
        return NextResponse.json({ error: "cycleId and title are required" }, { status: 400 });
      }

      const cycle = await prisma.reviewCycle.findUnique({ where: { id: cycleId } });
      if (!cycle) return NextResponse.json({ error: "Cycle not found" }, { status: 404 });
      if (cycle.status !== "OPEN") {
        return NextResponse.json({ error: "Cannot add goals - cycle is not open" }, { status: 400 });
      }

      const goal = await prisma.performanceGoal.create({
        data: {
          employeeId: employee.id,
          cycleId,
          title,
          description: description || null,
          progress: 0,
          status: "NOT_STARTED",
        },
        include: { cycle: { select: { id: true, name: true, status: true } } },
      });

      return NextResponse.json(goal, { status: 201 });
    }

    // --- START REVIEW ---
    if (type === "reviews") {
      const { cycleId } = body;

      if (!cycleId) {
        return NextResponse.json({ error: "cycleId is required" }, { status: 400 });
      }

      const cycle = await prisma.reviewCycle.findUnique({ where: { id: cycleId } });
      if (!cycle) return NextResponse.json({ error: "Cycle not found" }, { status: 404 });
      if (cycle.status !== "OPEN") {
        return NextResponse.json({ error: "Cannot start review - cycle is not open" }, { status: 400 });
      }

      // Check existing
      const existing = await prisma.performanceReview.findUnique({
        where: { employeeId_cycleId: { employeeId: employee.id, cycleId } },
      });

      if (existing) {
        return NextResponse.json(existing);
      }

      const review = await prisma.performanceReview.create({
        data: { employeeId: employee.id, cycleId, status: "DRAFT" },
        include: { cycle: { select: { id: true, name: true, status: true } } },
      });

      return NextResponse.json(review, { status: 201 });
    }

    return NextResponse.json({ error: "Invalid type. Use ?type=goals|reviews" }, { status: 400 });
  } catch (error) {
    console.error("POST /api/performance/employee error:", error);
    return NextResponse.json({ error: "Failed to create" }, { status: 500 });
  }
}

// PATCH: Update goal or review
export async function PATCH(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const employee = await prisma.employee.findUnique({
      where: { email: session.user.email },
    });

    if (!employee) {
      return NextResponse.json({ error: "Employee not found" }, { status: 404 });
    }

    const { searchParams } = new URL(req.url);
    const type = searchParams.get("type"); // goals | reviews
    const body = await req.json();

    // --- UPDATE GOAL ---
    if (type === "goals") {
      const { id, title, description, progress, status } = body;

      if (!id) return NextResponse.json({ error: "Goal id is required" }, { status: 400 });

      const existingGoal = await prisma.performanceGoal.findFirst({
        where: { id, employeeId: employee.id },
        include: { cycle: true },
      });

      if (!existingGoal) return NextResponse.json({ error: "Goal not found" }, { status: 404 });
      if (existingGoal.cycle.status !== "OPEN") {
        return NextResponse.json({ error: "Cannot update - cycle is closed" }, { status: 400 });
      }

      const updateData: any = {};
      if (title !== undefined) updateData.title = title;
      if (description !== undefined) updateData.description = description;
      if (progress !== undefined) updateData.progress = Math.min(100, Math.max(0, progress));
      if (status !== undefined) updateData.status = status;

      const updated = await prisma.performanceGoal.update({
        where: { id },
        data: updateData,
        include: { cycle: { select: { id: true, name: true, status: true } } },
      });

      return NextResponse.json(updated);
    }

    // --- UPDATE REVIEW ---
    if (type === "reviews") {
      const { id, selfRating, selfComment, submit } = body;

      if (!id) return NextResponse.json({ error: "Review id is required" }, { status: 400 });

      const existingReview = await prisma.performanceReview.findFirst({
        where: { id, employeeId: employee.id },
        include: { cycle: true },
      });

      if (!existingReview) return NextResponse.json({ error: "Review not found" }, { status: 404 });
      if (existingReview.status !== "DRAFT") {
        return NextResponse.json({ error: "Cannot update - review already submitted" }, { status: 400 });
      }
      if (existingReview.cycle.status !== "OPEN") {
        return NextResponse.json({ error: "Cannot update - cycle is closed" }, { status: 400 });
      }

      const updateData: any = {};
      if (selfRating !== undefined) updateData.selfRating = Math.min(5, Math.max(1, selfRating));
      if (selfComment !== undefined) updateData.selfComment = selfComment;

      if (submit) {
        if (!selfRating && !existingReview.selfRating) {
          return NextResponse.json({ error: "Self rating is required to submit" }, { status: 400 });
        }
        updateData.status = "SELF_SUBMITTED";
      }

      const updated = await prisma.performanceReview.update({
        where: { id },
        data: updateData,
        include: { cycle: { select: { id: true, name: true, status: true } } },
      });

      return NextResponse.json(updated);
    }

    return NextResponse.json({ error: "Invalid type. Use ?type=goals|reviews" }, { status: 400 });
  } catch (error) {
    console.error("PATCH /api/performance/employee error:", error);
    return NextResponse.json({ error: "Failed to update" }, { status: 500 });
  }
}

// DELETE: Delete goal
export async function DELETE(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const employee = await prisma.employee.findUnique({
      where: { email: session.user.email },
    });

    if (!employee) {
      return NextResponse.json({ error: "Employee not found" }, { status: 404 });
    }

    const { searchParams } = new URL(req.url);
    const type = searchParams.get("type");
    const id = searchParams.get("id");

    if (type === "goals") {
      if (!id) return NextResponse.json({ error: "Goal id is required" }, { status: 400 });

      const existingGoal = await prisma.performanceGoal.findFirst({
        where: { id: parseInt(id), employeeId: employee.id },
        include: { cycle: true },
      });

      if (!existingGoal) return NextResponse.json({ error: "Goal not found" }, { status: 404 });
      if (existingGoal.cycle.status !== "OPEN") {
        return NextResponse.json({ error: "Cannot delete - cycle is closed" }, { status: 400 });
      }

      await prisma.performanceGoal.delete({ where: { id: parseInt(id) } });
      return NextResponse.json({ success: true, message: "Goal deleted" });
    }

    return NextResponse.json({ error: "Invalid type. Use ?type=goals" }, { status: 400 });
  } catch (error) {
    console.error("DELETE /api/performance/employee error:", error);
    return NextResponse.json({ error: "Failed to delete" }, { status: 500 });
  }
}
