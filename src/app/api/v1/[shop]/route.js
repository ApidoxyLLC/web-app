import { NextResponse } from "next/server";
import vendorDbConnect from "@/lib/mongodb/vendorDbConnect";
import { vendorModel } from "@/models/vendor/Vendor";
import { applyRateLimit } from "@/lib/rateLimit/rateLimiter";
import mongoose from "mongoose";
import getAuthenticatedUser from "../auth/utils/getAuthenticatedUser";


const ALL_SAFE_FIELDS = {     referenceId: 1,
                             businessName: 1,
                                 location: 1,
                                  country: 1,
                                 industry: 1,
                                    email: 1,
                                    phone: 1,
                                 policies: 1,
                              socialLinks: 1,
                             notification: 1,
                              chatSupport: 1,
                          deliveryCharges: 1,
                                     logo: 1
                        };

const SECTION_FIELDS = {   configuration: ['businessName', 'location', 'country', 'industry', 'email', 'phone', 'logo'],
                                  policy: ['policies'],
                             socialLinks: ['socialLinks'],
                         realTimeUpdates: ['notification'],
                             supportChat: ['chatSupport'],
                                delivery: ['deliveryCharges'] };

export async function GET(request, { params }) {
    // Rate limiting
    const ip = request.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
        request.headers['x-real-ip'] ||
        request.socket?.remoteAddress || '';
    const { allowed, retryAfter } = await applyRateLimit({ key: ip, scope: 'getVendorConfig' });
    if (!allowed) {
        return NextResponse.json(
            { error: 'Too many requests. Please try again later.' },
            { status: 429, headers: { 'Retry-After': retryAfter.toString() } }
        );
    }

    try {
        const { shop: referenceId } = await params;
        const url = new URL(request.url);
        const sections = url.searchParams.get('sections') || '';
        const sectionList = sections.split(',').filter(Boolean);

        if (!referenceId) {
            return NextResponse.json(
                { error: "Vendor reference is required" },
                { status: 400 }
            );
        }


        // Authentication
        const { authenticated, error: authError, data } = await getAuthenticatedUser(request);
        if (!authenticated) {
            return NextResponse.json(
                { error: authError || "Not authorized" },
                { status: 401 }
            );
        }

        if (!mongoose.Types.ObjectId.isValid(data.userId)) {
            return NextResponse.json(
                { error: "Invalid user ID format" },
                { status: 400 }
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
                            permission: { $in: ["r:vendor", "r:configuration"] }
                        }
                    }
                }
            ]
        };

        let projection = { _id: 0 };

        if (sectionList.length > 0) {
            sectionList.forEach(section => {
                if (SECTION_FIELDS[section]) {
                    SECTION_FIELDS[section].forEach(field => {
                        projection[field] = 1;
                    });
                }
            });
            projection.referenceId = 1;
        } else {
            projection = { ...ALL_SAFE_FIELDS, _id: 0 };
        }

        const vendorData = await Vendor.findOne(permissionFilter)
                                       .select(projection)
                                       .lean();

        if (!vendorData) {
            return NextResponse.json(
                {
                    success: true,
                    data: null,
                    message: "No vendor configuration found"
                },
                { status: 200 }
            );
        }

        const responseData = { referenceId: vendorData.referenceId };

        if (sectionList.length > 0) {
            sectionList.forEach(section => {
                switch (section) {
                    case 'configuration':
                        responseData.configuration = {
                            businessName: vendorData.businessName,
                            location: vendorData.location,
                            country: vendorData.country,
                            industry: vendorData.industry,
                            logo: vendorData.logo,
                            contact: {
                                email: vendorData.email,
                                phone: vendorData.phone
                            }
                            
                        };
                        break;
                    case 'policy':
                        responseData.policy = vendorData.policies || null;
                        break;
                    case 'socialLinks':
                        responseData.socialLinks = vendorData.socialLinks || [];
                        break;
                    case 'realTimeUpdates':
                        responseData.realTimeUpdates = {
                            notification: vendorData.notification || {
                                email: null,
                                preferredChannel: null,
                                hourlyNotification: {
                                    enabled: false,
                                    intervalHours: 1
                                },
                                orderNotifications: {
                                    enabled: false,
                                    frequency: 1
                                }
                            }
                        };
                        break;
                    case 'supportChat':
                        responseData.supportChat = vendorData.chatSupport || null;
                        break;
                    case 'delivery':
                        responseData.delivery = {
                            charges: vendorData.deliveryCharges || []
                        };
                        break;

                }
            });
        } else {
            responseData.configuration = {
                businessName: vendorData.businessName,
                location: vendorData.location,
                country: vendorData.country,
                industry: vendorData.industry,
                logo: vendorData.logo,
                contact: {
                    email: vendorData.email,
                    phone: vendorData.phone
                }
            };
            responseData.policy = vendorData.policies || null;
            responseData.socialLinks = vendorData.socialLinks || [];
            responseData.realTimeUpdates = {
                notification: vendorData.notification || {
                                                            email: null,
                                                            preferredChannel: null,
                                                            hourlyNotification: { enabled: false,  intervalHours: 1 },
                                                            orderNotifications: { enabled: false, frequency: 1 }
                                                        }
            };
            responseData.supportChat = vendorData.chatSupport || null;
            responseData.delivery = { charges: vendorData.deliveryCharges || []   };
        }

        return NextResponse.json({ success: true, data: responseData }, { status: 200 } );

    } catch (error) {
        console.error("GET Vendor Configuration Error:", error);
        return NextResponse.json({ error: error.message || "Failed to retrieve vendor configuration", stack: process.env.NODE_ENV !== 'production' ? error.stack : undefined }, { status: 500 } );
    }
}