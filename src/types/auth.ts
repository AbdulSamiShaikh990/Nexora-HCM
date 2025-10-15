import { DefaultSession, DefaultUser } from "next-auth";

// Extend the built-in session types
declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: "admin" | "employee" | null;
      email: string;
      name?: string | null;
      image?: string | null;
    } & DefaultSession["user"];
  }

  interface User extends DefaultUser {
    role?: "admin" | "employee" | null;
  }
}

// JWT token types
declare module "next-auth/jwt" {
  interface JWT {
    role?: "admin" | "employee" | null;
    id?: string;
  }
}

export type UserRole = "admin" | "employee" | null;
