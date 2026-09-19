import { clerkMiddleware } from "@clerk/nextjs/server";

export default clerkMiddleware({
  // The Clerk Frontend API proxy (/__clerk/*) is intentionally disabled.
  // Verified against this development instance:
  //   - direct FAPI calls from http://localhost:3000 are CORS-allowed and the
  //     handshake redirects back correctly (works)
  //   - requests forwarded through the proxy return "host_invalid" (broken)
  // Production (Vercel) has always run with the proxy disabled, so this keeps
  // local dev and production on the same, working path.
  frontendApiProxy: { enabled: false },
});

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
    "/__clerk/:path*",
  ],
};