import { NextResponse } from "next/server";
import authDbConnect from "@/lib/mongodb/authDbConnect";
import subscriptionPlanDTOSchema from "./subscriptionPlanDTOSchema";
// import { createSubscriptionPlan } from "@/services/subscription/plan.service";

// import { planModel } from '@/models/planModel';

import { PlanModel } from "@/models/subscription/Plan";

export async function POST(request) {
  await authDbConnect();

  try {
    const body = await request.json();

    // Validate incoming data
    const parsed = subscriptionPlanDTOSchema.safeParse(body);
    if (!parsed.success) {
      console.log("Validation errors:", parsed.error.flatten());
      return NextResponse.json({
        success: false,
        errors: parsed.error.flatten()
      }, { status: 400 });
    }


    const {
      name,
      slug,
      price,
      duration,
      services: {
        website: {
          subdomains,
          customDomains,
        },
        androidBuilds,
        iosBuilds,
        paymentGateways,
        deliveryGateways,
        smsGateways,
        userAccess: additionalUsers,
        pushNotifications,
        products: productLimit,
      }
    } = parsed.data;

    const authDb = await authDbConnect();
    const Plan = PlanModel(authDb);

    const newPlan = await Plan.create({
      name,
      slug,
      price,
      duration,
      services: {
        website: {
          subdomains,
          customDomains,
        },
        androidBuilds,
        iosBuilds,
        paymentGateways,
        deliveryGateways,
        smsGateways,
        userAccess: additionalUsers,
        pushNotifications,
        products: productLimit,
      }
    });


    return NextResponse.json({
      success: true,
      message: 'Subscription plan created successfully',
      data: newPlan
    }, { status: 201 });

  } catch (error) {
    console.error('POST Subscription Plan Error:', error);
    return NextResponse.json({
      success: false,
      message: 'Something went wrong',
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
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
//           const      auth_db = await authDbConnect();
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
//     const db = await authDbConnect();
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
