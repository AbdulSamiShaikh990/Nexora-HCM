import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

// Type assertion to handle Prisma client model access
type PrismaWithUser = PrismaClient & {
  user: {
    create: (args: any) => Promise<any>;
    findUnique: (args: any) => Promise<any>;
  };
};

const typedPrisma = prisma as PrismaWithUser;

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
    const user = await typedPrisma.user.create({
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
  } catch (error: any) {
    if (error.code === "P2002") {
      console.error("❌ Error: A user with this email already exists.");
    } else {
      console.error("❌ Error creating user:", error.message);
    }
  } finally {
    await typedPrisma.$disconnect();
  }
}

createUser();
