// middleware.js
import { NextResponse } from "next/server";

// ---------------- Security + CORS helper ----------------
export function applySecurityAndCorsHeaders(response, options = {}) {
  const { origin = null, methods = [] } = options;

  // ---------------- Security headers ----------------
  const securityHeaders = {
    "X-Frame-Options": "DENY",
    "Expect-CT": "max-age=86400, enforce",
    "Referrer-Policy": "no-referrer",
    "Strict-Transport-Security": "max-age=63072000; includeSubDomains; preload",
    "X-DNS-Prefetch-Control": "off",
    "X-Download-Options": "noopen",
    "X-Permitted-Cross-Domain-Policies": "none",
    "X-XSS-Protection": "0",
  };

  Object.entries(securityHeaders).forEach(([key, value]) => {
    response.headers.set(key, value);
  });

  // ---------------- CORS headers (optional) ----------------
  if (origin && methods.length > 0) {
    response.headers.set("Access-Control-Allow-Origin", origin);
    response.headers.set("Access-Control-Allow-Methods", methods.join(","));
    response.headers.set(
      "Access-Control-Allow-Headers",
      "Content-Type, Authorization"
    );
  }

  return response;
}

// ---------------- CORS config ----------------
export const corsConfig = [
  {
    path: "/api/v1/user/register",
    methods: ["POST"],
    origins: ["https://*.localhost:3001", "http://localhost:3001"],
  },
  {
    path: "/api/v1/user/login",
    methods: ["POST"],
    origins: ["https://*.localhost:3001", "http://localhost:3001"],
  },
  {
    path: "/api/v1/user/session",
    methods: ["GET"],
    origins: ["https://*.localhost:3001", "http://localhost:3001"],
  },
];

// ---------------- Utility functions ----------------
function matchRule(config, pathname, method) {
  return pathname.startsWith(config.path) && config.methods.includes(method);
}

function originAllowed(origin, allowedOrigins) {
  return allowedOrigins.some((pattern) => {
    if (pattern.includes("*")) {
      const regex = new RegExp("^" + pattern.replace("*", "[^.]+") + "$");
      return regex.test(origin);
    }
    return origin === pattern;
  });
}

// ---------------- Middleware ----------------
export async function middleware(request) {
  const origin = request.headers.get("origin") || "";
  const pathname = request.nextUrl.pathname;
  const method = request.method;

  // ---------------- Handle CORS for allowed routes ----------------
  if (origin) {
    const rule = corsConfig.find((cfg) => matchRule(cfg, pathname, method));

    if (rule && originAllowed(origin, rule.origins)) {
      const response = NextResponse.next();
      applySecurityAndCorsHeaders(response, {
        origin,
        methods: rule.methods,
      });

      // Preflight OPTIONS request
      if (method === "OPTIONS")
        return new NextResponse(null, { status: 204, headers: response.headers });

      return response;
    }

    // Block external origins for disallowed routes/methods
    return new NextResponse("Forbidden: CORS", { status: 403 });
  }

  // ---------------- Internal requests (no origin header) ----------------
  const response = NextResponse.next();

  // Log IP if needed
  const forwardedFor = request.headers.get("x-forwarded-for");
  const ip = forwardedFor?.split(",")[0]?.trim() || request.ip || "unknown";
  console.log("IP Address:", ip);

  applySecurityAndCorsHeaders(response);
  return response;
}

// ---------------- Matcher ----------------
export const config = {
  matcher: ["/api/:path*"],
};