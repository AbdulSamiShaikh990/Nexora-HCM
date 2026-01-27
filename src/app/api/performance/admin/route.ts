import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

// GET: Fetch cycles, goals, reviews (admin view)
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Admin role check
    const user = session.user as any;
    if (user.role !== 'admin') {
      return NextResponse.json({ error: "Forbidden: Admin access required" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const type = searchParams.get("type"); // cycles | goals | reviews

    // --- CYCLES ---
    if (type === "cycles") {
      const cycles = await prisma.reviewCycle.findMany({
        orderBy: { startDate: "desc" },
        include: { _count: { select: { goals: true, reviews: true } } },
      });
      return NextResponse.json(cycles);
    }

    // --- ALL GOALS ---
    if (type === "goals") {
      const cycleId = searchParams.get("cycleId");
      const where: any = {};
      if (cycleId) where.cycleId = parseInt(cycleId);

      const goals = await prisma.performanceGoal.findMany({
        where,
        include: {
          employee: { select: { id: true, firstName: true, lastName: true, email: true, jobTitle: true, department: true } },
          cycle: { select: { id: true, name: true, status: true } },
        },
        orderBy: { createdAt: "desc" },
      });
      return NextResponse.json(goals);
    }

    // --- ALL REVIEWS ---
    if (type === "reviews") {
      const cycleId = searchParams.get("cycleId");
      const where: any = {};
      if (cycleId) where.cycleId = parseInt(cycleId);

      const reviews = await prisma.performanceReview.findMany({
        where,
        include: {
          employee: { 
            select: { 
              id: true, 
              firstName: true, 
              lastName: true, 
              email: true,
              jobTitle: true,
              department: true
            } 
          },
          cycle: { select: { id: true, name: true, status: true } },
        },
        orderBy: { createdAt: "desc" },
      });
      
      // Map firstName/lastName to name for frontend compatibility
      const formattedReviews = reviews.map(review => ({
        ...review,
        employee: {
          ...review.employee,
          name: `${review.employee.firstName} ${review.employee.lastName}`,
          designation: review.employee.jobTitle
        }
      }));
      
      return NextResponse.json(formattedReviews);
    }

    return NextResponse.json({ error: "Invalid type. Use ?type=cycles|goals|reviews" }, { status: 400 });
  } catch (error) {
    console.error("GET /api/performance/admin error:", error);
    return NextResponse.json({ error: "Failed to fetch data" }, { status: 500 });
  }
}

// POST: Create cycle
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Admin role check
    const user = session.user as any;
    if (user.role !== 'admin') {
      return NextResponse.json({ error: "Forbidden: Admin access required" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const type = searchParams.get("type");
    const body = await req.json();

    if (type === "cycles") {
      const { name, startDate, endDate } = body;

      if (!name || !startDate || !endDate) {
        return NextResponse.json({ error: "name, startDate, endDate are required" }, { status: 400 });
      }

      const cycle = await prisma.reviewCycle.create({
        data: {
          name,
          startDate: new Date(startDate),
          endDate: new Date(endDate),
          status: "DRAFT",
        },
      });

      return NextResponse.json(cycle, { status: 201 });
    }

    return NextResponse.json({ error: "Invalid type. Use ?type=cycles" }, { status: 400 });
  } catch (error) {
    console.error("POST /api/performance/admin error:", error);
    return NextResponse.json({ error: "Failed to create" }, { status: 500 });
  }
}

// PATCH: Update cycle status or manager review
export async function PATCH(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Admin role check
    const user = session.user as any;
    if (user.role !== 'admin') {
      return NextResponse.json({ error: "Forbidden: Admin access required" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const type = searchParams.get("type");
    const body = await req.json();

    // --- UPDATE CYCLE ---
    if (type === "cycles") {
      const { id, status, name, startDate, endDate } = body;

      if (!id) return NextResponse.json({ error: "Cycle id is required" }, { status: 400 });

      const updateData: any = {};
      if (status) updateData.status = status; // DRAFT | OPEN | CLOSED
      if (name) updateData.name = name;
      if (startDate) updateData.startDate = new Date(startDate);
      if (endDate) updateData.endDate = new Date(endDate);

      const updated = await prisma.reviewCycle.update({
        where: { id },
        data: updateData,
      });

      return NextResponse.json(updated);
    }

    // --- MANAGER REVIEW (add manager rating) ---
    if (type === "reviews") {
      const { id, managerRating, managerComment, finalize } = body;

      if (!id) return NextResponse.json({ error: "Review id is required" }, { status: 400 });

      const existingReview = await prisma.performanceReview.findUnique({
        where: { id },
        include: { cycle: true },
      });

      if (!existingReview) return NextResponse.json({ error: "Review not found" }, { status: 404 });

      const updateData: any = {};
      if (managerRating !== undefined) updateData.managerRating = Math.min(5, Math.max(1, managerRating));
      if (managerComment !== undefined) updateData.managerComment = managerComment;

      if (finalize) {
        updateData.status = "FINALIZED";
      } else if (managerRating) {
        updateData.status = "MANAGER_REVIEWED";
      }

      const updated = await prisma.performanceReview.update({
        where: { id },
        data: updateData,
        include: {
          employee: { 
            select: { 
              id: true, 
              firstName: true, 
              lastName: true,
              email: true,
              jobTitle: true,
              department: true
            } 
          },
          cycle: { select: { id: true, name: true, status: true } },
        },
      });

      // Map name for frontend
      const formattedReview = {
        ...updated,
        employee: {
          ...updated.employee,
          name: `${updated.employee.firstName} ${updated.employee.lastName}`,
          designation: updated.employee.jobTitle
        }
      };

      return NextResponse.json(formattedReview);
    }

    return NextResponse.json({ error: "Invalid type. Use ?type=cycles|reviews" }, { status: 400 });
  } catch (error) {
    console.error("PATCH /api/performance/admin error:", error);
    return NextResponse.json({ error: "Failed to update" }, { status: 500 });
  }
}

// DELETE: Delete cycle
export async function DELETE(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Admin role check
    const user = session.user as any;
    if (user.role !== 'admin') {
      return NextResponse.json({ error: "Forbidden: Admin access required" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const type = searchParams.get("type");
    const id = searchParams.get("id");

    if (type === "cycles") {
      if (!id) return NextResponse.json({ error: "Cycle id is required" }, { status: 400 });

      await prisma.reviewCycle.delete({ where: { id: parseInt(id) } });
      return NextResponse.json({ success: true, message: "Cycle deleted" });
    }

    return NextResponse.json({ error: "Invalid type. Use ?type=cycles" }, { status: 400 });
  } catch (error) {
    console.error("DELETE /api/performance/admin error:", error);
    return NextResponse.json({ error: "Failed to delete" }, { status: 500 });
  }
}
