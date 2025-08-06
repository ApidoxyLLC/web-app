import { NextResponse } from 'next/server';
import { generateReceiptPDF } from '@/services/reciptPdf/pdfService';
import { uploadSubscriptionReceipt } from '@/services/reciptPdf/backblazePdf';
import vendorDbConnect from "@/lib/mongodb/vendorDbConnect";
import { InvoiceModel } from '@/models/subscription/invoice';
import { sendPaymentNotification } from '@/services/sendReciptPdf/notificationService';
import { POST as executePayment } from '../../execute-payment/route';

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
            try {
                const fakeRequest = new Request('http://localhost', {
                    method: 'POST',
                    body: JSON.stringify({ paymentID }),
                    headers: { 'Content-Type': 'application/json' },
                });

                const response = await executePayment(fakeRequest);
                const result = await response.json();

                if (!result?.success) {
                    throw new Error(result?.message || 'Payment execution failed');
                }

                const pdfBytes = await generateReceiptPDF(invoice);
                // Upload to Backblaze
                const uploadResult = await uploadSubscriptionReceipt({
                    pdfBytes,
                    userId: invoice.userId,
                    paymentId: invoice.paymentId,
                    invoiceId: invoice._id
                });

                if (!uploadResult.success) {
                    throw new Error('Failed to upload receipt');
                }


                // Construct permanent view URL
                const viewUrl = `${process.env.NEXT_PUBLIC_SITE_URL}/api/receipts/${invoice._id}`;
                
              

                // Update invoice with notification status
                const updateData = {
                    status: 'completed',
                    receiptUrl: viewUrl,
                    receiptFileId: uploadResult.fileId,
                    completedAt: new Date(),
                    paymentStatus: 'processed'
                };

                await Invoice.updateOne(
                    { _id: invoice._id },
                    { $set: updateData }
                );

                // Send notification
                const notificationResult = await sendPaymentNotification({
                    userId: invoice.userId,
                    pdfUrl: viewUrl,
                    invoice: {
                        _id: invoice._id,
                        paymentId: invoice.paymentId,
                        amount: invoice.amount,
                        currency: invoice.currency,
                        // packageName: invoice.packageName,
                        // validUntil: invoice.validUntil
                    },
                });


                if (notificationResult.success) {
                    updateData.notifiedVia = notificationResult.channel;
                    updateData.notificationStatus = 'sent';
                } else {
                    updateData.notificationStatus = 'failed';
                    updateData.notificationError = notificationResult.message;
                }

                
                return NextResponse.redirect(
                    new URL(`/payment/success?trxId=${invoice.paymentId}`, request.url)
                );

            } catch (executionError) {
                console.error('Payment execution error:', executionError);
                // await Invoice.updateOne(
                //     { _id: invoice._id },
                //     { $set: { status: 'failed', error: executionError.message } }
                // );
                return NextResponse.redirect(
                    new URL(`/payment/error?reason=execution-failed&message=${encodeURIComponent(executionError.message)}`, request.url)
                );
            }
        }

        // Handle other statuses
        if (status === 'failure') {
            await Invoice.deleteOne({ _id: invoice._id });
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