import { NextResponse } from 'next/server';
import authDbConnect from '@/lib/mongodb/authDbConnect';
import subscriptionDTOSchema from './schema/subscriptionDTOSchema';
import { planModel } from '@/models/subscription/Plan';
import { subscriptionModel } from '@/models/subscription/Subscription';
import { userModel } from '@/models/auth/User';
import { getServerSession } from "next-auth/next";
import { getToken } from 'next-auth/jwt';


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



app.post('/api/payforsms', adminsign, gentoken, async(req, res) => {
    let price = 0
    if(parseInt(req.body.qty) < 2000) {
        price = 800
    } else if(parseInt(req.body.qty) >= 2000 && parseInt(req.body.qty) <=25000) {
        if(Number.isInteger(parseInt(req.body.qty) * 0.40)) {
            price = parseInt(req.body.qty) * 0.40
        } else {
            price = parseInt(parseInt(req.body.qty) * 0.40)+1
        }
    } else {
        price = 0
    }

    //create a 
    let trxid = res.eiin + new Date().valueOf();
    await TransactionDataModel.create({
        trxid: trxid,
        eiin: res.eiin,
        amount : price,
        created : moment().format('DD MMM YYYY H:M A'), 
        date : moment().format('DD MMM YYYY H:M A'),
        payer : res.email,
        payee : 'Shikkhanobish Payment System',
        purpose : req.body.for,
        approved : false,
    });

    axios.post('https://tokenized.pay.bka.sh/v1.2.0-beta/tokenized/checkout/create',
        {
            mode: '0011',
            payerReference: 'refrense',
            callbackURL: 'https://shikkhanobish.com/api/executepayment',
            amount: price,
            currency: 'BDT',
            intent: 'sale',
            merchantInvoiceNumber: trxid,
        },
        {
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
                'X-App-Key': 'xzzIqNMPyuyN39DUtYGB298Ztc',
                'Authorization': res.id_token
            }
        }
    ).then((response) => {
        if(response.data.statusCode == '0000') {
            res.json({error: false, redirect: response.data.bkashURL})
        }
    }).catch((err) => {
        res.json({error: err, message: 'Payment page loading failed'})
    })
})

app.get('/api/executepayment', adminsign, gentoken, async(req, res) => {
    async function updateTransaction(invoiceid, trxID, amount) {
        await TransactionDataModel.findOneAndUpdate({trxid: invoiceid}, {approved: true, amount: amount, payee: 'Bkash ('+trxID+')'});
        await SmsDataModel.findOneAndUpdate({eiin: res.eiin}, {$inc: { quantity: parseInt(parseFloat(amount)/ 0.40)+1 }})
    }
    
    axios.post('https://tokenized.pay.bka.sh/v1.2.0-beta/tokenized/checkout/execute',{
        paymentID : req.query.paymentID
    },
    {
        headers: {
            'Accept': 'application/json',
            'X-App-Key': 'xzzIqNMPyuyN39DUtYGB298Ztc',
            'Authorization': res.id_token
        }
    }).then(async (response) =>  {
        if(response.data.statusCode == '0000') {
            await updateTransaction(response.data.merchantInvoiceNumber, response.data.trxID, response.data.amount);
            res.redirect('../sms')
        } else {
            res.send('Payment failed. <a href="https://shikkhanobish.com/sms">Go back to SMS Panel</a>')
        }
    }).catch((err) => {
        res.send('Payment failed. <a href="https://shikkhanobish.com/sms">Go back to SMS Panel</a>')
    })
})

const gentoken = ('gentoken', async(req, res, next) => {
    axios.post('https://tokenized.pay.bka.sh/v1.2.0-beta/tokenized/checkout/token/grant',
    {app_key: 'xzzIqNMPyuyN39DUtYGB298Ztc', app_secret: 'MO40tnULCjVjjGB2P3slAizH96ic3az01CGFK9YxAWOX1YNrpSly'},
    {
        headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'username': '01886130298',
            'password': '1.jIXL^70,f'
        }
    }
  ).then((response) => {
    if(response.data.statusCode  == '0000') {
        res.id_token = response.data.id_token
        res.refresh_token = response.data.refresh_token
        next()
    } else {
        res.json({error: true, message: 'Payment page loading failed'})
    }
  }).catch((err) => {
    res.json({error: true, message: 'Payment page loading failed'})
  })
})