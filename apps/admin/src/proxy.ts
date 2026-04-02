import { NextRequest, NextResponse } from "next/server";
import { verifySessionToken, AUTH_COOKIE_NAME } from "@/lib/auth-edge";

const PUBLIC_ROUTES = ["/login", "/api/auth"];

function isPublicRoute(pathname: string): boolean {
  return PUBLIC_ROUTES.some((route) => pathname.startsWith(route));
}

export default async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (isPublicRoute(pathname)) {
    return NextResponse.next();
  }

  const token = request.cookies.get(AUTH_COOKIE_NAME)?.value;
  if (!token) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  const session = await verifySessionToken(token);
  if (!session) {
    const response = NextResponse.redirect(new URL("/login", request.url));
    response.cookies.set(AUTH_COOKIE_NAME, "", { maxAge: 0, path: "/" });
    return response;
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};
