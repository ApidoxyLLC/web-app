import { NextResponse } from "next/server";
import authDbConnect from "@/lib/mongodb/authDbConnect";
import { userModel } from "@/models/auth/User";
import securityHeaders from "../utils/securityHeaders";
import { z } from 'zod';
import getAuthenticatedUser from "../auth/utils/getAuthenticatedUser";
import { applyRateLimit } from "@/lib/rateLimit/rateLimiter";
import getUserByIdentifier from "@/services/user/getUserByIdentifier";

export const dynamic = 'force-dynamic';

// Search schema validation
const searchSchema = z.object({
  email: z.string().email("Invalid email format").optional(),
  phone: z.string().min(6, "Phone number must be at least 6 characters").max(20, "Phone number too long").regex(/^[0-9+]+$/, "Phone number can only contain numbers and +").optional(),
  username: z.string().min(3, "Username must be at least 3 characters").max(30, "Username too long").regex(/^[a-zA-Z0-9_]+$/, "Username can only contain letters, numbers and underscores").optional()
}).strict().refine(data => {
  // Count how many search parameters are provided
  const paramCount = [data.email, data.phone, data.username].filter(Boolean).length;
  return paramCount === 1;
}, {
  message: "Exactly one search parameter (email, phone, or username) must be provided",
  path: ["search_parameter"]
});

export async function GET(request) {
    const ip = request.headers['x-forwarded-for']?.split(',')[0]?.trim() || request.headers['x-real-ip'] || request.socket?.remoteAddress || '';
    const { allowed, retryAfter } = await applyRateLimit({ key: ip });
    if (!allowed) return NextResponse.json({ error: 'Too many requests. Please try again later.' }, { status: 429, headers: { 'Retry-After': retryAfter.toString() } } );

    const { authenticated, error, data } = await getAuthenticatedUser(request);
    if (!authenticated) return NextResponse.json({ error: "Not authorized" }, { status: 401 });

    // Get search parameters from URL
    const { searchParams } = new URL(request.url);
    const params = {};
    if (searchParams.get('email')) params.email = searchParams.get('email');
    if (searchParams.get('phone')) params.phone = searchParams.get('phone');
    if (searchParams.get('username')) params.username = searchParams.get('username');
    // Validate input
    const parsed = searchSchema.safeParse(params);
    if (!parsed.success) 
    return NextResponse.json( { success: false, error: parsed.error.format() },{ status: 400, headers: securityHeaders } );
    
    try {
        // Connect to database
        const db = await authDbConnect();
        const User = userModel(db);

        // Build search query based on provided parameter
        const searchQuery = {       isDeleted: false,
                              'lock.isLocked': false   };

        if (parsed.data.email) {
          searchQuery.email           = parsed.data.email;
          searchQuery.isEmailVerified = true;
        } else if (parsed.data.phone) {
          searchQuery.phone           = parsed.data.phone;
          searchQuery.isPhoneVerified = true;
        } else if (parsed.data.username) {
          searchQuery.username        = parsed.data.username;
        }
        console.log(searchQuery)
        // Find user with conditions
        const user = await User.findOne(searchQuery).select('referenceId name username avatar email phone status createdAt');

        if (!user) {
        return NextResponse.json(
            { success: false, error: "Active user not found or account is locked" },
            { status: 404, headers: securityHeaders }
        );
        }

        // Prepare safe user data to return
        const userData = {         id: user.referenceId,
                                name: user.name,
                            username: user.username,
                            avatar: user.avatar,
                                email: user.email,
                                phone: user.phone,
                            status: user.status,
                            createdAt: user.createdAt           };

        return NextResponse.json({ success: true, data: userData },{ status: 200, headers: securityHeaders });

    } catch (error) {
        return NextResponse.json( { success: false, error: error.message || "Server error" }, { status: 500, headers: securityHeaders });
    }
}