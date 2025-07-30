export async function POST_failOrCancel(req) {
    const { paymentID } = await req.json();
    await subscriptionInvoiceModel.deleteOne({ paymentId: paymentID });
    return NextResponse.redirect('/plans');
}