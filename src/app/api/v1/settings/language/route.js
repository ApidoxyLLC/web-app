import { NextResponse } from "next/server";
import vendorDbConnect from "@/lib/mongodb/vendorDbConnect";
import { vendorModel } from "@/models/vendor/Vendor";
import getAuthenticatedUser from "../../auth/utils/getAuthenticatedUser";
import { applyRateLimit } from "@/lib/rateLimit/rateLimiter";
import hasPermission from "./hasPermission";
import { z } from "zod";

// DTO Schema for validating language update
const languageEditDTOSchema = z.object({
  shop: z.string(),
  language: z.enum(["en_US", "bn_BD"])
});

export async function PATCH(request) {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || request.headers.get("x-real-ip") || request.socket?.remoteAddress || request.connection?.remoteAddress || "";

  // Rate Limiting
  const { allowed, retryAfter } = await applyRateLimit({ key: ip });
  if (!allowed) return NextResponse.json({ success: false, error: "Too many requests. Please try again later." }, { status: 429, headers: { "Retry-After": retryAfter.toString()  } });
  

  try {
    // Parse and validate body
    const body = await request.json();
    const parsed = languageEditDTOSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ success: false, error: "Invalid input", issues: parsed.error.flatten() }, { status: 422  });
    

    // Authentication
    const { authenticated, error: authError, data } = await getAuthenticatedUser(request);
    if (!authenticated) return NextResponse.json( { success: false, error: authError || "Not authorized" }, { status: 401  });
    

    // Database connection
    const vendor_db = await vendorDbConnect();
    const Vendor = vendorModel(vendor_db);

    const { shop: referenceId, language } = parsed.data

    // Find vendor
    const vendor = await Vendor.findOne({ referenceId }).select("_id ownerId language");
    if (!vendor) return NextResponse.json({ success: false, error: "Vendor not found" }, { status: 404  });
    

    // Authorization
    if (!hasPermission(vendor, data.userId)) 
      return NextResponse.json({ success: false, error: "Authorization failed" }, { status: 403  });
    

    // Update language
    vendor.language = language;
    vendor.updatedAt = new Date();
    await vendor.save();

    return NextResponse.json(
      { success: true, message: "Language updated successfully", data: { language: vendor.language } },
      { status: 200  }
    );
  } catch (error) {
    console.error("Error updating language:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500  }
    );
  }
}