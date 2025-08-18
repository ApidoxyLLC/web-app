import { NextResponse } from 'next/server';
import { applyRateLimit } from '@/lib/rateLimit/rateLimiter';
// import { hashPassword } from '@/lib/crypto/password';
import { authenticationStatus } from '../../middleware/auth';
import { changePasswordDTOSchema } from './changePasswordDTOSchema';


export async function POST(request) {
    // Rate limiting
    const forwarded = request.headers.get("x-forwarded-for");
    const ip = forwarded?.split(",")[0]?.trim() || request.headers.get("x-real-ip") || request.socket?.remoteAddress || "unknown";

    const { allowed, retryAfter } = await applyRateLimit({ key: ip, scope: "change-password" });
    if (!allowed) {
        return NextResponse.json(
            { error: `Too many requests. Retry after ${retryAfter}s.` },
            { status: 429 }
        );
    }

    // Parse request body
    let body;
    try {
        body = await request.json();
    } catch {
        return NextResponse.json(
            { error: "Invalid JSON" },
            { status: 400 }
        );
    }

    const parsed = changePasswordDTOSchema.safeParse(body);
    if (!parsed.success) {
        return NextResponse.json(
            { error: "Validation failed", details: parsed.error.flatten() },
            { status: 422 }
        );
    }

    const { currentPassword, newPassword } = parsed.data;

    const authResult = await authenticationStatus(request);

    if (!authResult.success) {
        return NextResponse.json(
            { error: authResult.error || "Unauthorized" },
            { status: 401 }
        );
    }

    const { data: authData, vendor } = authResult;
    const userId = authData.userId || authData.sub; 

    try {
        const db = await dbConnect({ dbKey: vendor.dbInfo.dbName, dbUri: vendor.dbInfo.dbUri });
        const User = db.model('User');

        const user = await User.findById(userId);
        if (!user) {
            return NextResponse.json(
                { error: "User not found" },
                { status: 404 }
            );
        }

        const isPasswordValid = await user.comparePassword(currentPassword);
        if (!isPasswordValid) {
            return NextResponse.json(
                { error: "Current password is incorrect" },
                { status: 401 }
            );
        }

        // user.password = await hashPassword(newPassword);
        await user.save();

        await invalidateAllSessions({
            userId: user._id,
            vendorId: vendor._id,
            db 
        });

        return NextResponse.json(
            { message: "Password changed successfully" },
            { status: 200 }
        );

    } catch (err) {
        console.error("Change password error:", err);
        return NextResponse.json(
            { error: err.message || "Failed to change password" },
            { status: 500 }
        );
    }
}

async function invalidateAllSessions({ userId, vendorId, db }) {
    try {
        // Example implementation - adjust based on your session storage
        const Session = db.model('Session');
        await Session.updateMany(
            { userId, vendorId, active: true },
            { $set: { active: false } }
        );
    } catch (err) {
        console.error("Failed to invalidate sessions:", err);
        // Fail silently as this is non-critical
    }
}