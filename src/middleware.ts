import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Skip middleware for static files, fonts, images, etc.
  if (
    pathname.startsWith("/_next/") ||
    pathname.startsWith("/fonts/") ||
    pathname.startsWith("/images/") ||
    pathname.startsWith("/icons/") ||
    pathname.startsWith("/.well-known/") ||
    pathname.startsWith("/api/") || // Skip middleware for ALL API routes
    (pathname.includes(".") &&
      (pathname.endsWith(".js") ||
        pathname.endsWith(".css") ||
        pathname.endsWith(".map") ||
        pathname.endsWith(".ico") ||
        pathname.endsWith(".png") ||
        pathname.endsWith(".jpg") ||
        pathname.endsWith(".jpeg") ||
        pathname.endsWith(".gif") ||
        pathname.endsWith(".svg") ||
        pathname.endsWith(".woff") ||
        pathname.endsWith(".woff2") ||
        pathname.endsWith(".ttf") ||
        pathname.endsWith(".eot") ||
        pathname.endsWith(".ts")))
  ) {
    return NextResponse.next();
  }

  console.log("Middleware processing:", pathname);

  // Public paths that don't require authentication
  const publicPaths = ["/", "/auth"];

  // Check for authentication token
  const token = request.cookies.get("auth-token")?.value;
  console.log("Token exists:", !!token);

  // If no token and trying to access protected route
  if (!token && !publicPaths.includes(pathname)) {
    console.log("No token, redirecting to auth");
    return NextResponse.redirect(new URL("/auth", request.url));
  }

  // If token exists, validate it
  if (token) {
    try {
      // Simple token format check (JWT has 3 parts separated by dots)
      const tokenParts = token.split(".");
      if (tokenParts.length !== 3) {
        throw new Error("Invalid token format");
      }

      // Try to decode the payload (without verification for edge runtime compatibility)
      const payload = JSON.parse(atob(tokenParts[1]));

      // Check if token is expired
      if (payload.exp && payload.exp * 1000 < Date.now()) {
        throw new Error("Token expired");
      }

      console.log("Token appears valid for user:", payload.username);

      // If authenticated user is on auth page, redirect to dashboard
      if (pathname === "/auth" || pathname === "/") {
        console.log(
          "Authenticated user on auth page, redirecting to dashboard"
        );
        return NextResponse.redirect(new URL("/dashboard", request.url));
      }

      return NextResponse.next();
    } catch (error) {
      console.log("Token invalid or expired:", error.message);
      // Token is invalid
      if (!publicPaths.includes(pathname)) {
        const response = NextResponse.redirect(new URL("/auth", request.url));
        response.cookies.delete("auth-token");
        return response;
      }
    }
  }

  // Allow access to public paths
  if (publicPaths.includes(pathname)) {
    return NextResponse.next();
  }

  // Default redirect to auth for unhandled cases
  console.log("Default redirect to auth");
  return NextResponse.redirect(new URL("/auth", request.url));
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    "/((?!api|_next/static|_next/image|favicon.ico).*)",
  ],
};
