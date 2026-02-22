const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");

const prisma = new PrismaClient();

async function createUser() {
  const email = process.argv[2];
  const password = process.argv[3];
  const name = process.argv[4] || "User";
  const role = process.argv[5] || "EMPLOYEE";

  if (!email || !password) {
    console.error("Usage: node scripts/create-user.cjs <email> <password> [name] [role]");
    process.exit(1);
  }

  try {
    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: {
        email: email.toLowerCase(),
        password: hashedPassword,
        name: name,
        role: role,
      },
    });

    console.log("✅ User created successfully!");
    console.log("Email:", user.email);
    console.log("Name:", user.name);
    console.log("Role:", user.role);
    console.log("\nYou can now sign in with these credentials.");
  } catch (error) {
    if (error && error.code === "P2002") {
      console.error("❌ Error: A user with this email already exists.");
    } else {
      console.error("❌ Error creating user:", error && error.message ? error.message : "Unknown error");
    }
  } finally {
    await prisma.$disconnect();
  }
}

createUser();
