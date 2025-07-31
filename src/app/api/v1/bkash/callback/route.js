import { NextResponse } from 'next/server';
import { generateReceiptPDF } from '@/services/pdf/pdfService';
import { uploadSubscriptionReceipt } from '@/services/pdf/backblazePdf';
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
        const invoice = await Invoice.findOne({ paymentId: paymentID });

        if (!invoice) {
            return NextResponse.redirect(new URL('/payment/error?reason=invoice-not-found', request.url));
        }

        if (status === 'success') {
            // Generate PDF
            const pdfBytes = await generateReceiptPDF(invoice);

            // Upload to Backblaze
            const uploadResult = await uploadSubscriptionReceipt({
                pdfBytes,
                userId: invoice.userId,
                paymentId: invoice.paymentId,
                invoiceId: invoice._id
            });
            console.log("uploadResult***************")
            console.log(uploadResult)
            if (!uploadResult.success) {
                throw new Error('Failed to upload receipt');
            }

            // Update invoice
            await Invoice.updateOne(
                { _id: invoice._id },
                {
                    $set: {
                        receiptUrl: uploadResult.url,
                        receiptFileId: uploadResult.fileId,
                        status: 'paid',
                        completedAt: new Date()
                    }
                }
            );

            return NextResponse.redirect(
                new URL(`/payment/success?trxId=${invoice.paymentId}`, request.url)
            );
        }

        // Handle other statuses
        if (status === 'failure') {
            await Invoice.updateOne(
                { _id: invoice._id },
                { $set: { status: 'failed' } }
            );
            return NextResponse.redirect(new URL('/payment/error?reason=payment-failed', request.url));
        }

        if (status === 'cancel') {
            await Invoice.deleteOne({ _id: invoice._id });
            return NextResponse.redirect(new URL('/payment/cancelled', request.url));
        }

        return NextResponse.redirect(new URL('/payment/error?reason=invalid-status', request.url));

    } catch (error) {
        console.error('Payment callback error:', error);
        return NextResponse.redirect(
            new URL(`/payment/error?reason=server-error&message=${encodeURIComponent(error.message)}`, request.url)
        );
    }
}