import vendorDbConnect from "@/lib/mongodb/vendorDbConnect";
import mongoose from 'mongoose';
import { getServerSession } from "next-auth/next";
import { NextResponse } from 'next/server';
import { InvoiceModel } from '@/models/subscription/invoice';
import { getBkashToken } from '@/services/bkash/getBkashToken';
import { userModel } from "@/models/auth/user";
import authDbConnect from "@/lib/mongodb/authDbConnect";
import invoiceDTOSchema from './invoiceDTOSchema';
import { PlanModel } from "@/models/subscription/Plan";

export async function POST(request) {
    const body = await request.json();
    // ✅ Validate with Zod
    const parsed = invoiceDTOSchema.safeParse(body);
    if (!parsed.success) {
        return NextResponse.json(
            {
                success: false,
                message: 'Validation failed',
                errors: parsed.error.flatten(),
            },
            { status: 400 }
        );
    }

    /** 
                         * fake Authentication for test purpose only 
                         * *******************************************
                         * *****REMOVE THIS BLOCK IN PRODUCTION***** *
                         * *******************************************
                         * *              ***
                         * *              ***
                         * *            *******
                         * *             *****
                         * *              *** 
                         * *               *           
                         * */

    const authDb = await authDbConnect()
    const User = userModel(authDb);
    const user = await User.findOne({ referenceId: "cmda0m1db0000so9whatqavpx" })
        .select('referenceId _id name email phone role isEmailVerified')
    console.log(user)
    const data = {
        sessionId: "cmdags8700000649w6qyzu8xx",
        userReferenceId: user.referenceId,
        userId: user?._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        isVerified: user.isEmailVerified || user.isPhoneVerified,
    }

    /** 
     * fake Authentication for test purpose only 
     * *******************************************
     * *********FAKE AUTHENTICATION END********* *
     * *******************************************
    **/
    // const session = await getServerSession();
    // if (!session?.user) return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });

    const { planId, duration } = body;
    if (!planId) {
        return NextResponse.json({ success: false, message: 'planId is required' }, { status: 400 });
    }
    const SubscriptionPlan = PlanModel(authDb);
    const plan = await SubscriptionPlan.findById(planId);
    console.log(plan);

    if (!plan) {
        return NextResponse.json({ success: false, message: 'Plan not found' }, { status: 404 });
    }
    const vendor_db = await vendorDbConnect();
    const Invoice = InvoiceModel(vendor_db);


    const invoiceInfo = await Invoice.create({
        userId: data.userId,
        planId,
        duration,
        durationType: duration,
        amount: plan.price,
        status: 'pending',
    });





    const token = await getBkashToken(); // Step 1: get token

    // Step 2: initiate bKash payment request
    const bkashUrl = 'https://tokenized.pay.bka.sh/v1.2.0-beta/tokenized/checkout/create';
    const callbackURL = `${process.env.NEXTAUTH_URL}/api/payment/callback`;

    const paymentRes = await fetch(bkashUrl, {
        method: 'POST',
        headers: {
            Authorization: token,
            'Content-Type': 'application/json',
            'X-APP-Key': process.env.BKASH_APP_KEY,
        },
        body: JSON.stringify({
            mode: '0011',
            payerReference: data.userId,
            callbackURL,
            amount: '1',
            currency: 'BDT',
            intent: 'sale',
            merchantInvoiceNumber: invoiceInfo._id.toString()
        })
    });

    const paymentData = await paymentRes.json();
    console.log("*********paymentData***********************");
    console.log(paymentData)
    if (!paymentData || !paymentData.paymentID) {
        return NextResponse.json({ success: false, message: 'bKash payment creation failed' }, { status: 500 });
    }

    await Invoice.findByIdAndUpdate(invoiceInfo._id, { paymentId: paymentData.paymentID });

    return NextResponse.json({ success: true, redirectURL: paymentData.bkashURL });
}
