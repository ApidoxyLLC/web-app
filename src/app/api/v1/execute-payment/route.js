import { NextResponse } from 'next/server';
import vendorDbConnect from '@/lib/mongodb/vendorDbConnect';
import InvoiceModel from '@/models/subscription/invoice';
import getBkashToken from '@/lib/bkash/getBkashToken';

export async function POST(request) {
    try {
        const { paymentID } = await request.json();

        if (!paymentID) {
            return NextResponse.json({ success: false, message: 'Payment ID is required' }, { status: 400 });
        }

        const token = await getBkashToken();
        const response = await fetch(`${process.env.BKASH_BASE_URL}/payment/execute`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: token,
                'X-APP-Key': process.env.BKASH_APP_KEY,
            },
            body: JSON.stringify({ paymentID }),
        });

        const paymentResult = await response.json();

        if (paymentResult.transactionStatus === 'Completed') {
            const vendor_db = await vendorDbConnect();
            const Invoice = InvoiceModel(vendor_db);

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
