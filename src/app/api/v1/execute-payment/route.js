import { NextResponse } from 'next/server';
import vendorDbConnect from '@/lib/mongodb/vendorDbConnect';
import authDbConnect from '@/lib/mongodb/authDbConnect'
import { InvoiceModel } from '@/models/subscription/invoice';
import { TransactionModel } from '@/models/subscription/transaction';
import { getBkashToken } from '@/services/bkash/getBkashToken';
import transactionDTOSchema from './transactionDTOSchema';
import { PlanModel } from '@/models/subscription/Plan';
import { shopModel } from '@/models/auth/Shop';
import { vendorModel } from '@/models/vendor/Vendor';
export async function POST(request) {
    try {
        const { paymentID } = await request.json();

        if (!paymentID) {
            return NextResponse.json({ success: false, message: 'Payment ID is required' }, { status: 400 });
        }

        const token = await getBkashToken();
        const executeRes = await fetch(`${process.env.BKASH_BASE_URL}/tokenized/checkout/execute`, {
            body: JSON.stringify({ paymentID }),
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Accept: 'application/json',
                Authorization: token,
                'X-APP-Key': process.env.BKASH_APP_KEY,
            },
        });

        console.log('executeRes*******')
        console.log(executeRes)
        const executeResult = await executeRes.json();
        console.log("Execute result:", executeResult);

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

        // Find the invoice for reference
        const invoice = await Invoice.findOne({ paymentId: paymentID });
        if (!invoice) {
            return NextResponse.json({ success: false, message: 'Invoice not found' }, { status: 404 });
        }

        // console.log("invoice************************")
        // console.log(invoice)
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

        console.log("transactionData*************************")
        console.log(transactionData)

        // Validate data
        const parsed = transactionDTOSchema.safeParse(transactionData);
        if (!parsed.success) {
            return NextResponse.json({ success: false, message: 'Validation failed', errors: parsed.error.issues }, { status: 400 });
        }

        // Store transaction
        await Transaction.create(parsed.data);

        // Update invoice if payment is successful
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
                { new: true }
            ).lean();

            if (!updatedInvoice) {
                throw new Error('Paid invoice not found');
            }

            // Fetch complete plan document from vendor DB
            const Plan = PlanModel(vendor_db);
            const plan = await Plan.findById(updatedInvoice.planId).lean();

            if (!plan) {
                throw new Error('Associated plan not found');
            }

            const subscriptionData = {
                name: plan.name,
                slug: plan.slug,
                price: invoice.amount,
                billingCycle: invoice.billingCycle,
                validity: invoice.validity,
                services: plan.services,
                isActive: true
            };

            // Update Shop subscription
            const Shop = shopModel(auth_db);
            await Shop.findOneAndUpdate(
                { referenceId: updatedInvoice.shopReferenceId },
                [
                    {
                        $set: {
                            activeSubscriptions: {
                                $concatArrays: [
                                    {
                                        $filter: {
                                            input: "$activeSubscriptions",
                                            cond: { $ne: ["$$this.slug", "plan-a"] }
                                        }
                                    },
                                    [subscriptionData]
                                ]
                            }
                        }
                    }
                ],
            );

            const Vendor = vendorModel(vendor_db);
            await Vendor.findOneAndUpdate(
                { referenceId: updatedInvoice.shopReferenceId },
                [
                    {
                        $set: {
                            activeSubscriptions: {
                                $concatArrays: [
                                    {
                                        $filter: {
                                            input: "$activeSubscriptions",
                                            cond: { $ne: ["$$this.slug", "plan-a"] }
                                        }
                                    },
                                    [subscriptionData]
                                ]
                            }
                        }
                    }
                ],
            );

            return NextResponse.json({
                success: true,
                message: 'Payment and subscription updated successfully',
                data: {
                    invoiceId: updatedInvoice._id,
                    subscription: {
                        plan: subscriptionData.name,
                        validUntil: subscriptionData.expiresAt,
                        services: subscriptionData.services
                    }
                }
            });
        }

        return NextResponse.json({ success: false, message: 'Payment not completed', data: executeResult });

    } catch (error) {
        console.error('[EXECUTE_PAYMENT_ERROR]', error);
        return NextResponse.json({ success: false, message: 'Server error', error: error.message }, { status: 500 });
    }
}
