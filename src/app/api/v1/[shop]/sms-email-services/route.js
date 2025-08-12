import { NextResponse } from "next/server";
import authDbConnect from "@/lib/mongodb/authDbConnect";
import vendorDbConnect from "@/lib/mongodb/vendorDbConnect";
import getAuthenticatedUser from "../../auth/utils/getAuthenticatedUser";
import { vendorModel } from "@/models/vendor/Vendor";
import { applyRateLimit } from "@/lib/rateLimit/rateLimiter";
import mongoose from "mongoose";
// import { userModel } from "@/models/auth/user";

export async function GET(request, { params }) {
    // Rate limiting
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
        request.headers.get('x-real-ip') ||
        request.socket?.remoteAddress || '';

    const { allowed, retryAfter } = await applyRateLimit({ key: ip });
    if (!allowed) {
        return NextResponse.json(
            { error: 'Too many requests. Please try again later.' },
            { status: 429, headers: { 'Retry-After': retryAfter.toString() } }
        );
    }

    try {
        // Get shop ID from route parameters
        const { shop: referenceId } = await params;
        console.log(referenceId)

        if (!referenceId) {
            return NextResponse.json({ error: "Shop ID is required" }, { status: 400 });
        }


        const { authenticated, error: authError, data } = await getAuthenticatedUser(request);
        if (!authenticated) {
            return NextResponse.json({ error: authError || "Not authorized" }, { status: 401 });
        }

        if (!mongoose.Types.ObjectId.isValid(data.userId)) {
            return NextResponse.json({ error: "Invalid ID format" }, { status: 400 });
        }

        const vendor_db = await vendorDbConnect();
        const Vendor = vendorModel(vendor_db);

        // Permission filter
        const permissionFilter = {
            referenceId,
            $or: [
                { ownerId: data.userId },
                {
                    stuffs: {
                        $elemMatch: {
                            userId: new mongoose.Types.ObjectId(data.userId),
                            status: "active",
                            permission: { $in: ["r:sms-provider", "r:email-provider", "r:shop"] }
                        },
                    },
                },
            ],
        };

        const projection = {
            marketing: 1
        };

        const vendor = await Vendor.findOne(permissionFilter, projection);

        if (!vendor) {
            return NextResponse.json(
                { success: false, message: "Shop not found or you don't have permission" },
                { status: 404 }
            );
        }

        return NextResponse.json(
            {
                success: true,
                data: vendor.marketing || {}
            },
            { status: 200 }
        );

    } catch (error) {
        console.log("Internal error:", error);
        return NextResponse.json(
            {
                error: error.message || "Failed to fetch marketing configurations",
                stack: process.env.NODE_ENV !== 'production' ? error.stack : undefined
            },
            { status: 500 }
        );
    }
}




export async function DELETE(request, { params }) {
    // Rate limiting
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
        request.headers.get('x-real-ip') ||
        request.socket?.remoteAddress || '';

    const { allowed, retryAfter } = await applyRateLimit({ key: ip });
    if (!allowed) {
        return NextResponse.json(
            { error: 'Too many requests. Please try again later.' },
            { status: 429, headers: { 'Retry-After': retryAfter.toString() } }
        );
    }


    try {
        const { shop: referenceId } = await params;
        const body = await request.json();
        const { providerType, providerName } = body;

        if (!referenceId) {
            return NextResponse.json({ error: "Shop ID is required" }, { status: 400 });
        }

        if (!providerType || !["sms", "email"].includes(providerType)) {
            return NextResponse.json({ error: "Valid providerType (sms/email) is required" }, { status: 400 });
        }

        if (!providerName) {
            return NextResponse.json({ error: "providerName is required" }, { status: 400 });
        }
        const { authenticated, error: authError, data } = await getAuthenticatedUser(request);
        if (!authenticated) {
            return NextResponse.json({ error: authError || "Not authorized" }, { status: 401 });
        }

        if (!mongoose.Types.ObjectId.isValid(data.userId)) {
            return NextResponse.json({ error: "Invalid ID format" }, { status: 400 });
        }


        const vendor_db = await vendorDbConnect();
        const Vendor = vendorModel(vendor_db);

        const vendorBefore = await Vendor.findOne({ referenceId });
        console.log("Before deletion:", JSON.stringify(vendorBefore?.marketing, null, 2));

        const fieldPath = `marketing.${providerType === 'sms' ? 'smsProviders' : 'emailProviders'}.${providerName}`;
        const updateOperation = {
            $unset: { [fieldPath]: "" },
            $set: { updatedAt: new Date() }
        };

        const result = await Vendor.updateOne(
            {
                referenceId,
                $or: [
                    { ownerId: data.userId },
                    {
                        stuffs: {
                            $elemMatch: {
                                userId: data.userId,
                                permission: { $in: ["d:sms-provider", "d:email-provider", "d:shop"] }
                            },
                        },
                    },
                ],
            },
            updateOperation
        );

        console.log("Update result:", result);

        const vendorAfter = await Vendor.findOne({ referenceId });
        console.log("After deletion:", JSON.stringify(vendorAfter?.marketing, null, 2));

        if (result.matchedCount === 0) {
            return NextResponse.json(
                { error: "Shop not found or no permission" },
                { status: 404 }
            );
        }

        if (result.modifiedCount === 0) {
            return NextResponse.json(
                { error: "Provider not found or already deleted" },
                { status: 404 }
            );
        }

        return NextResponse.json(
            { success: true, message: `${providerName} provider deleted` },
            { status: 200 }
        );

    } catch (error) {
        console.error("DELETE error:", error);
        return NextResponse.json(
            { error: error.message || "Deletion failed" },
            { status: 500 }
        );
    }
}
