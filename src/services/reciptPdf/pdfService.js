import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';

export async function generateReceiptPDF(invoice) {
    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage([595, 842]);
    const { width, height } = page.getSize();
    const margin = 50;
    let yPosition = height - margin;

    // Font setup
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

    const safeInvoice = {
        _id: invoice._id?.toString(),
        createdAt: invoice.createdAt ? new Date(invoice.createdAt) : new Date(),
        paymentMethod: invoice.paymentMethod?.toString() || 'N/A',
        amount: invoice.amount ? invoice.amount.toString() : '0.00',
        currency: invoice.currency?.toString() || 'BDT',
        customer: {
            name: invoice.customer?.name?.toString() || 'N/A',
            business: invoice.customer?.business?.toString() || 'N/A',
            email: invoice.customer?.email?.toString() || 'N/A',
            phone: invoice.customer?.phone?.toString() || 'N/A'
        },
        subscription: {
            plan: invoice.subscription?.plan?.toString() || 'N/A',
            duration: invoice.subscription?.duration?.toString() || 'N/A',
            total: (invoice.subscription?.total || invoice.amount || '0.00').toString()
        }
    };

    // Header
    page.drawText('# Payment Receipt', {
        x: margin,
        y: yPosition,
        size: 24,
        font: boldFont,
        color: rgb(0, 0, 0),
    });
    yPosition -= 30;

    // Receipt ID
    page.drawText(safeInvoice._id, {
        x: margin,
        y: yPosition,
        size: 10,
        font,
        color: rgb(0.3, 0.3, 0.3),
    });
    yPosition -= 30;

    // Customer Info Section
    page.drawText('**To**', {
        x: margin,
        y: yPosition,
        size: 12,
        font: boldFont,
    });
    yPosition -= 20;

    page.drawText(safeInvoice.customer.name, {
        x: margin,
        y: yPosition,
        size: 12,
        font,
    });
    yPosition -= 15;

    page.drawText(`Business: ${safeInvoice.customer.business}`, {
        x: margin,
        y: yPosition,
        size: 12,
        font,
    });
    yPosition -= 15;

    page.drawText(`Email: ${safeInvoice.customer.email}`, {
        x: margin,
        y: yPosition,
        size: 12,
        font,
    });
    yPosition -= 15;

    page.drawText(`Phone: ${safeInvoice.customer.phone}`, {
        x: margin,
        y: yPosition,
        size: 12,
        font,
    });
    yPosition -= 30;

    // Divider line
    page.drawLine({
        start: { x: margin, y: yPosition },
        end: { x: width - margin, y: yPosition },
        thickness: 1,
        color: rgb(0.8, 0.8, 0.8),
    });
    yPosition -= 20;

    // Subscription Section
    page.drawText('## Subscription', {
        x: margin,
        y: yPosition,
        size: 14,
        font: boldFont,
    });
    yPosition -= 30;

    // Table headers
    page.drawText('Plan', {
        x: margin,
        y: yPosition,
        size: 12,
        font: boldFont,
    });
    page.drawText('Duration', {
        x: margin + 150,
        y: yPosition,
        size: 12,
        font: boldFont,
    });
    page.drawText('Total (BDT)', {
        x: margin + 300,
        y: yPosition,
        size: 12,
        font: boldFont,
    });
    yPosition -= 20;

    // Subscription row
    page.drawText(safeInvoice.subscription.plan, {
        x: margin,
        y: yPosition,
        size: 12,
        font,
    });
    page.drawText(safeInvoice.subscription.duration, {
        x: margin + 150,
        y: yPosition,
        size: 12,
        font,
    });
    page.drawText(safeInvoice.subscription.total, {
        x: margin + 300,
        y: yPosition,
        size: 12,
        font,
    });
    yPosition -= 20;

    // Total row
    page.drawText('Total (BDT)', {
        x: margin + 250,
        y: yPosition,
        size: 12,
        font: boldFont,
    });
    page.drawText(safeInvoice.subscription.total, {
        x: margin + 300,
        y: yPosition,
        size: 12,
        font,
    });
    yPosition -= 30;

    // Divider line
    page.drawLine({
        start: { x: margin, y: yPosition },
        end: { x: width - margin, y: yPosition },
        thickness: 1,
        color: rgb(0.8, 0.8, 0.8),
    });
    yPosition -= 20;

    // Payment Date
    page.drawText('## Payment Date', {
        x: margin,
        y: yPosition,
        size: 14,
        font: boldFont,
    });
    yPosition -= 20;

    page.drawText(safeInvoice.createdAt.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }), {
        x: margin,
        y: yPosition,
        size: 12,
        font,
    });
    yPosition -= 30;

    // Amount Paid
    page.drawText('## Amount Paid (BDT)', {
        x: margin,
        y: yPosition,
        size: 14,
        font: boldFont,
    });
    yPosition -= 20;

    page.drawText(safeInvoice.amount, {
        x: margin,
        y: yPosition,
        size: 12,
        font,
    });
    yPosition -= 30;

    // Footer text
    page.drawText('Have an invoice or billing question? Contact us', {
        x: margin,
        y: yPosition,
        size: 10,
        font,
        color: rgb(0.5, 0.5, 0.5),
    });
    yPosition -= 40;

    // Company info
    page.drawText('## Apidoxy', {
        x: margin,
        y: yPosition,
        size: 14,
        font: boldFont,
    });
    yPosition -= 20;

    page.drawText('### Easy Apps Anytime', {
        x: margin,
        y: yPosition,
        size: 12,
        font: boldFont,
    });
    yPosition -= 15;

    page.drawText('Level 6, Software Technology Park, Agrabad, Chattogram 4100 BD', {
        x: margin,
        y: yPosition,
        size: 10,
        font,
    });
    yPosition -= 15;

    page.drawText('apidoxy.com | support@apidoxy.com | Phone: +8801601-112888', {
        x: margin,
        y: yPosition,
        size: 10,
        font,
    });
    yPosition -= 30;

    // Electronic Document footer
    page.drawText('## Electronic Document', {
        x: margin,
        y: 30,
        size: 10,
        font,
    });
    page.drawText('Page 1 of 1', {
        x: width - margin - 50,
        y: 30,
        size: 10,
        font,
    });

    return await pdfDoc.save();
}