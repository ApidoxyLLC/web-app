import { NextResponse } from 'next/server';
import connectDB from '@/lib/connectDB';
import { invoiceModel } from '@/models/invoiceModel';

export async function GET(request) {
    const searchParams = new URL(request.url).searchParams;
    const paymentID = searchParams.get('paymentID');

    await connectDB();

    if (paymentID) {
        await invoiceModel.findOneAndDelete({ paymentID });
    }

    return NextResponse.redirect('/payment/cancel');
}
