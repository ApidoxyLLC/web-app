import { NextResponse } from 'next/server';
import B2 from 'backblaze-b2';
import crypto from 'crypto';
import authDbConnect from '@/app/lib/mongodb/authDbConnect';
import { shopModel } from '@/models/auth/Shop';

export const config = { api: {  bodyParser: false,
                                 sizeLimit: '20mb'  } };

// Initialize B2 client
const b2 = new B2({
  applicationKeyId: process.env.B2_APPLICATION_KEY_ID,
  applicationKey: process.env.B2_APPLICATION_KEY,
});

// Authorization state
let lastAuthTime = 0;

async function authorizeB2() {
  if (Date.now() - lastAuthTime > 23 * 60 * 60 * 1000) {
    await b2.authorize();
    lastAuthTime = Date.now();
  }
}

// Concurrency control
const MAX_CONCURRENT_UPLOADS = 3;
const uploadQueue = [];

// File validation config
const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png'];
const ALLOWED_EXTENSIONS = ['jpg', 'jpeg', 'png'];
const MAX_FILE_SIZE = parseInt(process.env.MAX_PRODUCT_IMAGE_FILE_SIZE_MB || "5", 10) * 1024 * 1024;
const MAX_TOTAL_SIZE = 20 * 1024 * 1024; // 20MB total for all files

// Process individual file upload
async function uploadSingleFile({file, uploadData, folder}) {
  const fileExtension = file.name.split('.').pop()?.toLowerCase() || '';
  
  // Validate file
  if (!ALLOWED_MIME_TYPES.includes(file.type) ||  !ALLOWED_EXTENSIONS.includes(fileExtension))
    throw new Error(`Unsupported file type: ${file.name}`);
  
  if (file.size > MAX_FILE_SIZE) 
    throw new Error(`File ${file.name} exceeds ${MAX_FILE_SIZE / 1024 / 1024}MB limit`);  

  // Sanitize filename
  // const cleanName = file.name.replace(/[^a-zA-Z0-9_.-]/g, '_');
  const uuid = crypto.randomUUID();
  // const fileName = `uploads/${uuid}-${cleanName}`;
  const fileName = `temp_${folder}/${uuid}`;

  
  // Convert to buffer
  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  
  // Upload to B2
  const uploadResponse = await b2.uploadFile({
    uploadUrl: uploadData.uploadUrl,
    uploadAuthToken: uploadData.authorizationToken,
    fileName,
    data: buffer,
    mime: file.type,
    contentLength: buffer.length,
  });

  // Construct download URL
  const downloadUrl = `${process.env.B2_DOWNLOAD_URL_PREFIX || 
    'https://f002.backblazeb2.com/file/' + process.env.B2_BUCKET_NAME}/${fileName}`;

  return {
    originalName: file.name,
    status: 'success',
    fileId: uploadResponse.data.fileId,
    fileName: uploadResponse.data.fileName,
    downloadUrl,
    size: file.size,
  };
}

// Process upload with concurrency control
async function processWithConcurrency({files, uploadData, folder}) {
  const results = [];
  let totalSize = 0;

  // Validate total size first
  for (const file of files) {
    totalSize += file.size;
  }
  
  if (totalSize > MAX_TOTAL_SIZE) {
    throw new Error(`Total upload size exceeds ${MAX_TOTAL_SIZE / 1024 / 1024}MB limit`);
  }

  // Process files with concurrency control
  const processFile = async (file) => {
    try {
      return await uploadSingleFile({file, uploadData, folder});
    } catch (error) {
      return {
        originalName: file.name,
        status: 'error',
        error: error.message
      };
    }
  };

  // Create worker promises
  const workers = Array(MAX_CONCURRENT_UPLOADS).fill(null).map(async (_, i) => {
    while (uploadQueue.length > 0) {
      const file = uploadQueue.shift();
      const result = await processFile(file);
      results.push(result);
    }
  });

  // Add files to queue
  uploadQueue.push(...files);
  
  // Wait for all workers to finish
  await Promise.all(workers);
  
  return results;
}

export async function POST(request) {
  let body;
  try { body = await request.json();} 
  catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });}
  const  vendorId = request.headers.get('x-vendor-identifier');
  const      host = request.headers.get('host'); 
  const        ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 
                    request.headers.get('x-real-ip') || 'unknown_ip';
  const userAgent = request.headers.get('user-agent') || '';
  if (!vendorId && !host) return NextResponse.json({ error: "Missing vendor identifier or host" },{ status: 400 });

  const fingerprint = request.headers.get('x-fingerprint') || null;
  const { allowed, headers} = rateLimit({ip, fingerprint});
  if (!allowed) return NextResponse.json( { error: "Too many requests" }, { status: 429, headers: headers } );

    // Connect to auth database
    const auth_db = await authDbConnect();
    const ShopModel = shopModel(auth_db);
    
    // Get shop configuration
    const shop = await ShopModel.findOne({ $or: [ { vendorId }, { "domains": { $elemMatch: { domain: host } } }]})
                                .select("+_id "+
                                        "+dbInfo +dbInfo.uri +dbInfo.prefix "+
                                        "+maxSessionAllowed "+
                                        "+keys +keys.ACCESS_TOKEN_SECRET +keys.REFRESH_TOKEN_SECRET " +
                                        "+timeLimitations.ACCESS_TOKEN_EXPIRE_MINUTES +timeLimitations.REFRESH_TOKEN_EXPIRE_MINUTES" 
                                      ).lean();

    if (!shop) 
      return NextResponse.json( { error: "Authentication failed" }, { status: 400 } )

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
    const files = formData.getAll('files');
    
    // Validate files
    if (!files || files.length === 0) {
      return NextResponse.json(
        { error: 'No files provided' },
        { status: 400 }
      );
    }

    // Filter out non-file entries
    const validFiles = files.filter(file => file.name && file.size > 0);
    
    if (validFiles.length === 0) {
      return NextResponse.json(
        { error: 'No valid files provided' },
        { status: 400 }
      );
    }

    try {
      // Authorize and get upload URL
      await authorizeB2();
      const { data: uploadData } = await b2.getUploadUrl({
        bucketId: process.env.B2_BUCKET_ID
      });

      // Process files with concurrency control
      const results = await processWithConcurrency({validFiles, uploadData, folder: shop._id });

      // Count successes and errors
      const successCount = results.filter(r => r.status === 'success').length;
      const errorCount = results.filter(r => r.status === 'error').length;

      return NextResponse.json({
        message: `Processed ${files.length} files (${successCount} success, ${errorCount} errors)`,
        results
      });

    } catch (error) {
      console.error('B2 Processing Error:', error);
      return NextResponse.json(
        { 
          error: 'File processing failed',
          details: error.message 
        },
        { status: 500 }
      );
    }

  } catch (error) {
    console.error('Top Level Error:', error);
    return NextResponse.json(
      { 
        error: 'Request processing failed',
        details: error.message 
      },
      { status: 500 }
    );
  }
}