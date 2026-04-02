import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const isPublicRoute = createRouteMatcher([
  "/",
  "/sign-in(.*)",
  "/sign-up(.*)",
  "/api/webhooks(.*)",
  "/pricing(.*)",
  "/api/marketing/(.*)",
  "/api/billing/plans",
  "/api/billing/contact",
]);

const clerk = clerkMiddleware(async (auth, request) => {
  if (!isPublicRoute(request)) {
    await auth.protect();
  }
});

/**
 * Next.js 16 proxy.ts runs in Node.js and treats same-origin rewrites as
 * actual HTTP fetches, causing an infinite loop.  Clerk's `decorateRequest`
 * converts `NextResponse.next()` into `NextResponse.rewrite(sameOrigin)` to
 * inject auth headers.  We fix this by converting same-origin rewrites back
 * to `NextResponse.next()` while preserving all Clerk-injected headers.
 */
export default async function proxy(request: NextRequest) {
  const response = await clerk(request, {} as never);
  if (!response) return NextResponse.next();

  const rewriteHeader = response.headers.get("x-middleware-rewrite");
  if (rewriteHeader) {
    const rewriteUrl = new URL(rewriteHeader);
    const requestUrl = new URL(request.url);
    // Same-origin + same-path rewrite → convert to passthrough
    if (
      rewriteUrl.origin === requestUrl.origin &&
      rewriteUrl.pathname === requestUrl.pathname
    ) {
      const next = NextResponse.next({
        request: { headers: new Headers(request.headers) },
      });
      // Copy all Clerk-injected headers (auth status, token, etc.)
      response.headers.forEach((value, key) => {
        if (key !== "x-middleware-rewrite") {
          next.headers.set(key, value);
        }
      });
      return next;
    }
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};
