// This file runs once at Next.js server startup before any route handlers load.
// Fixes EAI_AGAIN DNS errors on Windows by preferring IPv4 results.
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const dns = await import("node:dns");
    dns.setDefaultResultOrder("ipv4first");
  }
}
