import { NextResponse } from "next/server";
import authDbConnect from "@/lib/mongodb/authDbConnect";
import vendorDbConnect from "@/lib/mongodb/vendorDbConnect";
import getAuthenticatedUser from "../auth/utils/getAuthenticatedUser";
import { shopModel } from "@/models/auth/Shop";
import { applyRateLimit } from "@/lib/rateLimit/rateLimiter";
import { vendorModel } from "@/models/vendor/Vendor";
import deliveryPartnerDTOSchema from "./deliveryPartnerDTOSchema";
import mongoose from "mongoose";

export async function POST(request) {
    // Rate limiting
    const ip = request.headers['x-forwarded-for']?.split(',')[0]?.trim() || request.headers['x-real-ip'] || request.socket?.remoteAddress || '';
    const { allowed, retryAfter } = await applyRateLimit({ key: ip });
    if (!allowed) return NextResponse.json( { error: 'Too many requests. Please try again later.' }, { status: 429, headers: { 'Retry-After': retryAfter.toString() } } );
    
    // Validate input first
    let body;
    try { body = await request.json(); 
        const parsed = deliveryPartnerDTOSchema.safeParse(body);
        if (!parsed.success) 
            return NextResponse.json({ error: "Invalid input", issues: parsed.error.flatten() }, { status: 422 } );

        // Authentication
        const { authenticated, error: authError, data } = await getAuthenticatedUser(request);
        if (!authenticated) 
            return NextResponse.json( { error: authError || "Not authorized" }, { status: 401 } );    

        if (!mongoose.Types.ObjectId.isValid(data.userId)) 
            return NextResponse.json({ error: "Invalid user ID format" }, { status: 400 } );

        try {
              const { shop: referenceId, partner, ...inputs } = parsed.data;

              // Connect to databases
              const auth_db = await authDbConnect();
              const vendor_db = await vendorDbConnect();
              const Shop = shopModel(auth_db);
              const Vendor = vendorModel(vendor_db);

              // const pipeline = getSocialLinksUpdatePipeline(updatesArray);
              const pipeline =  [
                                    {
                                        $set: {
                                            deliveryPartner: {
                                            $mergeObjects: [
                                                    { $ifNull: ["$deliveryPartner", {}] }, // Ensure deliveryPartner exists
                                                    { [partner]: inputs } // Update the specific courier (pathao/steadfast)
                                                ]
                                            }
                                        }
                                    }
                                ];
              const permissionFilter = {
                                            referenceId, 
                                            $or: [
                                                    { ownerId: data.userId },
                                                    { 
                                                        stuffs: {
                                                            $elemMatch: {
                                                                userId: new mongoose.Types.ObjectId(data.userId),
                                                                status: "active",
                                                                permission: { $in: ["w:delivery-partner", "w:shop"] }
                                                            }
                                                        }
                                                    }
                                                ]
                                        };
              const [updatedVendor, updatedShop] = await Promise.all([ Vendor.updateOne(permissionFilter, pipeline), 
                                                                         Shop.updateOne(permissionFilter, pipeline)])

            if (updatedVendor.matchedCount === 0 && updatedShop.matchedCount === 0) 
                return NextResponse.json({ success: false,  message: "Shop not found or you don't have permission" }, { status: 404 });

            return NextResponse.json({ success: true, message: "Delivery partner updated successfully" }, { status: 200 });
          } catch (error) {
              return NextResponse.json({
                  error: error.message || "Failed to update Delivery partner", stack: process.env.NODE_ENV !== 'production' ? error.stack : undefined }, { status: 500 });
          }

    } catch (error) {
        console.log(error)
        return NextResponse.json( { error: "Invalid JSON" },  { status: 400 } );
    } 
}