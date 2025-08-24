import { NextResponse } from "next/server";

// ---------------- Security headers helper ----------------
function setSecurityHeaders(response) {
  const headers = {
    "X-Frame-Options": "DENY",
    "Expect-CT": "max-age=86400, enforce",
    "Referrer-Policy": "no-referrer",
    "Strict-Transport-Security": "max-age=63072000; includeSubDomains; preload",
    "X-DNS-Prefetch-Control": "off",
    "X-Download-Options": "noopen",
    "X-Permitted-Cross-Domain-Policies": "none",
    "X-XSS-Protection": "0",
  };

  Object.entries(headers).forEach(([key, value]) => {
    response.headers.set(key, value);
  });

  return response;
}

// ---------------- CORS configuration ----------------
export const corsConfig = [
  {
    path: "/api/v1/user/register",
    methods: ["POST"],
    origins: ["http://localhost:3001/register"],
  },
  {
    path: "/api/v1/user/login",
    methods: ["POST"],
    origins: ["http://localhost:3001/login"],
  },
  // {
  //   path: "/api/v1/user/session",
  //   methods: ["GET"],
  //   origins: ["http://localhost:3001/register"],
  // },
];

// ---------------- Helper functions ----------------
function matchRule(config, pathname, method) {
  return pathname.startsWith(config.path) && config.methods.includes(method);
}

function originAllowed(origin, allowedOrigins) {
  return allowedOrigins.includes(origin);
}

function applyCorsHeaders(response, origin, methods) {
  response.headers.set("Access-Control-Allow-Origin", origin);
  response.headers.set("Access-Control-Allow-Methods", methods.join(","));
  response.headers.set("Access-Control-Allow-Headers", "Content-Type, Authorization");
  response.headers.set("Access-Control-Allow-Credentials", "true"); // optional
  // setSecurityHeaders(response);
  return response;
}

// ---------------- Middleware ----------------
export async function middleware(request) {
  console.log("************************middleware")
  console.log(request) 

  const origin = request.headers.get("origin") || "";
  const pathname = request.nextUrl.pathname;
  const method = request.method;

  // ---------------- Handle requests with Origin (CORS) ----------------
  if (origin) {
    const rule = corsConfig.find((cfg) => matchRule(cfg, pathname, method));

    if (rule && originAllowed(origin, rule.origins)) {
      const response = NextResponse.next();

      // Apply CORS + security headers
      applyCorsHeaders(response, origin, rule.methods);

      // Handle preflight OPTIONS request
      if (method === "OPTIONS") {
        return new NextResponse(null, {
          status: 204,
          headers: response.headers,
        });
      }

      return response;
    }

    // Block other external origins
    return new NextResponse("Forbidden: CORS", { status: 403 });
  }

  // ---------------- Internal requests (no Origin header) ----------------
  const response = NextResponse.next();
  // setSecurityHeaders(response);
  return response;
}

// ---------------- Middleware matcher ----------------
export const config = {
  matcher: ["/api/:path*"],
};