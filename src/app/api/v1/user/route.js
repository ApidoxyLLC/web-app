import { NextResponse } from "next/server";
import authDbConnect from "@/lib/mongodb/authDbConnect";
import { userModel } from "@/models/auth/User";
import securityHeaders from "../utils/securityHeaders";
import { z } from 'zod';

export const dynamic = 'force-dynamic';

// Query schema validation
const emailSearchSchema = z.object({
  email: z.string().email("Invalid email format").min(1, "Email is required"),
}).strict();

export async function GET(request) {
  try {
    // Get email from query parameters
    const { searchParams } = new URL(request.url);
    const email = searchParams.get('email');

    // Validate email input
    const parsed = emailSearchSchema.safeParse({ email });
    if (!parsed.success)  return NextResponse.json( { success: false, error: validation.error.format() },{ status: 400, headers: securityHeaders });
    
    // Connect to database
    const db = await authDbConnect();
    const User = userModel(db);

    // Find user by email (case insensitive)
    const user = await User.findOne({ 
      email: { $regex: new RegExp(`^${parsed.data.email}$`, 'i') }
    }).select('+security +verification +consent +status +lock +twoFactor +oauth');

    if (!user) {
      return NextResponse.json(
        { success: false, error: "User not found" },
        { status: 404, headers: securityHeaders }
      );
    }

    // Return all user data
    return NextResponse.json(
      { success: true, data: user },
      { status: 200, headers: securityHeaders }
    );

  } catch (error) {
    return NextResponse.json(
      { success: false, error: error.message || "Server error" },
      { status: 500, headers: securityHeaders }
    );
  }
}