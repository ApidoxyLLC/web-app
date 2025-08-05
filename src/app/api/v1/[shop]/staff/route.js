import { NextResponse } from "next/server";
import authDbConnect from "@/lib/mongodb/authDbConnect";
import vendorDbConnect from "@/lib/mongodb/vendorDbConnect";
import getAuthenticatedUser from "../../auth/utils/getAuthenticatedUser";
import { applyRateLimit } from "@/lib/rateLimit/rateLimiter";
import mongoose from "mongoose";

export async function GET(request, { params }) {
    // Rate limiting
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
        request.headers.get('x-real-ip') ||
        request.socket?.remoteAddress || '';
    
    const { allowed, retryAfter } = await applyRateLimit({ 
        key: ip, 
        scope: 'getVendorStaff' 
    });
    
    if (!allowed) {
        return NextResponse.json(
            { error: 'Too many requests. Please try again later.' },
            { status: 429, headers: { 'Retry-After': retryAfter.toString() } }
        );
    }

    try {
        const { shop: referenceId } = params;
        console.log("Shop Reference ID:", referenceId);

        if (!referenceId) {
            return NextResponse.json(
                { error: "Shop reference is required" },
                { status: 400 }
            );
        }

        // Authentication
        const { authenticated, error: authError, data: authUser } = await getAuthenticatedUser(request);
        if (!authenticated) {
            return NextResponse.json(
                { error: authError || "Not authorized" },
                { status: 401 }
            );
        }

        // Connect to databases
        const [authDb, vendorDb] = await Promise.all([
            authDbConnect(),
            vendorDbConnect()
        ]);

        // Get models
        const User = authDb.models.User || authDb.model('User');
        const Vendor = vendorDb.models.Vendor || vendorDb.model('Vendor');

        // Check if user has permission to view staff
        const permissionFilter = {
            referenceId,
            $or: [
                { ownerId: authUser.userId },
                {
                    staffs: {
                        $elemMatch: {
                            userId: new mongoose.Types.ObjectId(authUser.userId),
                            status: "active",
                            permission: { $in: ["r:shop", "r:staff"] }
                        }
                    }
                }
            ]
        };

        const vendor = await Vendor.findOne(permissionFilter);
        if (!vendor) {
            return NextResponse.json(
                { error: "Vendor not found or you don't have permission" },
                { status: 404 }
            );
        }

        // Get all active staff user IDs
        const activeStaffUserIds = vendor.staffs
            .filter(staff => staff.status === 'active')
            .map(staff => staff.userId);

        if (activeStaffUserIds.length === 0) {
            return NextResponse.json(
                { data: [], message: "No active staff found" },
                { status: 200 }
            );
        }

        // Aggregate user data with staff information
        const staffUsers = await User.aggregate([
            {
                $match: {
                    _id: { $in: activeStaffUserIds }
                }
            },
            {
                $project: {
                    _id: 1,
                    referenceId: 1,
                    name: 1,
                    email: 1,
                    phone: 1,
                    avatar: 1,
                    role: 1,
                    isVerified: 1,
                    createdAt: 1
                }
            },
            {
                $lookup: {
                    from: 'vendors',
                    let: { userId: "$_id" },
                    pipeline: [
                        {
                            $match: {
                                referenceId: referenceId,
                                "staffs.userId": { $in: activeStaffUserIds }
                            }
                        },
                        {
                            $unwind: "$staffs"
                        },
                        {
                            $match: {
                                $expr: { $eq: ["$staffs.userId", "$$userId"] }
                            }
                        },
                        {
                            $project: {
                                designation: "$staffs.designation",
                                status: "$staffs.status",
                                permissions: "$staffs.permission",
                                startDate: "$staffs.startDate"
                            }
                        }
                    ],
                    as: "staffInfo"
                }
            },
            {
                $unwind: "$staffInfo"
            },
            {
                $addFields: {
                    designation: "$staffInfo.designation",
                    staffStatus: "$staffInfo.status",
                    permissions: "$staffInfo.permissions",
                    startDate: "$staffInfo.startDate"
                }
            },
            {
                $project: {
                    staffInfo: 0
                }
            },
            {
                $sort: {
                    "staffInfo.startDate": -1
                }
            }
        ]);

        return NextResponse.json(
            {
                success: true,
                data: staffUsers,
                count: staffUsers.length
            },
            { status: 200 }
        );

    } catch (error) {
        console.error("GET Vendor Staff Error:", error);
        return NextResponse.json(
            {
                error: error.message || "Failed to retrieve staff data",
                stack: process.env.NODE_ENV !== 'production' ? error.stack : undefined
            },
            { status: 500 }
        );
    }
}