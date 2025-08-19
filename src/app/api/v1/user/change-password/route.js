import { NextResponse } from 'next/server';
import { applyRateLimit } from '@/lib/rateLimit/rateLimiter';
import { authenticationStatus } from '../../middleware/auth';
import { changePasswordDTOSchema } from './changePasswordDTOSchema';
import { dbConnect } from '@/lib/mongodb/db';
import { userModel } from '@/models/shop/shop-user/ShopUser';
import bcrypt from 'bcryptjs';

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

    // Validate request body
    const parsed = changePasswordDTOSchema.safeParse(body);
    if (!parsed.success) {
        return NextResponse.json(
            { error: "Validation failed", details: parsed.error.flatten() },
            { status: 422 }
        );
    }

    const { currentPassword, newPassword } = parsed.data;

    try {
        // Authentication with improved error handling
        const authResult = await authenticationStatus(request);
        if (!authResult.success) {
            console.error('Authentication failed:', authResult.error);
            return NextResponse.json(
                {
                    error: authResult.error.includes('Decryption failed') ?
                        'Authentication system error' : authResult.error
                },
                { status: 401 }
            );
        }

        const { data: authData, vendor } = authResult;
        const userId = authData.userId || authData.sub;

        // Database connection
        const db = await dbConnect({ dbKey: vendor.dbInfo.dbName, dbUri: vendor.dbInfo.dbUri });
        const User = userModel(db);

        // Find user
        const user = await User.findById(userId);
        if (!user) {
            return NextResponse.json(
                { error: "User not found" },
                { status: 404 }
            );
        }

        // Verify current password
        if (!user.security?.password) {
            return NextResponse.json(
                { error: "Password not set for this account" },
                { status: 400 }
            );
        }

        const isPasswordValid = await bcrypt.compare(currentPassword, user.security.password);
        if (!isPasswordValid) {
            return NextResponse.json(
                { error: "Current password is incorrect" },
                { status: 401 }
            );
        }

        // Hash new password
        const SALT_ROUNDS = parseInt(process.env.END_USER_BCRYPT_SALT_ROUNDS || "10", 10);
        const salt = await bcrypt.genSalt(SALT_ROUNDS);
        const hashedPassword = await bcrypt.hash(newPassword, salt);

        // Update user
        user.security = {
            ...user.security,
            password: hashedPassword,
            passwordUpdatedAt: new Date(),
            sessionVersion: (user.security.sessionVersion || 0) + 1
        };

        await user.save();

        return NextResponse.json(
            { success: true, message: "Password changed successfully" },
            { status: 200 }
        );

    } catch (err) {
        console.error("Change password error:", err);

        // Specific handling for decryption errors
        if (err.message.includes('Decryption failed')) {
            return NextResponse.json(
                { error: "Authentication system error. Please try again later." },
                { status: 500 }
            );
        }

        return NextResponse.json(
            { error: err.message || "Failed to change password" },
            { status: 500 }
        );
    }
}