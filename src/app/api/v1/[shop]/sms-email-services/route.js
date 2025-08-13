import { NextResponse } from "next/server";
import vendorDbConnect from "@/lib/mongodb/vendorDbConnect";
import { vendorModel } from "@/models/vendor/Vendor";
import { applyRateLimit } from "@/lib/rateLimit/rateLimiter";
import mongoose from "mongoose";
import getAuthenticatedUser from "../../auth/utils/getAuthenticatedUser";
// import authDbConnect from "@/lib/mongodb/authDbConnect";
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
        const { shop } = await params;
        console.log(shop)
        if (!shop) {
            return NextResponse.json(
                { error: "Shop ID is required" },
                { status: 400 }
            );
        }

        // Authentication
        const { authenticated, error: authError, data } = await getAuthenticatedUser(request);
        if (!authenticated) {
            return NextResponse.json({ error: authError || "Not authorized" }, { status: 401 });
        }

        const vendor_db = await vendorDbConnect();
        const Vendor = vendorModel(vendor_db);

        const permissionFilter = {
            referenceId: shop,
            $or: [
                { ownerId: data.userId },
                {
                    staffs: {
                        $elemMatch: {
                            userId: new mongoose.Types.ObjectId(data.userId),
                            status: "active",
                            permission: { $in: ["r:sms-provider", "r:email-provider", "r:shop"] }
                        },
                    },
                },
            ],
        };

        console.log(permissionFilter)

        const vendor = await Vendor.findOne(permissionFilter).lean();
        if (!vendor) {
            return NextResponse.json(
                { success: false, message: "Shop not found or you don't have permission" },
                { status: 404 }
            );
        }

        // Extract and structure the provider data
        const responseData = {
            smsProviders: vendor.smsProviders || {
                bulk_sms_bd: null,
                alpha_net_bd: null,
                adn_diginet_bd: null
            },
            emailProviders: vendor.emailProviders || {
                smtp: null
            }
        };


        console.log(responseData)

        return NextResponse.json(
            {
                success: true,
                data: responseData
            },
            { status: 200 }
        );

    } catch (error) {
        console.error("Internal error:", error);
        return NextResponse.json(
            {
                error: error.message || "Failed to fetch provider configurations",
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
        const { shop } =await params;
        const body = await request.json();
        const { provider } = body;

        if (!shop) {
            return NextResponse.json(
                { error: "Shop ID is required" },
                { status: 400 }
            );
        }
        console.log(provider)
        if (!provider) {
            return NextResponse.json(
                { error: "Provider is required in request body" },
                { status: 400 }
            );
        }



        // Validate provider type
        const validProviders = ["bulk_sms_bd", "alpha_net_bd", "adn_diginet_bd", "smtp"];
        if (!validProviders.includes(provider)) {
            return NextResponse.json(
                { error: "Invalid provider type" },
                { status: 400 }
            );
        }

        // Authentication
        const { authenticated, error: authError, data } = await getAuthenticatedUser(request);
        if (!authenticated) {
            return NextResponse.json({ error: authError || "Not authorized" }, { status: 401 });
        }

        const vendor_db = await vendorDbConnect();
        const Vendor = vendorModel(vendor_db);

        let providerField;
        if (["bulk_sms_bd", "alpha_net_bd", "adn_diginet_bd"].includes(provider)) {
            providerField = `smsProviders.${provider}`;
        } else if (provider === "smtp") {
            providerField = `emailProviders.smtp`;
        }

        const permissionFilter = {
            referenceId: shop,
            $or: [
                { ownerId: data.userId },
                {
                    staffs: {
                        $elemMatch: {
                            userId: new mongoose.Types.ObjectId(data.userId),
                            status: "active",
                            permission: { $in: ["d:sms-provider", "d:email-provider", "w:shop"] }
                        },
                    },
                },
            ],
        };

        const updateOperation = {
            $unset: {
                [providerField]: 1
            },
            $set: {
                updatedAt: new Date()
            }
        };

        const updatedVendor = await Vendor.findOneAndUpdate(
            permissionFilter,
            updateOperation,
            { new: true }
        );

        if (!updatedVendor) {
            return NextResponse.json(
                {
                    success: false,
                    message: "Shop not found, configuration doesn't exist, or you don't have permission"
                },
                { status: 404 }
            );
        }

        return NextResponse.json(
            {
                success: true,
                message: `${provider} configuration deleted successfully`,
                data: {
                    provider
                }
            },
            { status: 200 }
        );

    } catch (error) {
        console.error("Internal error:", error);
        return NextResponse.json(
            {
                error: error.message || "Failed to delete provider configuration",
                stack: process.env.NODE_ENV !== 'production' ? error.stack : undefined
            },
            { status: 500 }
        );
    }
}
