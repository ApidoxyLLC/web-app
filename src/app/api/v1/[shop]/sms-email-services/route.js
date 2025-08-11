import { NextResponse } from "next/server";
import authDbConnect from "@/lib/mongodb/authDbConnect";
import vendorDbConnect from "@/lib/mongodb/vendorDbConnect";
import getAuthenticatedUser from "../../auth/utils/getAuthenticatedUser";
import { vendorModel } from "@/models/vendor/Vendor";
import { applyRateLimit } from "@/lib/rateLimit/rateLimiter";
import mongoose from "mongoose";

export async function GET(request, { params }) {
    const ip =
        request.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
        request.headers['x-real-ip'] ||
        request.socket?.remoteAddress || '';

    const { allowed, retryAfter } = await applyRateLimit({ key: ip, scope: 'getSmsEmail' });
    if (!allowed) {
        return NextResponse.json(
            { error: 'Too many requests. Please try again later.' },
            { status: 429, headers: { 'Retry-After': retryAfter.toString() } }
        );
    }

    try {
        const { shop: referenceId } = await params;
        if (!referenceId) {
            return NextResponse.json(
                { error: "Shop reference is required" },
                { status: 400 }
            );
        }

        // const { authenticated, error: authError, data } = await getAuthenticatedUser(request);
        // if (!authenticated) {
        //     return NextResponse.json(
        //         { error: authError || "Not authorized" },
        //         { status: 401 }
        //     );
        // }

        const vendor_db = await vendorDbConnect();
        const Vendor = vendorModel(vendor_db);

        const permissionFilter = {
            referenceId,
            $or: [
                // { ownerId: data.userId },
                {
                    stuffs: {
                        $elemMatch: {
                            // userId: new mongoose.Types.ObjectId(data.userId),
                            status: "active",
                            permission: { $in: ["r:sms-provider", "r:email-provider", "r:shop"] }
                        }
                    }
                }
            ]
        };

        const vendorData = await Vendor.findOne(permissionFilter)
            .select("marketing.smsProviders marketing.emailProviders")
            .lean();

        const providers = {
            smsProviders: vendorData?.marketing?.smsProviders || null,
            emailProviders: vendorData?.marketing?.emailProviders || null
        };

        if (!providers.smsProviders && !providers.emailProviders) {
            return NextResponse.json(
                {
                    success: true,
                    data: null,
                    message: "No SMS/Email provider configuration found"
                },
                { status: 200 }
            );
        }

        return NextResponse.json({ success: true, data: providers }, { status: 200 });

    } catch (error) {
        console.log("GET SMS/Email Services Error:", error);
        return NextResponse.json(
            {
                error: error.message || "Failed to retrieve provider data",
                stack: process.env.NODE_ENV !== 'production' ? error.stack : undefined
            },
            { status: 500 }
        );
    }
}

// ================= DELETE =================
export async function DELETE(request, { params }) {
    try {
        const { shop: referenceId } = await params;
        if (!referenceId) {
            return NextResponse.json(
                { error: "Shop reference is required" },
                { status: 400 }
            );
        }

        const { authenticated, error: authError, data } = await getAuthenticatedUser(request);
        if (!authenticated) {
            return NextResponse.json(
                { error: authError || "Not authorized" },
                { status: 401 }
            );
        }

        const vendor_db = await vendorDbConnect();
        const Vendor = vendorModel(vendor_db);

        const permissionFilter = {
            referenceId,
            $or: [
                { ownerId: data.userId },
                {
                    stuffs: {
                        $elemMatch: {
                            userId: new mongoose.Types.ObjectId(data.userId),
                            status: "active",
                            permission: { $in: ["d:sms-provider", "d:email-provider", "d:shop"] }
                        }
                    }
                }
            ]
        };

        // Remove both smsProviders and emailProviders
        const updateResult = await Vendor.updateOne(permissionFilter, {
            $set: {
                "marketing.smsProviders": [],
                "marketing.emailProviders": []
            }
        });

        if (updateResult.matchedCount === 0) {
            return NextResponse.json(
                { error: "No permission or shop not found" },
                { status: 404 }
            );
        }

        return NextResponse.json(
            { success: true, message: "SMS/Email providers deleted successfully" },
            { status: 200 }
        );

    } catch (error) {
        console.error("DELETE SMS/Email Services Error:", error);
        return NextResponse.json(
            {
                error: error.message || "Failed to delete provider data",
                stack: process.env.NODE_ENV !== 'production' ? error.stack : undefined
            },
            { status: 500 }
        );
    }
}
