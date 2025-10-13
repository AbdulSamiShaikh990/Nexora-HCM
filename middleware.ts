import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

export default withAuth(
  function middleware(req) {
    const token = req.nextauth.token;
    const path = req.nextUrl.pathname;

    // Check if user is trying to access admin routes
    if (path.startsWith("/admin")) {
      if (token?.role !== "admin") {
        // Redirect non-admin users to employee dashboard
        return NextResponse.redirect(new URL("/employee/dashboard", req.url));
      }
    }

    // Check if user is trying to access employee routes
    if (path.startsWith("/employee")) {
      if (token?.role !== "employee") {
        // Redirect non-employee users (admins) to admin dashboard
        return NextResponse.redirect(new URL("/admin/dashboard", req.url));
      }
    }

    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ token }) => !!token,
    },
  }
);

export const config = {
  matcher: ["/admin/:path*", "/employee/:path*"],
};
