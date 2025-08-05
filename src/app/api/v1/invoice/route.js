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
import {shopModel} from '@/models/auth/Shop'
export async function POST(request) {
    const body = await request.json();
    const vendor_db = await vendorDbConnect();
    const auth_db = await authDbConnect();

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
        referenceId: "cmdwxn2sg0000o09w6morw1mv"
    })
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

    const { planSlug, duration, shopReferenceId } = body;

    if (!planSlug || !duration || !shopReferenceId) {
        return NextResponse.json(
            {
                success: false,
                message: 'planSlug, duration, and shopReferenceId are required',
                missingFields: {
                    planSlug: !planSlug,
                    duration: !duration,
                    shopReferenceId: !shopReferenceId
                }
            },
            { status: 400 }
        );
    }

    const SubscriptionPlan = PlanModel(vendor_db);
    const plan = await SubscriptionPlan.findOne({ slug: planSlug });
    console.log(plan);

    if (!plan) {
        return NextResponse.json({ success: false, message: 'Plan not found' }, { status: 404 });
    }

    const Shop = shopModel(auth_db);
    const shop = await Shop.findOne({ referenceId: shopReferenceId });

    if (!shop) {
        return NextResponse.json(
            { success: false, message: `Shop with referenceId '${shopReferenceId}' not found` },
            { status: 404 }
        );
    }

    let amount, validityDays;

    if (duration === 'monthly') {
        amount = plan.price;  
        validityDays = plan.monthly;  
    } else if (duration === 'yearly') {
        amount = plan.price * 12;  
        validityDays = plan.yearly; 
    }

    const now = new Date();
    const validUntil = new Date(now.getTime() + validityDays * 24 * 60 * 60 * 1000);


    const Invoice = InvoiceModel(vendor_db);


    const invoiceInfo = await Invoice.create({
        userId: data.userId,
        shopId: shop._id,
        shopReferenceId: shop.referenceId,
        userDetails: {
            name: data.name,
            email: data.email,
            phone: data.phone
        },
        shopDetails: {
            name: shop.businessName,
        },
        planId: plan._id,
        planSlug: plan.slug,
        planDetails: {
            name: plan.name,
            slug: plan.slug,
            services: plan.services
        },
        amount,
        validity: {
            days: validityDays,
            from: now,
            until: validUntil
        },
        status: 'pending',
        billingCycle: duration,
        paymentMethod: 'bkash'
    });



    let paymentData;
    try {
        paymentData = await initiateBkashPayment({
            userId: data.userId,
            invoiceId: invoiceInfo._id,
            amount: amount,
        });
    } catch (err) {
        return NextResponse.json({ success: false, message: err.message }, { status: 500 });
    }

    // Update invoice with payment ID
    await Invoice.findByIdAndUpdate(invoiceInfo._id, {
        paymentId: paymentData.paymentID,
        paymentGatewayResponse: paymentData
    });

    return NextResponse.json({
        success: true,
        paymentID: paymentData.paymentID,
        redirectURL: paymentData.bkashURL
    });
}