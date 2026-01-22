import { getServerSession, type NextAuthOptions, type Session, type User } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import { prisma } from "@/lib/db";
import bcrypt from "bcryptjs";
import type { JWT } from "next-auth/jwt";

// Local helper types for convenience (avoid undefined names)
type AppUser = User & { id: string; role?: "admin" | "employee" | null };

export const authOptions: NextAuthOptions = {
  // ✅ FIX: provide secret (works for v4 and v5/beta)
  secret: process.env.NEXTAUTH_SECRET ?? process.env.AUTH_SECRET,

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
        if (!user || !user.password) throw new Error("Invalid email or password");

        const ok = await bcrypt.compare(credentials.password, user.password);
        if (!ok) throw new Error("Invalid email or password");

        const authUser: AppUser = {
          id: user.id,
          email: user.email ?? undefined,
          name: user.name ?? undefined,
          role: user.role === "ADMIN" ? "admin" : "employee",
        };
        return authUser as unknown as User;
      },
    }),

    // ✅ Make Google optional so missing envs don't crash build/routes
    ...(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET
      ? [
          GoogleProvider({
            clientId: process.env.GOOGLE_CLIENT_ID!,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
          }),
        ]
      : []),
  ],

  pages: {
    signIn: "/auth/signin",
    error: "/auth/error",
  },

  callbacks: {
    async signIn({ user, account }) {
      if (account?.provider === "credentials") return true;
      if (!user?.email) return false;
      const dbUser = await prisma.user.findUnique({
        where: { email: user.email.toLowerCase() },
      });
      return !!dbUser;
    },
    async jwt({ token, user, trigger, session }) {
      if (user) {
        const u = user as AppUser;
        (token as JWT).id = u.id;
        token.email = u.email;
        token.name = u.name ?? token.name;
        (token as JWT).role = u.role ?? ((token as JWT).role ?? null);
      }

      // Allow client-side session update (e.g., after profile change)
      if (trigger === "update" && session?.name) {
        token.name = session.name;
      }

      if (!token.role && token.email) {
        const dbUser = await prisma.user.findUnique({
          where: { email: String(token.email).toLowerCase() },
        });
        token.role = dbUser ? (dbUser.role === "ADMIN" ? "admin" : "employee") : null;
        token.name = token.name ?? dbUser?.name ?? undefined;
      }
      return token;
    },
    async session({ session, token }) {
      const s = session as Session;
      const t = token as JWT & { email?: string | null };
      if (s.user) {
        (s.user as unknown as { id?: string }).id = t.id as string;
        s.user.name = (t as { name?: string }).name ?? s.user.name;
        // NextAuth's Session.user.email is typed as string | null | undefined depending on version.
        // Cast to string to satisfy lint while we always set a string from JWT when present.
        s.user.email = (t.email ?? "") as unknown as string;
        (s.user as unknown as { role?: "admin" | "employee" | null }).role = t.role ?? null;
      }
      return s;
    },
  },
};

export const getSession = () => getServerSession(authOptions);
