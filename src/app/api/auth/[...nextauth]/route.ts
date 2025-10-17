import NextAuth from "next-auth";
import { authOptions } from "@/lib/auth";

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };

// ✅ Make sure Prisma/bcrypt run on Node, not Edge
export const runtime = "nodejs";
// Avoid caching of auth endpoints in App Router
export const dynamic = "force-dynamic";
