import { getServerSession, type NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import CredentialsProvider from "next-auth/providers/credentials";
import { prisma } from "@/lib/db";
import bcrypt from "bcryptjs";

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
        } as any;
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
    async jwt({ token, user, account }) {
      if (user) {
        token.id = (user as any).id;
        token.email = user.email;
        token.role = (user as any).role ?? token.role;
      }
      // If role still missing (Google path), fetch once
      if (!token.role && token.email) {
        const dbUser = await prisma.user.findUnique({ where: { email: String(token.email).toLowerCase() } });
        token.role = dbUser ? (dbUser.role === "ADMIN" ? "admin" : "employee") : null;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as any).id = token.id as string;
        session.user.email = token.email as string;
        (session.user as any).role = (token.role as string) ?? null;
      }
      return session;
    },
  },
};

export const getSession = () => getServerSession(authOptions);
