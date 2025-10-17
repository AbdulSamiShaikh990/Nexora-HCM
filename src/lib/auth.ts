import { getServerSession, type NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import { prisma } from "@/lib/db";
import bcrypt from "bcryptjs";

// … your interfaces stay the same …

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

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role === "ADMIN" ? "admin" : "employee",
        } as AuthUser;
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
    async jwt({ token, user }) {
      if (user) {
        const u = user as ExtendedUser;
        token.id = u.id;
        token.email = user.email;
        token.role = u.role ?? (token.role as "admin" | "employee" | null);
      }
      if (!token.role && token.email) {
        const dbUser = await prisma.user.findUnique({
          where: { email: String(token.email).toLowerCase() },
        });
        token.role = dbUser ? (dbUser.role === "ADMIN" ? "admin" : "employee") : null;
      }
      return token;
    },
    async session({ session, token }) {
      const s = session as ExtendedSession;
      const t = token as ExtendedToken;
      if (s.user) {
        s.user.id = t.id as string;
        s.user.email = t.email as string;
        s.user.role = t.role ?? null;
      }
      return s;
    },
  },
};

export const getSession = () => getServerSession(authOptions);
