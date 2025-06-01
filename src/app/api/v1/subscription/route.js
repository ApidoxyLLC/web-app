import { NextResponse } from 'next/server';
import { authDbConnect } from '@/lib/db';
import subscriptionDTOSchema from './schema/subscriptionDTOSchema';
import { subscriptionPlanModel } from '@/models/subscription/SubscriptionPlan';
import { subscriptionModel } from '@/models/subscription/Subscription';
import { userModel } from '@/models/auth/User';
import { getServerSession } from "next-auth/next";
// import { subscriptionSchema, SubscriptionModel } from '@/models/subscriptionModel';
// import { subscriptionPlanModel } from '@/models/subscriptionPlanModel';
// import { userModel } from '@/models/userModel';

  // planId: z.string().min(1),
  // billingCycle: z.enum(["monthly", "quarterly", "yearly", "custom"]).optional(),
  // autoRenew: z.boolean().optional(),
  // renewalDate: z.date().nullable().optional(),
  // currency: z.enum(['BDT', 'USD', 'EUR', 'GBP', 'INR', 'JPY']).optional(),
  // amount: z.number().nonnegative().optional(),
  // paymentMethodId: z.string().optional(),
  // ipAddress: z.string().optional(),
  // userAgent: z.string().optional(),
  // invoice: z.string().optional(),
  // metadata: z.record(z.any()).optional()

export async function POST(request) {
    let body;
    try { body = await request.json(); } 
    catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }

    // 1. Validate input
    const parsed = subscriptionDTOSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 });
    const { planId, duration, billingCycle, basePrice, 
      autoRenew, ipAddress, userAgent, invoice, discount, metadata} = parsed.data

    // 2. User Authentication
    const secret = process.env.NEXTAUTH_SECRET;
    const token = await getToken({ req:request, secret });
    const user_auth_session = await getServerSession(authOptions)
    
    if(!user_auth_session && !token) return NextResponse.json({ error: "...not authorized" }, { status: 401 });    
    if(user_auth_session){
        console.log(user_auth_session)
        console.log("has session")

        const { email, phone, role } = user_auth_session.user
        const auth_db = await authDbConnect()

        console.log(token)
        NextResponse.json({ success: true,  data:user_auth_session, message: "Session Found" }, { status: 200 });
    }

    const userId = "0000000000"
    

    // 3. User Authorization 


  const db = await authDbConnect();

  try {
    ///////////////////////////////////////////////////////////////////////////////////////
    // ** This portion is temporary, 
    // ** if connect with next-auth, 
    // ** we will get necessy user data from token
    // 4. Verify user exists 
    const UserModel = userModel(db);
    const user = await UserModel.findById(userId);
    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 } );
    // ////////////////////////////////////////////////////////////////////////////////////
    // remove this when add authentication
    // ////////////////////////////////////////////////////////////////////////////////////


    // 3. Verify Subscription plan 
    const SubscriptionPlanModel = subscriptionPlanModel(db);
    const subscriptionPlan = SubscriptionPlanModel.findOne({ _id: planId, isActive: true, isDeleted: false });
    if (!subscriptionPlan) return NextResponse.json( { error: "Subscription plan not available" }, { status: 400 } );
    
    // 4. Check for existing active subscriptions
    const Subscription = subscriptionModel(db);
    const existingSubscription = await Subscription.findOne({ userId, planId, 
                                                              status: { $in: ['active', 'trialing', 'past_due', 'user-default'] },
                                                              $or: [ { endDate: null }, { endDate: { $gt: new Date() } }]});
    if (existingSubscription) return NextResponse.json( { error: "Already subscribed..." }, { status: 409 });

    
    // 5. Create plan snapshot
    const planSnapshot = {
      name: plan.name,
      slug: plan.slug,
      price: {
        monthly: plan.price.monthly,
        yearly: plan.price.yearly,
        quarterly: plan.price.quarterly,
        billingCycles: plan.billingCycles,
        currency: plan.currency
      },
      limits: plan.limits.toObject ? plan.limits.toObject() : plan.limits,
      features: plan.features.toObject ? plan.features.toObject() : plan.features,
      version: plan.version,
      capturedAt: new Date()
    };
    
    // 6. Calculate dates
    const startDate = new Date();
    let trial = null;
    let status = 'active';
    let endDate = null;
    
    if (data.startTrial && plan.trialPeriodDays > 0) {
      const trialEnd = new Date(startDate);
      trialEnd.setDate(trialEnd.getDate() + plan.trialPeriodDays);
      
      trial = {
        startAt: startDate,
        endAt: trialEnd
      };
      
      status = 'trialing';
      endDate = trialEnd;
    }
    
    // 7. Calculate renewal date
    let renewalDate = new Date(startDate);
    switch(data.billingCycle) {
      case 'monthly':
        renewalDate.setMonth(renewalDate.getMonth() + 1);
        break;
      case 'quarterly':
        renewalDate.setMonth(renewalDate.getMonth() + 3);
        break;
      case 'yearly':
        renewalDate.setFullYear(renewalDate.getFullYear() + 1);
        break;
      // Custom handled separately
    }
    
    // 8. Determine amount
    let amount = 0;
    switch(data.billingCycle) {
      case 'monthly': amount = plan.price.monthly; break;
      case 'quarterly': amount = plan.price.quarterly; break;
      case 'yearly': amount = plan.price.yearly; break;
    }
    
    // 9. Create subscription
    const subscription = new Subscription({
      userId,
      planId,
      planSnapshot,
      duration: {
        startDate,
        endDate
      },
      trial,
      status,
      billingCycle: data.billingCycle,
      autoRenew: data.autoRenew,
      renewalDate,
      currency: plan.currency,
      amount,
      discounts: data.discounts || [],
      paymentMethodId: data.paymentMethodId,
      ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
      userAgent: request.headers.get('user-agent') || 'unknown',
      metadata: data.metadata || {}
    });
    
    // 10. Save to database
    await subscription.save();
    
    // 11. Return response
    return NextResponse.json(
      {
        success: true,
        message: "Subscription created successfully",
        data: subscription
      },
      { status: 201 }
    );
    
  } catch (error) {
    console.error("Subscription creation error:", error);
    
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}