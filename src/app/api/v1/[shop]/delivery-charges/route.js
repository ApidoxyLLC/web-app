import { NextResponse } from "next/server";
import vendorDbConnect from "@/lib/mongodb/vendorDbConnect";
import { vendorModel } from "@/models/vendor/Vendor";
import getAuthenticatedUser from "../../auth/utils/getAuthenticatedUser";
import { applyRateLimit } from "@/lib/rateLimit/rateLimiter";
import securityHeaders from "../../utils/securityHeaders";
import hasPermission from "./hasPermission";
import deliveryChargeEditDTOSchema from "./deliveryChargeEditDTOSchema";

export async function PATCH(request) {
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || request.headers.get('x-real-ip') || request.socket?.remoteAddress || request.connection?.remoteAddress || '';
    // Rate Limiting
    const { allowed, retryAfter } = await applyRateLimit({ key: ip });
    if (!allowed) return NextResponse.json({ success: false, error: 'Too many requests. Please try again later.' }, { status: 429, headers: { 'Retry-After': retryAfter.toString(), ...securityHeaders }});


    try {
        const { shop: vendorReferenceId } = await params;
        if (!vendorReferenceId) return NextResponse.json({ success: false, error: 'Shop reference is required' }, { status: 400, headers: securityHeaders });
        
        // Parse and validate request body
        const body = await request.json();
        const parsed = deliveryChargeEditDTOSchema.partial().safeParse(body);        
        if (!parsed.success) return NextResponse.json( { success: false, error: "Invalid input", issues: parsed.error.flatten()  }, { status: 422, headers: securityHeaders } );
        

        const { chargeId, ...updateData } = parsed.data;

        if (!chargeId) return NextResponse.json( { success: false, error: "Both vendorReferenceId and chargeId are required" }, { status: 400, headers: securityHeaders } );
        

        // Authentication
        const { authenticated, error: authError, data } = await getAuthenticatedUser(request);
        if (!authenticated) return NextResponse.json({ success: false, error: authError || "Not authorized" }, { status: 401, headers: securityHeaders } );
        

        // Database Operations
        const vendor_db = await vendorDbConnect();
        const Vendor = vendorModel(vendor_db);

        const vendor = await Vendor.findOne({ referenceId: vendorReferenceId }).select('_id deliveryCharges ownerId');        
        if (!vendor) return NextResponse.json({ success: false, error: "Vendor not found" }, { status: 404, headers: securityHeaders });
        
        // Authorization
        if (!hasPermission(vendor, data.userId)) return NextResponse.json( { success: false, error: 'Authorization failed'  },  {  status: 403, headers: securityHeaders });
        
        // Check if charge exists
        const chargeIndex = vendor.deliveryCharges.findIndex(charge => charge._id.toString() === chargeId);
        if (chargeIndex === -1) return NextResponse.json( { success: false, error: "Delivery charge not found" }, { status: 404, headers: securityHeaders } );        

        // Check for duplicate (if region or partner is being updated)
        if (updateData.regionName || updateData.chargeBasedOn || updateData.partner) {
            const currentCharge = vendor.deliveryCharges[chargeIndex];
            const normalizedRegion = (updateData.regionName || currentCharge.regionName).toLowerCase();
            const chargeBasedOn = updateData.chargeBasedOn || currentCharge.chargeBasedOn;
            const partner = updateData.partner !== undefined ? updateData.partner : currentCharge.partner;

            const duplicateCharge = vendor.deliveryCharges.find((existingCharge, index) => {
                if (index === chargeIndex) return false; // Skip current charge
                
                const sameRegionType = existingCharge.chargeBasedOn === chargeBasedOn;
                const sameRegionName = existingCharge.regionName.toLowerCase() === normalizedRegion;
                
                if (!sameRegionType || !sameRegionName) return false;
                
                if (existingCharge.partner && partner) {
                    return existingCharge.partner === partner;
                }
                return !existingCharge.partner && !partner;
            });

            if (duplicateCharge)  return NextResponse.json( { success: false, error: "Another delivery charge already exists for this region and partner", existingCharge: duplicateCharge  },  { status: 409, headers: securityHeaders } ) 
        }

        // Prepare update object
        const updateObject = {};
        if (updateData.chargeBasedOn) updateObject['deliveryCharges.$[elem].chargeBasedOn'] = updateData.chargeBasedOn;
        if (updateData.regionName) updateObject['deliveryCharges.$[elem].regionName'] = updateData.regionName;
        if (updateData.charge !== undefined) updateObject['deliveryCharges.$[elem].charge'] = updateData.charge;
        if (updateData.partner !== undefined) updateObject['deliveryCharges.$[elem].partner'] = updateData.partner || undefined;
        

        // Update the charge
        const updatedVendor = await Vendor.findByIdAndUpdate( vendor._id,
                                                                { 
                                                                    ...updateObject,
                                                                    $set: { updatedAt: new Date() } 
                                                                },
                                                                { 
                                                                    new: true,
                                                                    arrayFilters: [{ 'elem._id': chargeId }],
                                                                    projection: { deliveryCharges: 1 }
                                                                }
                                                            );

        // Success Response
        return NextResponse.json( { success: true, message: "Delivery charge updated successfully", data: { deliveryCharges: updatedVendor.deliveryCharges } }, { status: 200, headers: securityHeaders } );

    } catch (error) {
        console.error("Error updating delivery charge:", error);
        return NextResponse.json( { success: false, error: "Internal server error"  },  { status: 500, headers: securityHeaders } );
    }
}

