import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

// Use Prisma client directly - it has proper types

async function createUser() {
  const email = process.argv[2];
  const password = process.argv[3];
  const name = process.argv[4] || "User";

  if (!email || !password) {
    console.error("Usage: ts-node scripts/create-user.ts <email> <password> [name]");
    process.exit(1);
  }

  try {
    // Hash the password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create the user
    const user = await prisma.user.create({
      data: {
        email: email.toLowerCase(),
        password: hashedPassword,
        name: name,
      },
    });

    console.log("✅ User created successfully!");
    console.log("Email:", user.email);
    console.log("Name:", user.name);
    console.log("\nYou can now sign in with these credentials.");
  } catch (error: unknown) {
    const err = error as { code?: string; message?: string };
    if (err.code === "P2002") {
      console.error("❌ Error: A user with this email already exists.");
    } else {
      console.error("❌ Error creating user:", err.message || "Unknown error");
    }
  } finally {
    await prisma.$disconnect();
  }
}

createUser();
