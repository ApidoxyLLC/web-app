import B2 from 'backblaze-b2';
import { Blob } from 'buffer';

const b2 = new B2({
    applicationKeyId: process.env.B2_APPLICATION_KEY_ID,
    applicationKey: process.env.B2_APPLICATION_KEY
});

// Token refresh tracking
let lastAuth = 0;
let authPromise = null;

async function authorizeB2() {
    // Return ongoing auth if exists
    if (authPromise) return authPromise;
    
    const now = Date.now();
    if (now - lastAuth < 23 * 60 * 60 * 1000) {
        return b2;
    }

    try {
        authPromise = b2.authorize();
        await authPromise;
        lastAuth = Date.now();
        return b2;
    } finally {
        authPromise = null;
    }
}

export async function uploadSubscriptionReceipt({ pdfBytes, userId, paymentId, invoiceId }) {
    try {
        // Validate inputs
        if (!pdfBytes || !paymentId || !invoiceId) {
            throw new Error('Missing required parameters: pdfBytes, paymentId, or invoiceId');
        }

        const b2Client = await authorizeB2();
        const bucketId = process.env.B2_PDF_BUCKET_ID;
        const bucketName = process.env.B2_PDF_BUCKET_NAME;

        // Prepare file with directory structure
        const fileName = `receipts/${paymentId}/${invoiceId}.pdf`;
        const fileBuffer = Buffer.from(pdfBytes); // Direct buffer conversion

        // Get upload authorization
        const { data: uploadData } = await b2Client.getUploadUrl({ bucketId });

        // Upload file with metadata
        const uploadResponse = await b2Client.uploadFile({
            uploadUrl: uploadData.uploadUrl,
            uploadAuthToken: uploadData.authorizationToken,
            fileName,
            data: fileBuffer,
            mime: 'application/pdf',
            contentLength: fileBuffer.length,
            info: {
                'x-bz-info-userId': userId,
                'x-bz-info-uploadedAt': new Date().toISOString()
            }
        });

        // Generate signed download URL (valid for 7 days)
        const { data: downloadAuth } = await b2Client.getDownloadAuthorization({
            bucketId,
            fileNamePrefix: fileName,
            validDurationInSeconds: 604800, // 7 days max
            b2ContentDisposition: `attachment; filename="${invoiceId}.pdf"`
        });

        const downloadUrl = `https://${process.env.B2_ENDPOINT || 'f000.backblazeb2.com'}/file/${bucketName}/${fileName}?Authorization=${downloadAuth.authorizationToken}`;

        return {
            success: true,
            url: downloadUrl,
            fileId: uploadResponse.data.fileId,
            fileName: uploadResponse.data.fileName,
            expiresAt: new Date(Date.now() + 604800 * 1000)
        };

    } catch (error) {
        console.error('Backblaze upload error:', {
            error: error.message,
            paymentId,
            invoiceId,
            userId
        });
        
        throw new Error(`Receipt upload failed: ${error.message}`);
    }
}