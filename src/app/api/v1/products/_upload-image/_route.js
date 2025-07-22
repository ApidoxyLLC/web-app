import { NextResponse } from 'next/server';
import B2 from 'backblaze-b2';
import crypto from 'crypto';

export const config = { 
  api: { 
    bodyParser: false,
    sizeLimit: `${process.env.MAX_PRODUCT_IMAGE_FILE_SIZE_MB}mb`
  } 
};

// Initialize B2 client with persistent authorization
const b2 = new B2({
  applicationKeyId: process.env.B2_APPLICATION_KEY_ID,
  applicationKey: process.env.B2_APPLICATION_KEY,
});

// Authorization state management
let lastAuthTime = 0;

async function authorizeB2() {
  // Re-authorize if token is older than 23 hours
  if (Date.now() - lastAuthTime > 23 * 60 * 60 * 1000) {
    await b2.authorize();
    lastAuthTime = Date.now();
  }
}

// File validation config
const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png'];
const ALLOWED_EXTENSIONS = ['jpg', 'jpeg', 'png'];
const MAX_FILE_SIZE = parseInt(process.env.MAX_PRODUCT_IMAGE_FILE_SIZE_MB || "5", 10) * 1024 * 1024;

export async function POST(request) {
  try {
    // Validate content type
    const contentType = request.headers.get('content-type') || '';
    if (!contentType.includes('multipart/form-data')) {
      return NextResponse.json(
        { error: 'Invalid content type. Use multipart/form-data' },
        { status: 400 }
      );
    }

    // Parse form data
    const formData = await request.formData();
    const file = formData.get('file');

    // Validate file exists
    if (!file || typeof file === 'string') {
      return NextResponse.json(
        { error: 'No file provided or invalid file format' },
        { status: 400 }
      );
    }

    // Validate file type
    const fileExtension = file.name.split('.').pop()?.toLowerCase() || '';
    if (
      !ALLOWED_MIME_TYPES.includes(file.type) ||
      !ALLOWED_EXTENSIONS.includes(fileExtension)
    ) {
      return NextResponse.json(
        { error: `Unsupported file type. Allowed: ${ALLOWED_EXTENSIONS.join(', ')}` },
        { status: 400 }
      );
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: `File exceeds ${MAX_FILE_SIZE / 1024 / 1024}MB limit` },
        { status: 400 }
      );
    }

    // Sanitize filename and generate unique path
    const cleanName = file.name.replace(/[^a-zA-Z0-9_.-]/g, '_');
    const uuid = crypto.randomUUID();
    const fileName = `uploads/${uuid}-${cleanName}`;

    // Convert to buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    try {
      // Authorize and upload
      await authorizeB2();

      // Get upload URL
      const { data: uploadData } = await b2.getUploadUrl({
        bucketId: process.env.B2_BUCKET_ID
      });

      // Upload file
      const uploadResponse = await b2.uploadFile({
        uploadUrl: uploadData.uploadUrl,
        uploadAuthToken: uploadData.authorizationToken,
        fileName,
        data: buffer,
        mime: file.type,
        contentLength: buffer.length, // Use actual buffer length
      });

      // Construct download URL
      const downloadUrl = `${process.env.B2_PRODUCT_IMAGE_URL || 'https://apidoxy-temp-img.s3.us-east-005.backblazeb2.com'}/${fileName}`;

      return NextResponse.json({
        status: 'success',
        fileId: uploadResponse.data.fileId,
        fileName: uploadResponse.data.fileName,
        downloadUrl,
      });

    } catch (error) {
      console.error('B2 Upload Error:', error);
      
      // Handle specific B2 errors
      if (error.response?.data) {
        return NextResponse.json(
          { 
            error: `B2 API Error: ${error.response.data.code}`,
            message: error.response.data.message 
          },
          { status: 502 }
        );
      }
      
      return NextResponse.json(
        { error: 'Internal server error', details: error.message },
        { status: 500 }
      );
    }

  } catch (error) {
    console.error('Top Level Error:', error);
    return NextResponse.json(
      { error: 'Request processing failed', details: error.message },
      { status: 500 }
    );
  }
}