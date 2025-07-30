import { NextResponse } from 'next/server';
import vendorDbConnect from '@/lib/mongodb/vendorDbConnect';
import { InvoiceModel } from '@/models/subscription/invoice';
import { TransactionModel } from '@/models/subscription/transaction';
import { getBkashToken } from '@/services/bkash/getBkashToken';
import transactionDTOSchema from './transactionDTOSchema';
import { queryBkashPayment } from "@/services/bkash/queryBkashPayment";

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

        const paymentResult = await queryBkashPayment(paymentID);
        console.log("Payment Query result:", paymentResult);



        const vendor_db = await vendorDbConnect();
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
            trxID: paymentResult.trxID,
            transactionStatus: paymentResult.transactionStatus,
            amount: invoice.amount?.toString(),
            currency: 'BDT',
            paymentExecuteTime: paymentResult.completedTime,
            paymentMethod: 'bKash',
            gatewayResponse: paymentResult,
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
        if (paymentResult.transactionStatus === 'Completed') {
            await Invoice.findOneAndUpdate(
                { paymentId: paymentID },
                {
                    $set: {
                        status: 'paid',
                        trxId: paymentResult.trxID,
                        paymentTime: new Date(),
                    },
                }
            );

            return NextResponse.json({ success: true, message: 'Payment successful', data: paymentResult });
        }

        return NextResponse.json({ success: false, message: 'Payment not completed', data: paymentResult });

    } catch (error) {
        console.error('[EXECUTE_PAYMENT_ERROR]', error);
        return NextResponse.json({ success: false, message: 'Server error', error: error.message }, { status: 500 });
    }
}
