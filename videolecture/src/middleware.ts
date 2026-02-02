import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

export default withAuth(
  function middleware(req) {
    const { pathname } = req.nextUrl;
    const token = req.nextauth.token;
    const userRole = token?.role as string | undefined;

    // Admin/Creator only routes protection
    if (
      pathname.startsWith("/dashboard") ||
      pathname.startsWith("/manage-courses") ||
      pathname.startsWith("/analytics") ||
      pathname.startsWith("/users")
    ) {
      if (userRole !== "ADMIN" && userRole !== "CREATOR") {
        return NextResponse.redirect(new URL("/courses", req.url));
      }
    }

    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ token, req }) => {
        const { pathname } = req.nextUrl;

        // Allow auth pages without token
        if (pathname === "/login" || pathname === "/register") {
          return true;
        }

        // Public routes
        if (
          pathname === "/" ||
          pathname.startsWith("/courses") ||
          pathname.startsWith("/course/")
        ) {
          return true;
        }

        // Protected routes need token
        return !!token;
      },
    },
    pages: {
      signIn: "/login",
    },
  }
);

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/manage-courses/:path*",
    "/analytics/:path*",
    "/users/:path*",
    "/settings/:path*",
    "/profile/:path*",
    "/my-courses/:path*",
    "/player/:path*",
    "/login",
    "/register",
  ],
};
