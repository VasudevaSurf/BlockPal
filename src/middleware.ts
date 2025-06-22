import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import jwt from "jsonwebtoken";

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Public paths that don't require authentication
  const publicPaths = ["/", "/auth", "/api/auth/login", "/api/auth/register"];

  // Check if the path is public
  if (publicPaths.includes(pathname) || pathname.startsWith("/api/auth/")) {
    return NextResponse.next();
  }

  // Check for authentication token
  const token = request.cookies.get("auth-token")?.value;

  if (!token) {
    // Redirect to auth page if no token
    return NextResponse.redirect(new URL("/auth", request.url));
  }

  try {
    // Verify the token
    jwt.verify(token, process.env.JWT_SECRET || "your-secret-key");
    return NextResponse.next();
  } catch (error) {
    // Token is invalid, redirect to auth
    const response = NextResponse.redirect(new URL("/auth", request.url));
    response.cookies.delete("auth-token");
    return response;
  }
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    "/((?!_next/static|_next/image|favicon.ico|public/).*)",
  ],
};

