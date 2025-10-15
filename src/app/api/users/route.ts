import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import bcrypt from "bcryptjs";
import { Role } from "@prisma/client";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { email, password, name, role } = body || {};

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email and password are required" },
        { status: 400 }
      );
    }

    const existing = await prisma.user.findUnique({
      where: { email: String(email).toLowerCase() },
      select: { id: true },
    });

    if (existing) {
      return NextResponse.json(
        { error: "User with this email already exists" },
        { status: 409 }
      );
    }

    const hashed = await bcrypt.hash(String(password), 10);

    // Map incoming role string to enum value; default EMPLOYEE
    const normalizedRole = String(role || "EMPLOYEE").toUpperCase();
    const roleEnum = normalizedRole === "ADMIN" ? "ADMIN" : "EMPLOYEE";

    const user = await prisma.user.create({
      data: {
        email: String(email).toLowerCase(),
        password: hashed,
        name: name ? String(name) : null,
        role: roleEnum as Role,
      },
      select: { id: true, email: true, name: true, role: true },
    });

    return NextResponse.json(user, { status: 201 });
  } catch (err: unknown) {
    console.error("Create user error:", err);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
