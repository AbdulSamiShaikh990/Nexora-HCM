import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import bcrypt from "bcryptjs";

// Helper to check if user is admin
async function isAdmin(email: string): Promise<boolean> {
  const user = await prisma.user.findUnique({
    where: { email },
    select: { role: true },
  });
  return user?.role === "ADMIN";
}

// GET - Fetch admin profile and settings
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check admin role
    if (!(await isAdmin(session.user.email))) {
      return NextResponse.json({ error: "Forbidden - Admin access required" }, { status: 403 });
    }

    // Get user data
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
      },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Get employee data if exists (admin might also have employee record)
    const employee = await prisma.employee.findFirst({
      where: { email: session.user.email },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        phone: true,
        department: true,
        jobTitle: true,
        location: true,
      },
    });

    // Get system stats for admin dashboard settings
    const [totalEmployees, totalUsers, departments] = await Promise.all([
      prisma.employee.count(),
      prisma.user.count(),
      prisma.employee.groupBy({
        by: ["department"],
        _count: { department: true },
      }),
    ]);

    return NextResponse.json({
      success: true,
      data: {
        profile: employee ? {
          id: employee.id,
          firstName: employee.firstName,
          lastName: employee.lastName,
          phone: employee.phone || "",
          department: employee.department,
          jobTitle: employee.jobTitle,
          location: employee.location || "",
        } : {
          id: user.id,
          firstName: user.name?.split(" ")[0] || "",
          lastName: user.name?.split(" ").slice(1).join(" ") || "",
          phone: "",
          department: "Administration",
          jobTitle: "System Administrator",
          location: "",
        },
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
        },
        systemStats: {
          totalEmployees,
          totalUsers,
          departments: departments.map((d) => ({
            name: d.department,
            count: d._count.department,
          })),
        },
      },
    });
  } catch (error) {
    console.error("Error fetching admin settings:", error);
    return NextResponse.json(
      { error: "Failed to fetch settings" },
      { status: 500 }
    );
  }
}

// PUT - Update admin profile
export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check admin role
    if (!(await isAdmin(session.user.email))) {
      return NextResponse.json({ error: "Forbidden - Admin access required" }, { status: 403 });
    }

    const body = await request.json();
    const { firstName, lastName, phone, location } = body;

    // Validate required fields
    if (!firstName || !lastName) {
      return NextResponse.json(
        { error: "First name and last name are required" },
        { status: 400 }
      );
    }

    // Update User name
    await prisma.user.update({
      where: { email: session.user.email },
      data: {
        name: `${firstName.trim()} ${lastName.trim()}`,
      },
    });

    // Update employee record if exists
    const employee = await prisma.employee.findFirst({
      where: { email: session.user.email },
    });

    if (employee) {
      await prisma.employee.update({
        where: { id: employee.id },
        data: {
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          phone: phone?.trim() || null,
          location: location?.trim() || null,
          updatedAt: new Date(),
        },
      });
    }

    return NextResponse.json({
      success: true,
      message: "Profile updated successfully",
    });
  } catch (error) {
    console.error("Error updating admin profile:", error);
    return NextResponse.json(
      { error: "Failed to update profile" },
      { status: 500 }
    );
  }
}

// PATCH - Update admin password
export async function PATCH(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check admin role
    if (!(await isAdmin(session.user.email))) {
      return NextResponse.json({ error: "Forbidden - Admin access required" }, { status: 403 });
    }

    const body = await request.json();
    const { currentPassword, newPassword, confirmPassword } = body;

    // Validate all fields are provided
    if (!currentPassword || !newPassword || !confirmPassword) {
      return NextResponse.json(
        { error: "All password fields are required" },
        { status: 400 }
      );
    }

    // Check if new passwords match
    if (newPassword !== confirmPassword) {
      return NextResponse.json(
        { error: "New passwords do not match" },
        { status: 400 }
      );
    }

    // Password strength validation
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
    if (!passwordRegex.test(newPassword)) {
      return NextResponse.json(
        { 
          error: "Password must be at least 8 characters and include uppercase, lowercase, number, and special character" 
        },
        { status: 400 }
      );
    }

    // Find user
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    });

    if (!user || !user.password) {
      return NextResponse.json(
        { error: "User not found or password not set" },
        { status: 404 }
      );
    }

    // Verify current password
    const isCurrentPasswordValid = await bcrypt.compare(currentPassword, user.password);
    if (!isCurrentPasswordValid) {
      return NextResponse.json(
        { error: "Current password is incorrect" },
        { status: 400 }
      );
    }

    // Check if new password is same as current
    const isSamePassword = await bcrypt.compare(newPassword, user.password);
    if (isSamePassword) {
      return NextResponse.json(
        { error: "New password cannot be the same as current password" },
        { status: 400 }
      );
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 12);

    // Update password
    await prisma.user.update({
      where: { id: user.id },
      data: { password: hashedPassword },
    });

    return NextResponse.json({
      success: true,
      message: "Password updated successfully",
    });
  } catch (error) {
    console.error("Error updating admin password:", error);
    return NextResponse.json(
      { error: "Failed to update password" },
      { status: 500 }
    );
  }
}
