import { NextResponse } from "next/server";
import vendorDbConnect from "@/lib/mongodb/vendorDbConnect";
import getAuthenticatedUser from "../../auth/utils/getAuthenticatedUser";
import { applyRateLimit } from "@/lib/rateLimit/rateLimiter";
import { vendorModel } from "@/models/vendor/Vendor";
import notificationDTOSchema from "./notificationDTOSchema";
import mongoose from "mongoose";

export async function POST(request) {
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || request.headers.get('x-real-ip') || request.socket?.remoteAddress || '';
  const { allowed, retryAfter } = await applyRateLimit({ key: ip });
  if (!allowed) return NextResponse.json( { error: 'Too many requests. Please try again later.' }, { status: 429, headers: { 'Retry-After': retryAfter.toString() } } );
  
  let body;
  try {
    body = await request.json();
    const parsed = notificationDTOSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json( { error: "Invalid input", issues: parsed.error.flatten() }, { status: 422 });
    const { shop: referenceId, triggerBasis, count, notifyVia, email, phone, whatsapp } = parsed.data;

    // Authenticate user
    const { authenticated, error: authError, data: authUser } = await getAuthenticatedUser(request);
    if (!authenticated)  return NextResponse.json( { error: authError || "Not authorized" }, { status: 401 });
    
    if (!mongoose.Types.ObjectId.isValid(authUser.userId)) 
      return NextResponse.json( { error: "Invalid user ID format" },{ status: 400 });
    

    // Connect and find vendor
    const vendor_db = await vendorDbConnect();
    const Vendor = vendorModel(vendor_db);

    const vendor = await Vendor.findOne({ referenceId });
    if (!vendor || vendor.ownerId.toString() !== authUser.userId) {
      return NextResponse.json({ success: false, message: "Shop not found or permission denied" }, { status: 404 });}

    // Prepare notification payload
    const updatePayload = {
      notification: {
        email: notifyVia.includes('email') ? email : null,
        phone: notifyVia.includes('sms') ? phone : null,
        preferredChannel: notifyVia[0], // set first one as default

        hourlyNotification: {
          enabled: triggerBasis === 'hourly',
          intervalHours: triggerBasis === 'hourly' ? parseInt(count, 10) : 1
        },

        orderNotifications: {
          enabled: triggerBasis === 'order',
          frequency: triggerBasis === 'order' ? parseInt(count, 10) : 1
        }
      }
    };

    await Vendor.updateOne({ _id: vendor._id }, { $set: updatePayload });

    return NextResponse.json({ success: true, message: "Notification settings updated successfully"});

  } catch (error) {
    console.error('Notification update error:', error);
    return NextResponse.json(
      {
        error: error.message || "Failed to update notification settings",
        ...(process.env.NODE_ENV !== 'production' && { stack: error.stack })
      },
      { status: 500 }
    );
  }
}