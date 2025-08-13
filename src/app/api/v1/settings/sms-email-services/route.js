import { NextResponse } from "next/server";
import authDbConnect from "@/lib/mongodb/authDbConnect";
import vendorDbConnect from "@/lib/mongodb/vendorDbConnect";
import getAuthenticatedUser from "../../auth/utils/getAuthenticatedUser";
import { vendorModel } from "@/models/vendor/Vendor";
import { applyRateLimit } from "@/lib/rateLimit/rateLimiter";
import { smsProviderDTOSchema, emailProviderDTOSchema } from "./smsAndEmailServicesDTOSchema";
import mongoose from "mongoose";

export async function POST(request) {
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
        const body = await request.json();
        const { provider } = body;

        let parsed;
        let providerConfig;
        let providerField;

        // Validate and parse based on provider type
        if (["bulk_sms_bd", "alpha_net_bd", "adn_diginet_bd"].includes(provider)) {
            parsed = smsProviderDTOSchema.safeParse(body);
            providerField = `smsProviders.${provider}`;
            providerConfig = {
                apiKey: body.apiKey,
                senderId: body.senderId,
                // Add other SMS provider specific fields from your schema
                isActive: true,
                updatedAt: new Date()
            };
        } else if (provider === "smtp") {
            parsed = emailProviderDTOSchema.safeParse(body);
            providerField = `emailProviders.smtp`;
            providerConfig = {
                host: body.host,
                port: body.port,
                username: body.username,
                password: body.password,
                // Add other Email provider specific fields from your schema
                active: true, // Note: Your schema uses 'active' instead of 'isActive'
                updatedAt: new Date()
            };
        } else {
            return NextResponse.json({ error: "Unsupported provider" }, { status: 400 });
        }

        if (!parsed.success) {
            return NextResponse.json(
                { error: "Invalid input", issues: parsed.error.flatten() },
                { status: 422 }
            );
        }

        // // Authentication
        // const { authenticated, error: authError, data } = await getAuthenticatedUser(request);
        // if (!authenticated) {
        //     return NextResponse.json({ error: authError || "Not authorized" }, { status: 401 });
        // }

        // if (!mongoose.Types.ObjectId.isValid(data.userId)) {
        //     return NextResponse.json({ error: "Invalid user ID format" }, { status: 400 });
        // }

        const { shop: referenceId } = parsed.data;

        const vendor_db = await vendorDbConnect();
        const Vendor = vendorModel(vendor_db);

        const updateOperation = {
            $set: {
                [providerField]: providerConfig
            }
        };

        const permissionFilter = {
            referenceId,
            $or: [
                // { ownerId: data.userId },
                {
                    staffs: {
                        $elemMatch: {
                            // userId: new mongoose.Types.ObjectId(data.userId),
                            status: "active",
                            permission: { $in: ["w:sms-provider", "w:email-provider", "w:shop"] }
                        },
                    },
                },
            ],
        };

        const updatedVendor = await Vendor.findOneAndUpdate(
            permissionFilter,
            updateOperation,
            { new: true, upsert: false }
        );

        if (!updatedVendor) {
            return NextResponse.json(
                { success: false, message: "Shop not found or you don't have permission" },
                { status: 404 }
            );
        }

        return NextResponse.json(
            {
                success: true,
                message: `${provider} configuration updated successfully`,
                data: {
                    provider,
                    config: providerConfig
                }
            },
            { status: 200 }
        );

    } catch (error) {
        console.error("Internal error:", error);
        return NextResponse.json(
            {
                error: error.message || "Failed to update provider",
                stack: process.env.NODE_ENV !== 'production' ? error.stack : undefined
            },
            { status: 500 }
        );
    }
}