import { NextResponse } from 'next/server';
import authDbConnect from '@/lib/mongodb/authDbConnect';
import subscriptionDTOSchema from './schema/subscriptionDTOSchema';
import { subscriptionPlanModel } from '@/models/subscription/SubscriptionPlan';
import { subscriptionModel } from '@/models/subscription/Subscription';
import { userModel } from '@/models/auth/User';
import { getServerSession } from "next-auth/next";
import { getToken } from 'next-auth/jwt';


export async function POST(request) {
    let body;
    try { body = await request.json(); }
    catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }

    // 1. Validate input
    const parsed = subscriptionDTOSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 });
    const { planId, billingCycle, autoRenew,  invoice, paymentMethodId, discount, metadata } = parsed.data

    console.log(billingCycle)

    // 2. User Authentication
    // const secret = process.env.NEXTAUTH_SECRET;
    // const token = await getToken({ req:request, secret });
    // const user_auth_session = await getServerSession(authOptions)
    
    // if(!user_auth_session && !token) return NextResponse.json({ error: "...not authorized" }, { status: 401 });    
    // if(user_auth_session){
    //     console.log(user_auth_session)
    //     console.log("has session")

    //     const { email, phone, role } = user_auth_session.user


    //     console.log(token)
    //     NextResponse.json({ success: true,  data:user_auth_session, message: "Session Found" }, { status: 200 });
    // }
    const userId = "683405bf1d7cbe61619dc3cc"
    

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
    const subscriptionPlan = await SubscriptionPlanModel.findOne({ _id: planId, isActive: true  }); //isDeleted: false
    if (!subscriptionPlan) return NextResponse.json( { error: "Subscription plan not available" }, { status: 400 } );
    
    // 4. Check for existing active subscriptions
    const Subscription = subscriptionModel(db);
    const existingSubscription = await Subscription.findOne({ userId, planId, 
                                                              status: { $in: ['active', 'trialing', 'past_due', 'user-default'] },
                                                              $or: [ { endDate: null }, { endDate: { $gt: new Date() } }]});
    if (existingSubscription) return NextResponse.json( { error: "Already subscribed..." }, { status: 409 });

    
    const { startDate, endDate }  = calculateBillingCycle({billingCycle, trialPeriod: subscriptionPlan?.trialPeriod.days || 0 } )

    // 8. Determine amount
    let amount = 0;
    switch(billingCycle) {
      case 'monthly': amount = subscriptionPlan.prices.monthly; break;
      case 'quarterly': amount = subscriptionPlan.prices.quarterly; break;
      case 'yearly': amount = subscriptionPlan.prices.yearly; break;
    }



// Need to calculate this payment History
// const paymentHistory = [];

console.log(subscriptionPlan.prices)
    const payload = {
             userId: userId,
             planId: planId,
       planSnapshot: { ...subscriptionPlan,
            //         name: subscriptionPlan.name,
            //  description: subscriptionPlan.description,
            //         slug: subscriptionPlan.slug,
            //         tier: subscriptionPlan.tier,
            //       prices: subscriptionPlan.prices,
            //       limits: subscriptionPlan.limits,
            //     features: subscriptionPlan.features,
            //      version: subscriptionPlan.version,
            //  trialPeriod: subscriptionPlan.trialPeriod   
            },
          startDate: startDate,
            endDate: endDate,
             status: 'free-trial',
       billingCycle: billingCycle,
          autoRenew: autoRenew,
             amount: amount,
           invoices: [invoice],
          discounts: [discount],
    paymentMethodId: paymentMethodId,
     paymentHistory: [],
           metadata: metadata };
    
    // 9. Create subscription
    const subscription = new Subscription(payload);
    
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


function calculateBillingCycle( {billingCycle, trialPeriod}){
  const startDate = new Date();
  startDate.setDate(startDate.getDate() + trialPeriod); // Apply trial period

  const endDate = new Date(startDate); // Clone the date

  switch (billingCycle) {
    case 'monthly':
      endDate.setMonth(endDate.getMonth() + 1);
      break;
    case 'quarterly':
      endDate.setMonth(endDate.getMonth() + 3);
      break;
    case 'yearly':
      endDate.setFullYear(endDate.getFullYear() + 1);
      break;
    default:
      throw new Error('Unsupported billing cycle');
  }

  return { startDate, endDate };
}