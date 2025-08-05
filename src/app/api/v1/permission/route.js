import { NextResponse } from "next/server";
import vendorDbConnect from "@/lib/mongodb/vendorDbConnect";
import { vendorModel } from "@/models/vendor/Vendor";
import getAuthenticatedUser from "../auth/utils/getAuthenticatedUser";
import securityHeaders from "../utils/securityHeaders";
import { applyRateLimit } from "@/lib/rateLimit/rateLimiter";
import permissionDTOSchema from "./permissionDTOSchema";
import upsertStaffToVendor from "@/services/vendor/upsertStaffToVendor";
import { userModel } from "@/models/auth/User";
import authDbConnect from "@/lib/mongodb/authDbConnect";
import removeStaffFromVendor from "@/services/vendor/removeStuff";

export const dynamic = 'force-dynamic';

export async function POST(request) {
  const ip = request.headers['x-forwarded-for']?.split(',')[0]?.trim() || request.headers['x-real-ip'] || request.socket?.remoteAddress || '';
  const { allowed, retryAfter } = await applyRateLimit({ key: ip });
  if (!allowed) return NextResponse.json({ error: 'Too many requests. Please try again later.' }, { status: 429, headers: { 'Retry-After': retryAfter.toString() } } );


  let body;
  try { body = await request.json(); } 
  catch { return NextResponse.json( { success: false, error: "Invalid JSON" }, { status: 400, headers: securityHeaders } );}

  const parsed = permissionDTOSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json( { success: false,error: "Validation failed",details: parsed.error.flatten(),},{ status: 422, headers: securityHeaders });
  

  const { shop: shopReferenceId, action, userId: userReferenceId } = parsed.data;
  const { authenticated, error, data } = await getAuthenticatedUser(request);

  if (!authenticated) {
    return NextResponse.json({ error: "Not authorized" }, { status: 401 });
  }

  const vendor_db = await vendorDbConnect();
  const Vendor = vendorModel(vendor_db);
  const vendor = await Vendor.findOne({ referenceId: shopReferenceId })
                             .select("+_id +ownerId +dbInfo")
                             .lean();

  if (!vendor) 
    return NextResponse.json( { success: false, error: "Shop not found" }, { status: 404, headers: securityHeaders });
  if (vendor.ownerId.toString() !== data.userId.toString()) 
    return NextResponse.json({ success: false, error: "You are not authorized to modify permissions" },{ status: 403, headers: securityHeaders });

  const auth_db  = await authDbConnect()
  const User = userModel(auth_db);

  const user = await User.findOne({ referenceId: userReferenceId, isDeleted: false  });
  if (!user || (!user.isVerified && !user.isEmailVerified && !user.isPhoneVerified))  return NextResponse.json( { success: false, error: "User Not found " }, { status: 404, headers: securityHeaders });

  const staffPayload = {      userId: user._id,
                         designation: "general_staff",
                              status: "active",
                          permission: ["w:shop"],
                               addBy: data.userId,
                               notes: []                }

  try {
    if (action === "grant-permission") {
      const result  = await upsertStaffToVendor({ vendorId: vendor._id, staff: staffPayload })
      if (!result.success) return NextResponse.json( { success: false, error: "Permission Grant failed " }, { status: 404, headers: securityHeaders } );
    } else if (action === "remove-permission") {
      const result = await removeStaffFromVendor({ vendorId:  vendor._id, userId: _user._id })
      if (!result.success) return NextResponse.json({ success: false, error: result.message }, { status: 404, headers: securityHeaders });
    }


    const response = NextResponse.json(
      {
        success: true,
        message: `Permission ${action === 'grant-permission' ? 'granted' : 'removed'} successfully`,
      },
      { status: 200 }
    );

    Object.entries(securityHeaders).forEach(([key, value]) => {
      response.headers.set(key, value);
    });

    return response;

  } catch (err) {
    return NextResponse.json(
      { success: false, error: err?.message || "Something went wrong" },
      { status: 500, headers: securityHeaders }
    );
  }
}