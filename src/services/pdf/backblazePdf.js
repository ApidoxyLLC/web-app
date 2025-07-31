import B2 from 'backblaze-b2';
import { Blob } from 'buffer';

const b2 = new B2({
    applicationKeyId: process.env.B2_KEY_ID,
    applicationKey: process.env.B2_APPLICATION_KEY
});

let lastAuth = 0;

async function authorizeB2() {
    const now = Date.now();
    if (now - lastAuth > 23 * 60 * 60 * 1000) {
        await b2.authorize();
        lastAuth = now;
    }
    return b2;
}

export async function uploadSubscriptionReceipt({ pdfBytes, userId, paymentId, invoiceId }) {

    console.log("uploadPDF*****")
    console.log(paymentId)


    try {
        const b2 = await authorizeB2();
        const bucketId = process.env.B2_BUCKET_ID;

        // Prepare file
        const fileName = `receipts/${paymentId}/${invoiceId}.pdf`;
        const blob = new Blob([pdfBytes], { type: 'application/pdf' });
        const fileBuffer = Buffer.from(await blob.arrayBuffer());

        // Get upload URL
        const { data: uploadData } = await b2.getUploadUrl({ bucketId });

        // Upload file
        const uploadResponse = await b2.uploadFile({
            uploadUrl: uploadData.uploadUrl,
            uploadAuthToken: uploadData.authorizationToken,
            fileName,
            data: fileBuffer,
            mime: 'application/pdf',
            contentLength: fileBuffer.length
        });

        // Generate public URL
        const downloadUrl = `https://f000.backblazeb2.com/file/${process.env.B2_BUCKET_NAME}/${fileName}`;

        return {
            success: true,
            url: downloadUrl,
            fileId: uploadResponse.data.fileId,
            fileName: uploadResponse.data.fileName
        };
    } catch (error) {
        console.error('Backblaze upload error:', error);
        throw new Error('Failed to upload receipt');
    }
}