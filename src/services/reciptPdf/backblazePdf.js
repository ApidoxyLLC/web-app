import B2 from 'backblaze-b2';

const b2 = new B2({
    applicationKeyId: process.env.B2_APPLICATION_KEY_ID,
    applicationKey: process.env.B2_APPLICATION_KEY
});

let lastAuth = 0;
let authPromise = null;

async function authorizeB2() {
    if (authPromise) return authPromise;
    if (Date.now() - lastAuth < 23 * 60 * 60 * 1000) return b2;

    try {
        authPromise = b2.authorize();
        await authPromise;
        lastAuth = Date.now();
        return b2;
    } finally {
        authPromise = null;
    }
}

// UPLOAD (modified to return fileId)
export async function uploadSubscriptionReceipt({ pdfBytes, paymentId, invoiceId }) {
    try {
        const b2Client = await authorizeB2();
        const fileName = `receipts/${paymentId}/${invoiceId}.pdf`;

        const { data: uploadData } = await b2Client.getUploadUrl({
            bucketId: process.env.B2_PDF_BUCKET_ID
        });

        const uploadResponse = await b2Client.uploadFile({
            uploadUrl: uploadData.uploadUrl,
            uploadAuthToken: uploadData.authorizationToken,
            fileName,
            data: pdfBytes,
            mime: 'application/pdf'
        });

        return {
            success: true,
            fileId: uploadResponse.data.fileId // Return only the file ID
        };

    } catch (error) {
        console.error('Backblaze upload error:', error);
        throw new Error(`Upload failed: ${error.message}`);
    }
}

// NEW: Download helper
export async function downloadReceipt(fileId) {
    try {
        const b2Client = await authorizeB2();
        const response = await b2Client.downloadFileById({
            fileId,
            responseType: 'arraybuffer'
        });
        return Buffer.from(response.data);
    } catch (error) {
        console.error('Backblaze download error:', error);
        throw new Error('Failed to fetch PDF');
    }
}