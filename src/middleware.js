// // src/middleware.js
// import { NextResponse } from "next/server";

// // ---------------- CORS configuration ----------------
// export const corsConfig = [
//   {
//     path: "/api/v1/user/register",
//     methods: ["POST"],
//     origins: ["http://localhost:3001"],
//   },
//   {
//     path: "/api/v1/user/login",
//     methods: ["POST"],
//     origins: ["http://localhost:3001"],
//   },
//   {
//     path: "/api/v1/user/session",
//     methods: ["GET"],
//     origins: ["http://localhost:3001"],
//   },
// ];

// // ---------------- Helper functions ----------------
// function matchRule(config, pathname, method) {
//   return pathname.startsWith(config.path) && config.methods.includes(method);
// }

// function originAllowed(origin, allowedOrigins) {
//   return allowedOrigins.includes(origin);
// }

// // ---------------- Middleware ----------------
// export function middleware(request) {
//   const origin = request.headers.get("origin") || "";
//   const pathname = request.nextUrl.pathname;
//   const method = request.method;

//   // Find matching CORS rule
//   const rule = corsConfig.find((cfg) => matchRule(cfg, pathname, method));

//   // If no rule or origin not allowed, block
//   if (!rule || !originAllowed(origin, rule.origins)) {
//     // Handle preflight requests
//     if (method === "OPTIONS") {
//       return new NextResponse(null, { status: 204 });
//     }
//     return new NextResponse("CORS Not Allowed", { status: 403 });
//   }

//   // Apply CORS headers
//   const response = NextResponse.next();
//   response.headers.set("Access-Control-Allow-Origin", origin);
//   response.headers.set("Access-Control-Allow-Methods", rule.methods.join(","));
//   response.headers.set("Access-Control-Allow-Headers", "Content-Type, Authorization");
//   response.headers.set("Access-Control-Allow-Credentials", "true");

//   // Preflight OPTIONS request handling
//   if (method === "OPTIONS") {
//     return new NextResponse(null, { status: 204, headers: response.headers });
//   }

//   return response;
// }

// // ---------------- Middleware matcher ----------------
// export const config = {
//   matcher: ["/api/:path*"],
// };
// src/middleware.js
import { NextResponse } from "next/server";

// ---------------- Middleware ----------------
export function middleware(request) {
  const pathname = request.nextUrl.pathname;
  const method = request.method;
  console.log(request)
  const response = NextResponse.next();
  
  console.log("res*********",response)
  // ---------------- Allow all origins ----------------
  response.headers.set("Access-Control-Allow-Origin", "*");
  response.headers.set("Access-Control-Allow-Methods", "GET,POST,PUT,PATCH,DELETE,OPTIONS");
  response.headers.set("Access-Control-Allow-Headers", "Content-Type, Authorization,x-vendor-identifier");
  response.headers.set("Access-Control-Allow-Credentials", "true");

  // Handle preflight OPTIONS request
  if (method === "OPTIONS") {
    return new NextResponse(null, { status: 204, headers: response.headers });
  }
  return response;
}

// ---------------- Middleware matcher ----------------
export const config = {
  matcher: ["/api/:path*"],
};
