import vendorDbConnect from "@/lib/mongodb/vendorDbConnect";
import mongoose from 'mongoose';
import { getServerSession } from "next-auth/next";
import { NextResponse } from 'next/server';
import { InvoiceModel } from '@/models/subscription/invoice';
import { userModel } from "@/models/auth/user";
import authDbConnect from "@/lib/mongodb/authDbConnect";
import invoiceDTOSchema from './invoiceDTOSchema';
import { PlanModel } from "@/models/subscription/Plan";
import { initiateBkashPayment } from '@/services/bkash/initiateBkashPayment';

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
    const user = await User.findOne({
        referenceId: "cmdwxn2sg0000o09w6morw1mv" })
        .select('referenceId _id name email phone role isEmailVerified')
    console.log(user)
    const data = {
        // sessionId: "cmdags8700000649w6qyzu8xx",
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


    let paymentData;
    try {
        paymentData = await initiateBkashPayment({
            userId: data.userId,
            invoiceId: invoiceInfo._id,
            amount: plan.price,
        });
    } catch (err) {
        return NextResponse.json({ success: false, message: err.message }, { status: 500 });
    }

    // Update invoice with payment ID
    await Invoice.findByIdAndUpdate(invoiceInfo._id, { paymentId: paymentData.paymentID });

    return NextResponse.json({
        success: true,
        paymentID: paymentData.paymentID,
        redirectURL: paymentData.bkashURL
    });
}