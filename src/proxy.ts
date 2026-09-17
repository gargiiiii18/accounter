import { clerkMiddleware } from "@clerk/nextjs/server";

export default clerkMiddleware({
  // Proxy Clerk Frontend API requests through this app (/__clerk/*).
  // Required for dev instances that block direct browser -> FAPI calls.
  // debug: true  // <- re-enable temporarily to trace proxy/auth issues
  frontendApiProxy: { enabled: true },
});

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
    "/__clerk/:path*",
  ],
};
