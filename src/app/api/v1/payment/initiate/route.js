// POST /api/payment/initiate
// Body: { invoiceId }
export async function POST(req) {
    const { invoiceId } = await req.json();
    const invoice = await invoiceModel.findById(invoiceId).populate('planId');

    // fetch token first (or use cache)
    const token = await getBkashToken(); // use previous token API or cache

    const response = await fetch('https://tokenized.sandbox.bka.sh/v1.2.0-beta/tokenized/checkout/create', {
        method: 'POST',
        headers: {
            Authorization: token,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            mode: '0011',
            payerReference: invoice.userId.toString(),
            callbackURL: `${process.env.APP_URL}/api/payment/success`,
            amount: invoice.planId.price.toString(),
            currency: 'BDT',
            intent: 'sale',
            merchantInvoiceNumber: invoice._id.toString()
        })
    });

    const data = await response.json();
    return NextResponse.json({ success: true, bkash: data });
}
