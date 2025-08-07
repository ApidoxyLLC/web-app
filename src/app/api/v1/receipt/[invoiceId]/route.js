// import { NextResponse } from 'next/server';
// import { downloadReceipt } from '@/services/reciptPdf/backblazePdf';
// import vendorDbConnect from "@/lib/mongodb/vendorDbConnect";
// import { InvoiceModel } from '@/models/subscription/invoice';
// import mongoose from 'mongoose';

// export async function GET(req, { params }) {
//     try {
//         // 1. Enhanced validation
//         if (!params.invoiceId || !mongoose.Types.ObjectId.isValid(params.invoiceId)) {
//             return new NextResponse('Invalid invoice ID format', { status: 400 });
//         }

//         // 2. Get invoice from DB with better error handling
//         const vendor_db = await vendorDbConnect();
//         const invoice = await InvoiceModel(vendor_db)
//             .findOne({ _id: params.invoiceId })
//             .select('receiptFileId bucket folder filename')
//             .lean();

//         if (!invoice) {
//             return new NextResponse('Invoice not found', { status: 404 });
//         }

//         if (!invoice.receiptFileId || !invoice.bucket || !invoice.folder || !invoice.filename) {
//             return new NextResponse('Receipt file information incomplete', { status: 404 });
//         }

//         // 3. Download from Backblaze using new format
//         const response = await downloadReceipt({
//             bucketName: bucket,
//             fileName: `${folder}/${file}`,
//             responseType: 'stream',
//         });

//         // 4. Prepare optimized response headers
//         const headers = new Headers({
//             'Content-Type': 'application/pdf',
//             'Content-Disposition': `inline; filename="${invoice.filename || 'receipt.pdf'}"`,
//             'Cache-Control': 'public, max-age=604800', // 1 week cache
//             'X-Content-Type-Options': 'nosniff'
//         });

//         if (response.headers?.['content-length']) {
//             headers.set('Content-Length', response.headers['content-length']);
//         }
//         if (response.headers?.['last-modified']) {
//             headers.set('Last-Modified', response.headers['last-modified']);
//         }

//         // 5. Return the PDF response
//         return new NextResponse(response.data, {
//             status: 200,
//             headers
//         });

//     } catch (err) {
//         console.error('Receipt Download Error:', err.message);
//         const statusCode = err.message.includes('not found') ? 404 : 500;
//         return new NextResponse(
//             statusCode === 404 ? 'Receipt not found' : 'Internal server error',
//             { status: statusCode }
//         );
//     }
// }