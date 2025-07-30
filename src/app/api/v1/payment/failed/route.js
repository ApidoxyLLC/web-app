import { NextResponse } from 'next/server';
import connectDB from '@/lib/connectDB'; // your DB connector
import { invoiceModel } from '@/models/invoiceModel'; // update with your actual model

export async function GET(request) {
    const searchParams = new URL(request.url).searchParams;
    const paymentID = searchParams.get('paymentID'); // or 'invoiceId' if that’s what you send

    await connectDB();

    if (paymentID) {
        await invoiceModel.findOneAndDelete({ paymentID });
    }

    return NextResponse.redirect('/payment/fail'); // frontend fail page
}
