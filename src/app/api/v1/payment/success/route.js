import { NextResponse } from 'next/server';
import { redirect } from 'next/navigation';

export async function GET(request) {
    const searchParams = new URL(request.url).searchParams;
    const paymentID = searchParams.get('paymentID');

    if (!paymentID) {
        return NextResponse.redirect('/payment/fail'); // Or a custom error page
    }

    // Automatically call the execute API
    const executeRes = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/payment/execute`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ paymentID }),
    });

    const result = await executeRes.json();

    if (result.success) {
        // Redirect to your frontend success page (optional)
        return NextResponse.redirect(`/payment/success?trxID=${result.data.trxID}`);
    }

    // Redirect to fail if not successful
    return NextResponse.redirect('/payment/fail');
}
