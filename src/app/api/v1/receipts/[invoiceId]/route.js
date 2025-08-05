import { NextResponse } from 'next/server';
import { downloadReceipt } from '@/services/reciptPdf/backblazePdf';
import vendorDbConnect from "@/lib/mongodb/vendorDbConnect";
import { InvoiceModel } from '@/models/subscription/invoice';

export async function GET(request, { params }) {
    try {
        // 1. Get invoice from DB
        const vendor_db = await vendorDbConnect();
        const invoice = await InvoiceModel(vendor_db).findOne({
            _id: params.invoiceId
        });

        if (!invoice?.receiptFileId) {
            return NextResponse.json(
                { error: "Receipt not found" },
                { status: 404 }
            );
        }

        // 2. Download from Backblaze
        const pdfBuffer = await downloadReceipt(invoice.receiptFileId);

        // 3. Return as viewable PDF
        return new NextResponse(pdfBuffer, {
            headers: {
                'Content-Type': 'application/pdf',
                'Content-Disposition': 'inline',
                'Cache-Control': 'public, max-age=31536000', 
                'X-Content-Type-Options': 'nosniff'
            }
        });

    } catch (error) {
        return NextResponse.json(
            { error: error.message || "Failed to load receipt" },
            { status: 500 }
        );
    }
}