import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';

export async function generateReceiptPDF(invoice) {
console.log("*****from pdf generator ")
console.log(invoice)

    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage([595, 842]);
    const { width, height } = page.getSize();
    const margin = 50;
    let yPosition = height - margin;

    // Font setup
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

    // Validate and set default values
    const safeInvoice = {
        _id: invoice._id?.toString(),
        createdAt: invoice.createdAt ? new Date(invoice.createdAt) : new Date(),
        paymentMethod: invoice.paymentGateway,
        amount: invoice.amount ? `${invoice.amount}` : '0.00',
        currency: invoice.currency,
    };

    // Header
    page.drawText('PAYMENT RECEIPT', {
        x: margin,
        y: yPosition,
        size: 24,
        font: boldFont,
        color: rgb(0, 0, 0.5),
    });
    yPosition -= 40;

    // Helper function with validation
    const drawRow = (label, value, offset = 0) => {
        const safeValue = value !== undefined && value !== null ? value.toString() : 'N/A';

        page.drawText(label, {
            x: margin + offset,
            y: yPosition,
            size: 12,
            font: boldFont,
        });

        page.drawText(safeValue, {
            x: margin + 150 + offset,
            y: yPosition,
            size: 12,
            font,
        });

        yPosition -= 20;
    };

    // Invoice Info
    drawRow('Receipt Number:', safeInvoice._id);
    drawRow('Date:', safeInvoice.createdAt.toLocaleDateString());
    drawRow('Payment Method:', safeInvoice.paymentMethod);
    drawRow('Amount:', `${safeInvoice.amount} ${safeInvoice.currency}`);
    drawRow('Subscription ID:', safeInvoice.subscriptionId);
    yPosition -= 20;

    // Footer
    page.drawText('Thank you for your business!', {
        x: margin,
        y: 50,
        size: 12,
        font: boldFont,
        color: rgb(0.5, 0.5, 0.5),
    });

    return await pdfDoc.save();
}