import { NextResponse } from 'next/server';
import authDbConnect from '@/lib/mongodb/authDbConnect';
import subscriptionDTOSchema from './schema/subscriptionDTOSchema';
import { subscriptionModel } from '@/models/subscription/Subscription';
import { userModel } from '@/models/auth/User';


export async function POST(request) {
    let body;
    try { body = await request.json(); }
    catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }

    // Rate Limit
    const ip = request.headers['x-forwarded-for']?.split(',')[0]?.trim() || request.headers['x-real-ip'] || request.socket?.remoteAddress || '';
    const { allowed, retryAfter } = await applyRateLimit({ key: ip, scope: 'createShop' });
    if (!allowed)
      return NextResponse.json({ error: 'Too many requests. Please try again later.' }, { status: 429, headers: { 'Retry-After': retryAfter.toString(), } });

    const { authenticated, error, data } = await getAuthenticatedUser(request);
    if (!authenticated)
      return NextResponse.json({ error: "...not authorized" }, { status: 401 });


    // 1. Validate input
    const parsed = subscriptionDTOSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 });
    const {         planId,
              billingCycle,
                 autoRenew,
           paymentMethodId,
                 ipAddress,
                 userAgent,
                   invoice,
                  discount,
                  metadata } = parsed.data
    // const { planId, billingCycle, autoRenew,  invoice, paymentMethodId, discount, metadata } = parsed.data

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
    const planModel = planModel(db);
    const plan = await planModel.findOne({ referenceId: planId, isActive: true  }); //isDeleted: false
    if (!plan) return NextResponse.json( { error: "This subscription plan not available" }, { status: 400 } );
    
    // 4. Check for existing active subscriptions
    const Subscription = subscriptionModel(db);
    const existingSubscription = await Subscription.findOne({ userId, planId, 
                                                              status: { $in: ['active', 'trialing', 'past_due', 'user-default'] },
                                                              $or: [ { endDate: null }, { endDate: { $gt: new Date() } }]});
    if (existingSubscription) return NextResponse.json( { error: "Already subscribed..." }, { status: 409 });
    const { startDate, endDate }  = calculateBillingCycle({billingCycle, trialPeriod: plan?.trialPeriod.days || 0 } )

    // 8. Determine amount
    let amount = 0;
    switch(billingCycle) {
      case 'monthly': amount = plan.prices.monthly; break;
      case 'quarterly': amount = plan.prices.quarterly; break;
      case 'yearly': amount = plan.prices.yearly; break;
    }


// Need to calculate this payment History
// const paymentHistory = [];


console.log(plan.prices)
    const payload = {
             userId: userId,
             planId: planId,
       planSnapshot: { ...plan,
            //         name: plan.name,
            //  description: plan.description,
            //         slug: plan.slug,
            //         tier: plan.tier,
            //       prices: plan.prices,
            //       limits: plan.limits,
            //     features: plan.features,
            //      version: plan.version,
            //  trialPeriod: plan.trialPeriod   
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
    return NextResponse.json({ success: true, message: "Subscription created successfully", data: subscription }, { status: 201 });
    
  } catch (error) {
    console.error("Subscription creation error:", error);
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 } );
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

