import { clerkMiddleware } from "@clerk/nextjs/server";

export default clerkMiddleware({
  // Proxy Clerk Frontend API requests through this app (/__clerk/*).
  // Enabled only in development: dev instances block direct browser -> FAPI
  // calls from localhost. On deployed environments (Vercel) the browser talks
  // to the Clerk FAPI directly, same as a standalone-FE deployment.
  frontendApiProxy: { enabled: process.env.NODE_ENV === "development" },
});

export const config = {
  matcher: [
    "/((?!_next|[^?]*\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
    "/__clerk/:path*",
  ],
};
