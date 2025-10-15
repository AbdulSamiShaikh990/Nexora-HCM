import { getServerSession, type NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import CredentialsProvider from "next-auth/providers/credentials";
import { prisma } from "@/lib/db";
import bcrypt from "bcryptjs";

interface AuthUser {
  id: string;
  email: string | null;
  name: string | null;
  role: "admin" | "employee";
}

interface ExtendedUser {
  id: string;
  email?: string | null;
  name?: string | null;
  role?: "admin" | "employee";
}

interface ExtendedToken {
  id?: string;
  email?: string | null;
  role?: "admin" | "employee" | null;
}

interface ExtendedSession {
  expires: string;
  user?: {
    id?: string;
    email?: string | null;
    name?: string | null;
    role?: "admin" | "employee" | null;
  };
}

export const authOptions: NextAuthOptions = {
  session: { strategy: "jwt" },
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error("Please enter email and password");
        }

        const user = await prisma.user.findUnique({
          where: { email: credentials.email.toLowerCase() },
        });

        if (!user || !user.password) {
          throw new Error("Invalid email or password");
        }

        const ok = await bcrypt.compare(credentials.password, user.password);
        if (!ok) throw new Error("Invalid email or password");

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role === "ADMIN" ? "admin" : "employee",
        } as AuthUser;
      },
    }),
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],
  pages: {
    signIn: "/auth/signin",
    error: "/auth/error",
  },
  callbacks: {
    async signIn({ user, account }) {
      if (account?.provider === "credentials") return true;
      // For Google: allow only if user exists in DB; role comes from DB
      if (!user?.email) return false;
      const dbUser = await prisma.user.findUnique({ where: { email: user.email.toLowerCase() } });
      return !!dbUser;
    },
    async jwt({ token, user }) {
      if (user) {
        const extendedUser = user as ExtendedUser;
        token.id = extendedUser.id;
        token.email = user.email;
        token.role = extendedUser.role ?? (token.role as "admin" | "employee" | null);
      }
      // If role still missing (Google path), fetch once
      if (!token.role && token.email) {
        const dbUser = await prisma.user.findUnique({ where: { email: String(token.email).toLowerCase() } });
        token.role = dbUser ? (dbUser.role === "ADMIN" ? "admin" : "employee") : null;
      }
      return token;
    },
    async session({ session, token }) {
      const extendedSession = session as ExtendedSession;
      const extendedToken = token as ExtendedToken;
      if (extendedSession.user) {
        extendedSession.user.id = extendedToken.id as string;
        extendedSession.user.email = extendedToken.email as string;
        extendedSession.user.role = extendedToken.role ?? null;
      }
      return extendedSession;
    },
  },
};

export const getSession = () => getServerSession(authOptions);
