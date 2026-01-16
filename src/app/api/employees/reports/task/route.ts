import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

interface TaskRecord {
  id: number;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  dueDate: Date;
  progress: number | null;
  createdAt: Date;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = prisma as any;

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Find the employee by email
    const employee = await prisma.employee.findUnique({
      where: { email: session.user.email }
    });

    if (!employee) {
      return NextResponse.json({ error: "Employee not found" }, { status: 404 });
    }

    const { searchParams } = new URL(request.url);
    const range = searchParams.get('range') || 'month';
    
    // Calculate date range
    const now = new Date();
    const startDate = new Date();
    
    switch (range) {
      case 'week':
        startDate.setDate(now.getDate() - 7);
        break;
      case 'month':
        startDate.setMonth(now.getMonth() - 1);
        break;
      case 'year':
        startDate.setFullYear(now.getFullYear() - 1);
        break;
    }

    // Fetch tasks assigned to this employee
    const tasks: TaskRecord[] = await db.task.findMany({
      where: {
        assignedToId: employee.id,
        createdAt: {
          gte: startDate,
          lte: now
        }
      },
      orderBy: {
        dueDate: 'desc'
      }
    });

    // Calculate statistics (matching the status values in schema: Pending | InProgress | Completed)
    const completedTasks = tasks.filter((t: TaskRecord) => t.status === 'Completed').length;
    const inProgressTasks = tasks.filter((t: TaskRecord) => t.status === 'InProgress').length;
    const pendingTasks = tasks.filter((t: TaskRecord) => t.status === 'Pending').length;
    const overdueTasks = tasks.filter((t: TaskRecord) => 
      t.status !== 'Completed' && new Date(t.dueDate) < now
    ).length;
    
    const totalTasks = tasks.length;
    const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

    // Format tasks for table
    const formattedTasks = tasks.map((task: TaskRecord) => ({
      title: task.title,
      description: task.description,
      status: task.status,
      priority: task.priority,
      dueDate: task.dueDate,
      progress: task.progress
    }));

    return NextResponse.json({
      completedTasks,
      inProgressTasks,
      pendingTasks,
      overdueTasks,
      completionRate,
      totalTasks,
      tasks: formattedTasks
    });

  } catch (error) {
    console.error("Error fetching task report:", error);
    return NextResponse.json(
      { error: "Failed to fetch task report" },
      { status: 500 }
    );
  }
}
