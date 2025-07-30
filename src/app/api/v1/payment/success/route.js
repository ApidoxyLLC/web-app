export async function POST_success(req) {
    const { paymentID, status } = await req.json();

    const invoice = await subscriptionInvoiceModel.findOne({ paymentId: paymentID });
    if (!invoice) return NextResponse.json({ success: false, message: 'Invoice not found' }, { status: 404 });

    if (status === 'Completed') {
        // Update invoice
        invoice.status = 'paid';
        await invoice.save();

        // Update user subscription
        await userModel.findByIdAndUpdate(invoice.userId, {
            subscription: {
                plan: invoice.planId,
                startDate: new Date(),
                endDate: new Date(Date.now() + invoice.duration * 24 * 60 * 60 * 1000)
            }
        });
    }

    return NextResponse.redirect('/dashboard');
}