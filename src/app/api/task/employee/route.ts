import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

/**
 * GET /api/task/employee
 * Fetch tasks assigned to a specific employee with filtering options
 */
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const employeeId = parseInt(searchParams.get("employeeId") || "0");
    const status = searchParams.get("status");
    const priority = searchParams.get("priority");
    const page = parseInt(searchParams.get("page") || "1");
    const size = parseInt(searchParams.get("size") || "20");

    if (!employeeId) {
      return NextResponse.json(
        { success: false, error: "Employee ID is required" },
        { status: 400 }
      );
    }

    const where: any = {
      assignedToId: employeeId,
    };

    if (status && status !== "all") where.status = status;
    if (priority && priority !== "all") where.priority = priority;

    const skip = (page - 1) * size;

    const [tasks, total] = await Promise.all([
      prisma.task.findMany({
        where,
        skip,
        take: size,
        orderBy: { dueDate: "asc" },
        include: {
          assignedBy: {
            select: { id: true, firstName: true, lastName: true, email: true },
          },
          assignedTo: {
            select: { id: true, firstName: true, lastName: true, email: true },
          },
        },
      }),
      prisma.task.count({ where }),
    ]);

    return NextResponse.json(
      {
        success: true,
        data: tasks,
        pagination: {
          page,
          size,
          total,
          pages: Math.ceil(total / size),
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error fetching employee tasks:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch tasks" },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/task/employee
 * Update task progress and status (employee can only update their own tasks)
 */
export async function PUT(req: Request) {
  try {
    const body = await req.json();
    const { id, employeeId, status, progress, actualHours } = body;

    if (!id || !employeeId) {
      return NextResponse.json(
        { success: false, error: "Task ID and Employee ID are required" },
        { status: 400 }
      );
    }

    // Verify task belongs to this employee
    const existingTask = await prisma.task.findUnique({ where: { id } });
    if (!existingTask || existingTask.assignedToId !== employeeId) {
      return NextResponse.json(
        { success: false, error: "Unauthorized to update this task" },
        { status: 403 }
      );
    }

    const updateData: any = {};
    if (status !== undefined) updateData.status = status;
    if (progress !== undefined) updateData.progress = Math.min(100, Math.max(0, progress));
    if (actualHours !== undefined) updateData.actualHours = actualHours;

    const task = await prisma.task.update({
      where: { id },
      data: updateData,
      include: {
        assignedBy: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
        assignedTo: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
      },
    });

    return NextResponse.json(
      { success: true, data: task },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error updating employee task:", error);
    return NextResponse.json(
      { success: false, error: "Failed to update task" },
      { status: 500 }
    );
  }
}
