import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server"

// Protect the dashboard and all of its sub-routes. Everything else
// (landing page, sign-in, sign-up) stays public.
const isProtectedRoute = createRouteMatcher(["/dashboard(.*)"])

export default clerkMiddleware(async (auth, req) => {
  if (isProtectedRoute(req)) {
    await auth.protect()
  }
})

export const config = {
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpg|jpeg|png|gif|svg|ico|webp|woff2?|ttf|otf|map)).*)",
    // Always run for API routes
    "/(api|trpc)(.*)",
  ],
}