export async function DELETE(request, {params}) {
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || request.headers.get('x-real-ip') || request.socket?.remoteAddress || request.connection?.remoteAddress || '';
    // Rate Limiting
    const { allowed, retryAfter } = await applyRateLimit({ key: ip });
    if (!allowed) return NextResponse.json({ success: false, error: 'Too many requests. Please try again later.' }, { status: 429, headers: { 'Retry-After': retryAfter.toString(), ...securityHeaders }});

    try {
        // Parse request body
        const { shop: vendorReferenceId } = await params;
        const body = await request.json();
        const { charge: chargeId } = body;
        console.log("joy bangla",body)
        if (!vendorReferenceId || !chargeId)  return NextResponse.json( { success: false, error: "Both vendorReferenceId and chargeId are required" }, { status: 400, headers: securityHeaders } );

        // Authentication
        const { authenticated, error: authError, data } = await getAuthenticatedUser(request);
        if (!authenticated) return NextResponse.json( { success: false, error: authError || "Not authorized"},  { status: 401,headers: securityHeaders})

        // Database Operations
        const vendor_db = await vendorDbConnect();
        const Vendor = vendorModel(vendor_db);
        const vendor = await Vendor.findOne({ referenceId: vendorReferenceId })
                                 .select('_id deliveryCharges ownerId');
        
        if (!vendor) return NextResponse.json( { success: false, error: "Vendor not found" }, { status: 404, headers: securityHeaders });

        // Authorization
        if (!hasPermission(vendor, data.userId)) return NextResponse.json({ success: false, error: 'Authorization failed' }, { status: 403,headers: securityHeaders });
        
        // Check if charge exists
        const chargeExists = vendor.deliveryCharges.some(charge => charge._id.toString() === chargeId);
        if (!chargeExists) return NextResponse.json({ success: false, error: "Delivery charge not found"  },  { status: 404, headers: securityHeaders } );
        

        // Remove the charge
        const updatedVendor = await Vendor.findByIdAndUpdate(  vendor._id,  { $pull: { deliveryCharges: { _id: chargeId } }, $set: { updatedAt: new Date() }  }, { new: true, projection: { deliveryCharges: 1 } });

        // Success Response
        return NextResponse.json({success: true, message: "Delivery charge removed successfully", data: { deliveryCharges: updatedVendor.deliveryCharges } }, { status: 200, headers: securityHeaders });

    } catch (error) {
        console.log("Error removing delivery charge:", error);
        return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500, headers: securityHeaders });
    }
}

