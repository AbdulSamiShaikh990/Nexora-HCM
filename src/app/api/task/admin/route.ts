import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

/**
 * GET /api/task/admin
 * Fetch all tasks (admin view) with filtering by status, priority, assignedTo, etc.
 */
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status");
    const priority = searchParams.get("priority");
    const assignedToId = searchParams.get("assignedToId");
    const page = parseInt(searchParams.get("page") || "1");
    const size = parseInt(searchParams.get("size") || "20");

    const where: any = {};

    if (status && status !== "all") where.status = status;
    if (priority && priority !== "all") where.priority = priority;
    if (assignedToId) where.assignedToId = parseInt(assignedToId);

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
    console.error("Error fetching tasks:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch tasks" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/task/admin
 * Create a new task (admin only)
 */
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const {
      title,
      description,
      priority,
      dueDate,
      estimatedHours,
      assignedToId,
      assignedById,
      tags,
    } = body;

    if (!title || !assignedToId || !assignedById || !dueDate) {
      return NextResponse.json(
        { success: false, error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Verify both employees exist
    const [assignedBy, assignedTo] = await Promise.all([
      prisma.employee.findUnique({ where: { id: assignedById } }),
      prisma.employee.findUnique({ where: { id: assignedToId } }),
    ]);

    if (!assignedBy || !assignedTo) {
      return NextResponse.json(
        { success: false, error: "Invalid employee ID" },
        { status: 400 }
      );
    }

    const task = await prisma.task.create({
      data: {
        title,
        description: description || null,
        priority: priority || "Medium",
        status: "Pending",
        dueDate: new Date(dueDate),
        estimatedHours: estimatedHours || null,
        actualHours: 0,
        progress: 0,
        tags: tags || [],
        assignedById,
        assignedToId,
      },
      include: {
        assignedBy: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
        assignedTo: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
      },
    });

    // Create notification for assigned employee
    await prisma.notification.create({
      data: {
        type: "task_assigned",
        payload: {
          taskId: task.id,
          taskTitle: task.title,
          priority: task.priority,
          dueDate: task.dueDate.toISOString(),
          assignedBy: `${assignedBy.firstName} ${assignedBy.lastName}`,
          assignedToId: assignedToId,
          message: `New task "${task.title}" has been assigned to you by ${assignedBy.firstName} ${assignedBy.lastName}`,
        },
      },
    });

    return NextResponse.json(
      { success: true, data: task },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error creating task:", error);
    return NextResponse.json(
      { success: false, error: "Failed to create task" },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/task/admin
 * Update a task (admin only)
 */
export async function PUT(req: Request) {
  try {
    const body = await req.json();
    const {
      id,
      title,
      description,
      priority,
      status,
      dueDate,
      estimatedHours,
      assignedToId,
      tags,
    } = body;

    if (!id) {
      return NextResponse.json(
        { success: false, error: "Task ID is required" },
        { status: 400 }
      );
    }

    // Verify task exists
    const existingTask = await prisma.task.findUnique({ where: { id } });
    if (!existingTask) {
      return NextResponse.json(
        { success: false, error: "Task not found" },
        { status: 404 }
      );
    }

    const updateData: any = {};
    if (title !== undefined) updateData.title = title;
    if (description !== undefined) updateData.description = description;
    if (priority !== undefined) updateData.priority = priority;
    if (status !== undefined) updateData.status = status;
    if (dueDate !== undefined) updateData.dueDate = new Date(dueDate);
    if (estimatedHours !== undefined) updateData.estimatedHours = estimatedHours;
    if (assignedToId !== undefined) updateData.assignedToId = assignedToId;
    if (tags !== undefined) updateData.tags = tags;

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
    console.error("Error updating task:", error);
    return NextResponse.json(
      { success: false, error: "Failed to update task" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/task/admin
 * Delete a task (admin only)
 */
export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = parseInt(searchParams.get("id") || "0");

    if (!id) {
      return NextResponse.json(
        { success: false, error: "Task ID is required" },
        { status: 400 }
      );
    }

    // Verify task exists
    const existingTask = await prisma.task.findUnique({ where: { id } });
    if (!existingTask) {
      return NextResponse.json(
        { success: false, error: "Task not found" },
        { status: 404 }
      );
    }

    await prisma.task.delete({ where: { id } });

    return NextResponse.json(
      { success: true, message: "Task deleted successfully" },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error deleting task:", error);
    return NextResponse.json(
      { success: false, error: "Failed to delete task" },
      { status: 500 }
    );
  }
}
