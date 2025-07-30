import { NextResponse } from 'next/server';
import { POST as executePayment } from '../../execute-payment/route';

export async function GET(request) {
    const { searchParams } = new URL(request.url);
    const paymentID = searchParams.get('paymentID');

    if (!paymentID) {
        return NextResponse.json({ success: false, message: 'Missing payment ID' }, { status: 400 });
    }

    try {
        const fakeRequest = new Request('http://localhost', {
            method: 'POST',
            body: JSON.stringify({ paymentID }),
            headers: { 'Content-Type': 'application/json' },
        });

        const response = await executePayment(fakeRequest);
        return response;
    } catch (error) {
        console.error('Execute payment failed:', error);
        return NextResponse.json({ success: false, message: 'Execution failed', error: error.message }, { status: 500 });
    }
}
