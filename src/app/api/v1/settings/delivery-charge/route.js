import { NextResponse } from "next/server";
import vendorDbConnect from "@/lib/mongodb/vendorDbConnect";
import { vendorModel } from "@/models/vendor/Vendor";
import getAuthenticatedUser from "../../auth/utils/getAuthenticatedUser";
import deliveryChargeDTOSchema from "./deliveryChargeDTOSchema";
import { applyRateLimit } from "@/lib/rateLimit/rateLimiter";
import hasAddDeliveryChargePermission from "./hasAddDeliveryChargePermission";

export async function POST(request) {
    let body;
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || request.headers.get('x-real-ip') || request.socket?.remoteAddress || request.connection?.remoteAddress || '';

    // CHANGE: Used destructuring to improve readability
    const { allowed, retryAfter } = await applyRateLimit({ key: ip });
    if (!allowed) return NextResponse.json({ success: false, error: 'Too many requests. Please try again later.' }, { status: 429, headers: { 'Retry-After': retryAfter.toString() } });

    try {
        body = await request.json();
        const parsed = deliveryChargeDTOSchema.safeParse(body);
        if (!parsed.success) return NextResponse.json({ error: "Invalid input", issues: parsed.error.flatten() }, { status: 422 });

        // Authentication
        const { authenticated, error: authError, data } = await getAuthenticatedUser(request);
        if (!authenticated) return NextResponse.json({ error: authError || "Not authorized" }, { status: 401 });

        const { shop: vendorReferenceId, isDefault, isRefundable, chargeBasedOn, regionName, charge, partner } = parsed.data;

        const vendor_db = await vendorDbConnect();
        const Vendor = vendorModel(vendor_db);
        const vendor = await Vendor.findOne({ referenceId: vendorReferenceId }).select('_id deliveryCharges ownerId');
        if (!vendor) return NextResponse.json({ success: false, error: "Request can't proceed " }, { status: 404 });

        if (!hasAddDeliveryChargePermission(vendor, data.userId)) return NextResponse.json({ success: false, error: 'Authorization failed' }, { status: 400  });

        // // -------------------------------
        // // Check for Duplicate Delivery Charge
        // // -------------------------------
        // // Duplicate Check (Improved Logic)
        // const normalizedRegion = regionName.toLowerCase();
        // const duplicateCharge = vendor.deliveryCharges?.find(existingCharge => {
        //     const sameRegionType = existingCharge.chargeBasedOn === chargeBasedOn;
        //     const sameRegionName = existingCharge.regionName.toLowerCase() === normalizedRegion;
        //     if (!sameRegionType || !sameRegionName) return false;
        //     if (existingCharge.partner && partner) return existingCharge.partner === partner;
        //     return !existingCharge.partner && !partner;
        // });

        // if (duplicateCharge) return NextResponse.json({ success: false, error: "Delivery charge already exists for this region and partner", existingCharge: duplicateCharge }, { status: 409 });

        // -------------------------------
        // Create New Delivery Charge
        // -------------------------------

        const newDeliveryCharge = isDefault
                                    ? {    isDefault: true,
                                        isRefundable,
                                              charge,
                                             partner: partner || undefined,
                                        }
                                    : {
                                            isDefault: false,
                                         isRefundable,
                                               charge,
                                              partner: partner || undefined,
                                        chargeBasedOn,
                                           regionName,
                                        };

        let duplicateCharge;

        

        if (isDefault) {
            duplicateCharge = vendor.deliveryCharges?.find(c => c.isDefault);
            if(duplicateCharge){
                const updatedVendor = await Vendor.findOneAndUpdate(
                        { _id: vendor._id, "deliveryCharges._id": duplicateCharge._id },
                        {
                            $set: {
                                "deliveryCharges.$.isDefault": isDefault,
                                "deliveryCharges.$.isRefundable": isRefundable,
                                "deliveryCharges.$.charge": charge,
                                "deliveryCharges.$.partner": partner || undefined,
                                updatedAt: new Date()
                            }
                        },
                        { new: true, projection: { deliveryCharges: 1 } }
                    );

                return NextResponse.json({ success: true, message: "Delivery charge updated successfully", vendor: updatedVendor.deliveryCharges }, { status: 200  });
            } else {
                const updatedVendor = await Vendor.findByIdAndUpdate(
                        vendor._id,
                        { $push: { deliveryCharges: newDeliveryCharge }, $set: { updatedAt: new Date() } },
                        { new: true, projection: { deliveryCharges: 1 } }
                    );
                return NextResponse.json({ success: true, message: "Delivery charge added successfully", vendor: updatedVendor.deliveryCharges }, { status: 200  });

            }
            

            
        } else {
            const normalizedRegion = regionName.toLowerCase();
            duplicateCharge = vendor.deliveryCharges?.find(existingCharge => {
                if (existingCharge.isDefault) return false;
                const sameRegionType = existingCharge.chargeBasedOn === chargeBasedOn;
                const sameRegionName = existingCharge.regionName.toLowerCase() === normalizedRegion;
                if (!sameRegionType || !sameRegionName) return false;
                if (existingCharge.partner && partner) return existingCharge.partner === partner;
                return !existingCharge.partner && !partner;
            });
        }

        

        // if (!isDefault) {
        //     newDeliveryCharge.chargeBasedOn = chargeBasedOn;
        //     newDeliveryCharge.regionName = regionName;
        // }



        if (duplicateCharge) {
            return NextResponse.json({
                success: false,
                error: isDefault
                    ? "Default delivery charge already exists"
                    : "Delivery charge already exists for this region and partner",
                existingCharge: duplicateCharge
            }, { status: 409 });
        }


        // -------------------------------
        // Update Vendor Document
        // -------------------------------
        const updatedVendor = await Vendor.findByIdAndUpdate(
            vendor._id,
            { $push: { deliveryCharges: newDeliveryCharge }, $set: { updatedAt: new Date() } },
            { new: true, projection: { deliveryCharges: 1 } }
        );
        // -------------------------------
        // Response
        // -------------------------------
        return NextResponse.json({ success: true, message: "Delivery charge added successfully", vendor: updatedVendor.deliveryCharges }, { status: 200  });

    } catch (error) {
        console.error("Error adding delivery charge:", error);
        return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500  });
    }
}
