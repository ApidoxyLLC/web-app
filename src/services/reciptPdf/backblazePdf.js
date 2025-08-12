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

export async function uploadSubscriptionReceipt({ pdfBytes, paymentId, invoiceId }) {
    try {
        const b2Client = await authorizeB2();
        const fileName = `${invoiceId}.pdf`

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
        console.log("uploadResponse******");
        console.log(uploadResponse)
        console.log(uploadData)


        return {
            success: true,
            fileId: uploadResponse.data.fileId,
            fileName: uploadResponse.data.fileName,
            bucketId: uploadResponse.data.bucketId
        };

    } catch (error) {
        console.error('Backblaze upload error:', error);
        throw new Error(`Upload failed: ${error.message}`);
    }
}



export async function downloadReceipt({ bucketName, fileName }) {
    try {
        const b2Client = await authorizeB2();

        // Ensure bucketName and fileName are properly encoded if needed
        const response = await b2Client.downloadFileByName({
            bucketName: bucketName,
            fileName: fileName,
            responseType: 'arraybuffer'
        });

        // Verify the response is actually a PDF
        if (!response.data || response.headers['content-type'] !== 'application/pdf') {
            throw new Error('Invalid PDF response from Backblaze');
        }

        return {
            data: Buffer.from(response.data),
            headers: {
                'content-type': response.headers['content-type'],
                'content-length': response.headers['content-length'],
                'last-modified': response.headers['last-modified']
            }
        };

    } catch (error) {
        console.error('Backblaze download error:', {
            message: error.message,
            response: error.response?.data,
            status: error.response?.status
        });
        throw new Error(error.response?.data?.message || 'Failed to fetch PDF');
    }
}