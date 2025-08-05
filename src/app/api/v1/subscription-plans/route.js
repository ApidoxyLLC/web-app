import { NextResponse } from "next/server";
import vendorDbConnect from "@/lib/mongodb/vendorDbConnect";
import { subscriptionPlanDTOSchema } from "./subscriptionPlanDTOSchema";
import { PlanModel } from "@/models/subscription/Plan";
import { applyRateLimit } from "@/lib/rateLimit/rateLimiter";
import mongoose from "mongoose";
import authDbConnect from "@/lib/mongodb/authDbConnect";
import { userModel } from "@/models/auth/User";

export async function POST(request) {
    console.log("Subscription Plan Creation Request");

    // Rate limiting
    const ip = request.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
        request.headers['x-real-ip'] ||
        request.socket?.remoteAddress || '';
    const { allowed, retryAfter } = await applyRateLimit({ key: ip, scope: 'createPlan' });
    if (!allowed) {
        return NextResponse.json(
            { error: 'Too many requests. Please try again later.' },
            { status: 429, headers: { 'Retry-After': retryAfter.toString() } }
        );
    }

    try {
        const body = await request.json();
        console.log("Request body:", JSON.stringify(body, null, 2));

        // Validate input
        const parsed = subscriptionPlanDTOSchema.safeParse(body);
        if (!parsed.success) {
            const errors = parsed.error.issues.map(issue => ({
                field: issue.path.join('.'),
                message: issue.message
            }));
            return NextResponse.json(
                { success: false, errors },
                { status: 400 }
            );
        }

       

       
        const vendorDb = await vendorDbConnect();
        const Plan = PlanModel(vendorDb);

        const planData = {
            ...parsed.data,
        };

        const newPlan = await Plan.create(planData);

        return NextResponse.json(
            {
                success: true,
                data: newPlan,
                message: "Subscription plan created successfully"
            },
            { status: 201 }
        );

    } catch (error) {
        console.error("Plan Creation Error:", error);
        if (error.code === 11000) {
            return NextResponse.json(
                {
                    success: false,
                    message: "Plan slug must be unique",
                    error: error.message
                },
                { status: 409 }
            );
        }
        return NextResponse.json(
            {
                success: false,
                message: "Internal server error",
                error: error.message,
                stack: process.env.NODE_ENV !== 'production' ? error.stack : undefined
            },
            { status: 500 }
        );
    }
}

// // Pagination constants
// const DEFAULT_PAGE = 1;
// const DEFAULT_LIMIT = 8;
// const MAX_LIMIT = 100;

// export async function POST(request, response) {  
  
//     // 1. Check Authentication
//     // pls.. put authentication logic to nextjs middleware 

//     // 2. Check Authorization
//     // 3. validate input 
//     let body;
//     try     { body = await request.json(); } 
//     catch   { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }
    
//     const parsed = subscriptionPlanDTOSchema.safeParse(body);
//       if (!parsed.success) 
//         return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 });
//     // 4. Send Request to Database 
//       try {
//           const      auth_db = await vendorDbConnect();
//           const    Plan = await planModel(auth_db);
//           const existingPlan = await Plan.findOne({ tier: parsed.data.tier });
//           if (existingPlan) 
//             return NextResponse.json( { error: "This Tier plan already exist, Add different one. " }, { status: 400 } );
//           const result = await Plan.create([parsed.data])
//           if(result)
//               return NextResponse.json({ message: "Subscription plan created successfully... ", success: true, data: result }, { status: 201 })
//       } catch (error) {
//           //  failed response
//           console.log(error)
//           if (error.code === 11000) {
//             return NextResponse.json({ error: "Plan slug must be unique" },{ status: 409 })}
//           if (error.name === 'ValidationError') {
//             return NextResponse.json({ error: error.message },{ status: 400 })}
//           return NextResponse.json({ error: "Plan Creation failed for a unknown reason" }, { status: 500 });
//       }
// }

// export async function GET(request) {
//   try {
//     // 1. Handle query parameters
//     const { searchParams } = new URL(request.url);
//     const page = parseInt(searchParams.get('page') || DEFAULT_PAGE);
//     const limit = Math.min(parseInt(searchParams.get('limit') || DEFAULT_LIMIT), MAX_LIMIT);
//     const status = searchParams.get('status'); // 'active', 'inactive'
//     const tier = searchParams.get('tier'); // 'free', 'starter', etc.

//     // 2. Database connection
//     const db = await vendorDbConnect();
//     const Plan = planModel(db);

//     // 3. Build query with filters
//     const query = { isActive: true };
//     // if (status) query.isActive = status === 'active';
//     // if (tier) query.tier = tier;

//     // 4. Execute paginated query
//     const skip = (page - 1) * limit;
//     const [plans, total] = await Promise.all([
//       Plan.find(query)
//         .sort({ createdAt: -1 }) // Newest first
//         .skip(skip)
//         .limit(limit)
//         .lean(), // Return plain JS objects
//       Plan.countDocuments(query)
//     ]);

//     // 5. Calculate pagination metadata
//     const totalPages = Math.ceil(total / limit);
//     const hasNextPage = page < totalPages;
//     const hasPrevPage = page > 1;

//     // 6. Return response
//     return NextResponse.json({
//       success: true,
//       data: plans,
//       pagination: {
//         total,
//         totalPages,
//         currentPage: page,
//         hasNextPage,
//         hasPrevPage,
//         nextPage: hasNextPage ? page + 1 : null,
//         prevPage: hasPrevPage ? page - 1 : null,
//         limit
//       }
//     }, { status: 200 });

//   } catch (error) {
//     console.error('Failed to fetch plans:', error);
//     return NextResponse.json(
//       { error: "Failed to retrieve subscription plans" },
//       { status: 500 }
//     );
//   }
// }
