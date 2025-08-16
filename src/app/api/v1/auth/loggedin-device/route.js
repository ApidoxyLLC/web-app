import { NextResponse } from "next/server";
import { applyRateLimit } from "@/lib/rateLimit/rateLimiter";
import getAuthenticatedUser from "../utils/getAuthenticatedUser";
import authDbConnect from "@/lib/mongodb/authDbConnect";
import { sessionModel } from "@/models/auth/Session";

export async function GET(request) {
    // -------------------------------
    // Rate Limiting
    // -------------------------------
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || request.headers.get('x-real-ip') || request.connection?.remoteAddress || '';
    
    const rateLimit = await applyRateLimit({ key: ip });
    if (!rateLimit.allowed) return NextResponse.json({ success: false, error: 'Too many requests. Please try again later.' }, { status: 429, headers: { 'Retry-After': rateLimit.retryAfter.toString() }});

    // -------------------------------
    // Authentication
    // -------------------------------
    const authResult = await getAuthenticatedUser(request);
    if (!authResult.authenticated) return NextResponse.json({ success: false, error: authResult.error || "Not authorized" }, { status: 401 });
    

    try {
        // -------------------------------
        // Query Params (Pagination, Filter, Sorting)
        // -------------------------------
        const { searchParams } = new URL(request.url);
        const             page = Math.max(parseInt(searchParams.get("page") || "1", 10), 1);
        const            limit = Math.min(Math.max(parseInt(searchParams.get("limit") || "10", 10), 1), 100);
        const             skip = (page - 1) * limit;
        const             role = searchParams.get("role");
        const         provider = searchParams.get("provider");
        const         timezone = searchParams.get("timezone");
        const      fingerprint = searchParams.get("fingerprint");
        const        sortField = searchParams.get("sort") || "createdAt";
        const        sortOrder = searchParams.get("order") === "asc" ? 1 : -1;

        // -------------------------------
        // Build MongoDB Query
        // -------------------------------
        const filter = {  userId: authResult.data.userId,
                         revoked: false                     };

        if (role)        filter.role = role;
        if (provider)    filter["providerData.provider"] = provider;
        if (timezone)    filter.timezone = timezone;
        if (fingerprint) filter.fingerprint = { $regex: fingerprint, $options: 'i' };

        // -------------------------------
        // Database Query
        // -------------------------------
        const auth_db = await authDbConnect();
        const Session = sessionModel(auth_db);

        const [totalCount, sessions] = await Promise.all([ Session.countDocuments(filter),
                                                           Session.find(filter)
                                                                  .select("_id userReference fingerprint userAgent role providerData timezone createdAt")
                                                                  .sort({ [sortField]: sortOrder })
                                                                  .skip(skip)
                                                                  .limit(limit)
                                                                  .lean()
                                                        ]);

        if (!sessions || sessions.length === 0) 
            return NextResponse.json( { success: false, error: "No active sessions found" }, { status: 404 } );

        // -------------------------------
        // Transform Output
        // -------------------------------
        const transformedSessions = sessions.map(session => ({           id: session._id,
                                                                       user: session.userReference,
                                                                fingerprint: session.fingerprint,
                                                                  userAgent: session.userAgent,
                                                                       role: session.role,
                                                               providerData: session.providerData,
                                                                   timezone: session.timezone,
                                                                  createdAt: session.createdAt
                                                            }));

        return NextResponse.json({    success: true,
                                   totalCount, page, limit, totalPages: Math.ceil(totalCount / limit),
                                         data: transformedSessions                                      }, { status: 200 });

    } catch (error) {
        console.error("Error in GET /api/sessions:", error);
        return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 } );
    }
}