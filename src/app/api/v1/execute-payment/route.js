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

        const Invoice = InvoiceModel(vendor_db);
        const Transaction = TransactionModel(vendor_db);
        const Plan = PlanModel(vendor_db);
        const Subscription = subscriptionModel(vendor_db);
        const Shop = shopModel(auth_db);
        const Vendor = vendorModel(vendor_db);

        const invoice = await Invoice.findOne({ paymentId: paymentID });
        if (!invoice) {
            return NextResponse.json({
                success: false,
                message: 'Invoice not found'
            }, { status: 404 });
        }

        const plan = await Plan.findById(invoice.planId).lean();
        if (!plan) {
            throw new Error('Associated plan not found');
        }

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

        const parsed = transactionDTOSchema.safeParse(transactionData);
        if (!parsed.success) {
            return NextResponse.json({
                success: false,
                message: 'Validation failed',
                errors: parsed.error.issues
            }, { status: 400 });
        }

        await Transaction.create([parsed.data]);

        if (executeResult.transactionStatus === 'Completed') {
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
                { new: true }
            ).lean();

            if (!updatedInvoice) {
                throw new Error('Paid invoice not found');
            }

            const now = new Date();
            const newValidityUntil = new Date(
                now.getTime() + (invoice.validity.days * 24 * 60 * 60 * 1000)
            );

           
            const newSubscription = {
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
                    days: invoice.validity.days,
                    from: now,
                    until: newValidityUntil
                },
                services: plan.services,
                features: plan.features || {},
                limitations: plan.limitations || {},
                priority: plan.priority,
                paymentStatus: 'paid',
                paymentGateway: 'bKash',
                transactionId: executeResult.trxID,
                isActive: true,
                createdAt: now,
                updatedAt: now
            };

            await Subscription.create([newSubscription]);

           
            const subscriptionObject = {
                planId: plan._id,
                name: plan.name,
                planSlug: plan.slug,
                validUntil: newValidityUntil,
                validity: {
                    days: invoice.validity.days,
                    from: now,
                    until: newValidityUntil
                },
                services: plan.services,
                features: plan.features || {},
                limitations: plan.limitations || {},
                price: invoice.amount,
                billingCycle: invoice.billingCycle,
                updatedAt: now
            };

            const shop = await Shop.findOne({ referenceId: invoice.shopReferenceId });
            const existingPlanIndex = shop?.activeSubscriptions?.findIndex(
                sub => sub.planSlug === plan.slug
            );

            if (existingPlanIndex !== undefined && existingPlanIndex >= 0) {
                const updateOperation = {
                    $set: {
                        [`activeSubscriptions.${existingPlanIndex}`]: subscriptionObject,
                        currentPlan: plan.name,
                        updatedAt: now
                    }
                };

                await Shop.updateOne(
                    { referenceId: invoice.shopReferenceId },
                    updateOperation
                );

                await Vendor.updateOne(
                    { referenceId: invoice.shopReferenceId },
                    updateOperation
                );
            } else {
                const pushOperation = {
                    $push: {
                        activeSubscriptions: subscriptionObject
                    },
                    $set: {
                        currentPlan: plan.name,
                        updatedAt: now
                    }
                };

                await Shop.updateOne(
                    { referenceId: invoice.shopReferenceId },
                    pushOperation
                );

                await Vendor.updateOne(
                    { referenceId: invoice.shopReferenceId },
                    pushOperation
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