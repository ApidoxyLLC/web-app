import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { dbConnect } from "@/lib/mongodb/db";
import { userModel } from "@/models/shop/shop-user/ShopUser";
import { applyRateLimit } from "@/lib/rateLimit/rateLimiter";
import { getInfrastructure } from "@/services/vendor/getInfrastructure";
import { changePasswordDTOSchema } from "./changePasswordDTOSchema";
import { authenticationStatus } from "../../middleware/auth";

export async function POST(request) {
    let body;
    try {
        body = await request.json();
    } catch {
        return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }

    const parsed = changePasswordDTOSchema.safeParse(body);
    if (!parsed.success) {
        return NextResponse.json(
            { error: "Validation failed", details: parsed.error.flatten() },
            { status: 422 }
        );
    }

    const { currentPassword, newPassword } = parsed.data;

    const referenceId = request.headers.get("x-vendor-identifier");
    const host = request.headers.get("host");
    if (!referenceId && !host) {
        return NextResponse.json(
            { error: "Missing vendor identifier or host" },
            { status: 400 }
        );
    }


    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || request.headers.get('x-real-ip') || request.socket?.remoteAddress || '';
    const { allowed, retryAfter } = await applyRateLimit({
        key: `${host}${ip}`,
        scope: "change-password",
    });
    if (!allowed) {
        return NextResponse.json(
            { error: "Too many requests. Please try again later." },
            {
                status: 429,
                headers: { "Retry-After": retryAfter.toString() },
            }
        );
    }

    try {
        // authenticate user
        const { success: authenticated, vendor, data: authData, isTokenRefreshed, token, db } = await authenticationStatus(request);
        if (!authenticated) return NextResponse.json({ error: authResult.error || "Unauthorized" }, { status: 401 });

        console.log(authData, vendor)
        const userId = authData.userId

        const User = userModel(db);
        const user = await User.findById(userId)
                               .select('+security.password')
                               .lean();
        console.log(user);
        if (!user) {
            return NextResponse.json({ error: "User not found" }, { status: 404 });
        }

        if (!user.security?.password) {
            return NextResponse.json(
                { error: "Password not set for this account" },
                { status: 400 }
            );
        }

        const isPasswordValid = await bcrypt.compare(
            currentPassword,
            user.security.password
        );
        if (!isPasswordValid) {
            return NextResponse.json(
                { error: "Current password is incorrect" },
                { status: 401 }
            );
        }

        // const commonPasswords = ["password", "12345678", "qwerty123"];
        // if (commonPasswords.includes(newPassword.toLowerCase())) {
        //     return NextResponse.json(
        //         { error: "Common password provided, change the password" },
        //         { status: 422 }
        //     );
        // }

        const SALT_ROUNDS = parseInt(
            process.env.END_USER_BCRYPT_SALT_ROUNDS || "10",
            10
        );
        const salt = await bcrypt.genSalt(SALT_ROUNDS);
        const hashedPassword = await bcrypt.hash(newPassword, salt);

        user.security = {
            ...user.security,
            password: hashedPassword,
            passwordUpdatedAt: new Date(),
            sessionVersion: (user.security.sessionVersion || 0) + 1, 
        };

        await User.updateOne(
            { _id: userId },
            {
                $set: {
                    'security.password': hashedPassword,
                    'security.passwordUpdatedAt': new Date(),
                    'security.sessionVersion': (user.security.sessionVersion || 0) + 1
                }
            }
        );
        return NextResponse.json(
            { success: true, message: "Password changed successfully" },
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
