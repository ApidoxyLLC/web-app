import { NextResponse } from 'next/server';
import { POST as executePayment } from '../../execute-payment/route';
import vendorDbConnect from "@/lib/mongodb/vendorDbConnect";
import { InvoiceModel } from '@/models/subscription/invoice';

export async function GET(request) {
    const { searchParams } = new URL(request.url);
    const paymentID = searchParams.get('paymentID');
    const status = searchParams.get('status');

    if (!paymentID || !status) {
        return NextResponse.redirect(new URL('/payment/error?reason=missing-data', request.url));
    }

    try {
        const vendor_db = await vendorDbConnect();
        const Invoice = InvoiceModel(vendor_db);

        if (status === 'success') {
            const fakeRequest = new Request('http://localhost', {
                method: 'POST',
                body: JSON.stringify({ paymentID }),
                headers: { 'Content-Type': 'application/json' },
            });

            const response = await executePayment(fakeRequest);
            const result = await response.json();
            console.log("*******result*********************")
            console.log(result)
            if (result?.data?.transactionStatus === 'Completed') {
                return NextResponse.redirect(new URL(`/payment/success?trxId=${result?.data?.trxID}`, request.url));
            } else {
                return NextResponse.redirect(new URL('/payment/error?reason=execution-failed', request.url));
            }
        }

        if (status === 'failure') {
            await Invoice.findOneAndDelete({ paymentId: paymentID });
            return NextResponse.redirect(new URL('/payment/error?reason=failure', request.url));
        }

        if (status === 'cancel') {
            await Invoice.findOneAndDelete({ paymentId: paymentID });
            return NextResponse.redirect(new URL('/payment/cancelled', request.url));
        }
        return NextResponse.redirect(new URL('/payment/error?reason=unknown-status', request.url));
    } catch (error) {
        console.error('Callback error:', error);
        return NextResponse.redirect(new URL('/payment/error?reason=callback-error', request.url));
    }
}
