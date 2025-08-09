import { NextResponse } from 'next/server';
import vendorDbConnect from '@/lib/mongodb/vendorDbConnect';
import authDbConnect from '@/lib/mongodb/authDbConnect';
import { InvoiceModel } from '@/models/subscription/Invoice';
import { TransactionModel } from '@/models/subscription/transaction';
import { getBkashToken } from '@/services/bkash/getBkashToken';
import transactionDTOSchema from './transactionDTOSchema';
import { PlanModel } from '@/models/subscription/Plan';
import { shopModel } from '@/models/auth/Shop';
import { vendorModel } from '@/models/vendor/Vendor';
import { subscriptionModel } from '@/models/subscription/Subscribe';

export async function POST(request) {

    try {
        const { paymentID } = await request.json();

        if (!paymentID) {
            return NextResponse.json({
                success: false,
                message: 'Payment ID is required'
            }, { status: 400 });
        }

        // Execute bKash payment
        const token = await getBkashToken();
        const executeRes = await fetch(`${process.env.BKASH_BASE_URL}/tokenized/checkout/execute`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
                'Authorization': token,
                'X-APP-Key': process.env.BKASH_APP_KEY,
            },
            body: JSON.stringify({ paymentID }),
        });

        const executeResult = await executeRes.json();

        if (executeResult.statusCode && executeResult.statusCode !== "0000") {
            return NextResponse.json({
                success: false,
                message: "Payment execution failed",
                error: executeResult.statusMessage || "Unknown error",
            }, { status: 400 });
        }

        const vendor_db = await vendorDbConnect();
        const auth_db = await authDbConnect();

        // Get models
        const Invoice = InvoiceModel(vendor_db);
        const Transaction = TransactionModel(vendor_db);
        const Plan = PlanModel(vendor_db);
        const Subscription = subscriptionModel(vendor_db);
        const Shop = shopModel(auth_db);
        const Vendor = vendorModel(vendor_db);

        // Find and validate invoice
        const invoice = await Invoice.findOne({ paymentId: paymentID });
        if (!invoice) {
            return NextResponse.json({
                success: false,
                message: 'Invoice not found'
            }, { status: 404 });
        }

        // Check for existing active subscription
        const existingSubscription = await Subscription.findOne({
            shopId: invoice.shopId,
            isActive: true
        });

        // Get plan details
        const plan = await Plan.findById(invoice.planId).lean();
        if (!plan) {
            throw new Error('Associated plan not found');
        }

        // Prepare transaction data
        const transactionData = {
            userId: invoice.userId?.toString(),
            invoiceId: invoice._id.toString(),
            paymentID: paymentID,
            trxID: executeResult.trxID,
            transactionStatus: executeResult.transactionStatus,
            amount: invoice.amount?.toString(),
            currency: 'BDT',
            paymentExecuteTime: executeResult.paymentExecuteTime,
            paymentMethod: 'bKash',
            gatewayResponse: executeResult,
        };

        // Validate transaction data
        const parsed = transactionDTOSchema.safeParse(transactionData);
        if (!parsed.success) {
            return NextResponse.json({
                success: false,
                message: 'Validation failed',
                errors: parsed.error.issues
            }, { status: 400 });
        }

        // Store transaction
        await Transaction.create([parsed.data]);

        if (executeResult.transactionStatus === 'Completed') {
            // Update invoice
            const updatedInvoice = await Invoice.findOneAndUpdate(
                { paymentId: paymentID },
                {
                    $set: {
                        status: 'paid',
                        trxId: executeResult.trxID,
                        paidAt: new Date(),
                        paymentGatewayResponse: executeResult
                    }
                },
                { new: true}
            ).lean();

            if (!updatedInvoice) {
                throw new Error('Paid invoice not found');
            }

            // Calculate new validity period
            const now = new Date();
            const validityExtensionMs = invoice.validity.days * 24 * 60 * 60 * 1000;
            const newValidityUntil = new Date(
                (existingSubscription?.validity?.until?.getTime() || now.getTime()) +
                validityExtensionMs
            );

            // Prepare complete subscription data
            const subscriptionData = {
                userId: invoice.userId,
                shopId: invoice.shopId,
                shopReferenceId: invoice.shopReferenceId,
                planId: plan._id,
                planSnapshot: plan,
                planName: plan.name,
                planSlug: plan.slug,
                price: invoice.amount,
                billingCycle: invoice.billingCycle,
                validity: {
                    days: invoice.validity.days + (existingSubscription?.validity?.days || 0),
                    from: existingSubscription?.validity?.from || now,
                    until: newValidityUntil
                },
                services: plan.services,
                priority: plan.priority,
                paymentStatus: 'paid',
                paymentGateway: 'bKash',
                transactionId: executeResult.trxID,
                isActive: true
            };

            // Handle subscription creation/upgrade
            if (existingSubscription) {
                await Subscription.findByIdAndUpdate(
                    existingSubscription._id,
                    { $set: subscriptionData },
                    { new: true, upsert: true }
                );
            } else {
                await Subscription.create([subscriptionData]);
            }
            const updateOperation = {
                $set: {
                    currentPlan: plan.name,
                    'activeSubscriptions.$[sub].planId': plan._id,
                    'activeSubscriptions.$[sub].name': plan.name,
                    'activeSubscriptions.$[sub].validUntil': newValidityUntil,
                    'activeSubscriptions.$[sub].validity': subscriptionData.validity,
                    'activeSubscriptions.$[sub].services': plan.services,
                    'activeSubscriptions.$[sub].price': invoice.amount,
                    'activeSubscriptions.$[sub].billingCycle': invoice.billingCycle
                }
            };

            const pushOperation = {
                $push: {
                    activeSubscriptions: {
                        $each: [{
                            planId: plan._id,
                            name: plan.name,
                            validUntil: newValidityUntil,
                            validity: subscriptionData.validity,
                            services: plan.services,
                            price: invoice.amount,
                            billingCycle: invoice.billingCycle
                        }],
                       
                    }
                },
                $set: {
                    currentPlan: plan.name
                }
            };

            if (existingSubscription) {
                await Shop.findOneAndUpdate(
                    { referenceId: invoice.shopReferenceId },
                    updateOperation,
                    
                );

                await Vendor.findOneAndUpdate(
                    { referenceId: invoice.shopReferenceId },
                    updateOperation,
                    
                );
            } else {
                await Shop.findOneAndUpdate(
                    { referenceId: invoice.shopReferenceId },
                    pushOperation,
                );

                await Vendor.findOneAndUpdate(
                    { referenceId: invoice.shopReferenceId },
                    pushOperation,
                );
            }

            return NextResponse.json({
                success: true,
                message: 'Payment and subscription processed successfully',
                data: {
                    invoiceId: updatedInvoice._id,
                    subscription: {
                        plan: plan.name,
                        validUntil: newValidityUntil,
                        services: plan.services
                    }
                }
            });
        }

        return NextResponse.json({
            success: false,
            message: 'Payment not completed',
            data: executeResult
        });

    } catch (error) {
        console.error('[PAYMENT_EXECUTION_ERROR]', error);
        return NextResponse.json({
            success: false,
            message: 'Server error',
            error: error.message
        }, { status: 500 });
    } 
}