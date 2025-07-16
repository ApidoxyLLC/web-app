import { NextResponse } from 'next/server';
import B2 from 'backblaze-b2';
import crypto from 'crypto';
import authDbConnect from '@/lib/mongodb/authDbConnect';
import { shopModel } from '@/models/auth/Shop';
import { applyRateLimit } from '@/lib/rateLimit/rateLimiter';

// Initialize B2 client
const b2 = new B2({ applicationKeyId: process.env.B2_APPLICATION_KEY_ID,
                      applicationKey: process.env.B2_APPLICATION_KEY      });

// Authorization state
let lastAuthTime = 0;

async function authorizeB2() {
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
  // let body;
  // try { body = await request.json();} 
  // catch { return NextResponse.json({ success: false, error: 'Invalid JSON' }, { status: 400, headers: securityHeaders });}

  const ip = request.headers['x-forwarded-for']?.split(',')[0]?.trim() || request.headers['x-real-ip'] || request.socket?.remoteAddress || '';
  const { allowed, retryAfter } = await applyRateLimit({ key: ip, scope: 'getShop' });
  if (!allowed) 
    return NextResponse.json({ error: 'Too many requests. Please try again later.' }, {status: 429, headers: { 'Retry-After': retryAfter.toString(),}});
  
  // const { authenticated, error, data } = await getAuthenticatedUser(request);
  // if(!authenticated) 
  //       return NextResponse.json({ error: "...not authorized" }, { status: 401, headers: securityHeaders });

  // Validate content type
  const contentType = request.headers.get('content-type') || '';
  if (!contentType.includes('multipart/form-data'))
      return NextResponse.json({ error: 'Invalid content type. Use multipart/form-data' }, { status: 400 });

  try {
    // Parse form data
    const formData = await request.formData();
    const file = formData.get('file');
    const shopId = formData.get('shop');
    
    // Validate files
  if ( !file || !(file instanceof Blob) || file.size === 0 || !file.type.startsWith('image/'))       
      return NextResponse.json( { error: 'A valid image file is required' }, { status: 400 } );
    // Add shopId validation:
    
    if (!shopId) 
        return NextResponse.json({ error: 'Shop ID is required' }, { status: 400 });

    // if (typeof shopId !== 'string' || shopId.length > 64 || !/^[a-zA-Z0-9_-]+$/.test(shopId))
    //   return NextResponse.json({ error: 'Invalid Shop ID format' }, { status: 400 });

    const auth_db = await authDbConnect();
    const Shop = shopModel(auth_db);
    const shop = await Shop.findOne({ referenceId: shopId }).lean();
    if (!shop)
        return NextResponse.json( { error: 'Shop not found' }, { status: 404 } );

    try {
      // Authorize and get upload URL
      await authorizeB2();
      const { data: uploadData } = await b2.getUploadUrl({ bucketId: process.env.B2_BUCKET_ID });

      // Upload file
      const fileExtension = file.name.split('.').pop()?.toLowerCase() || '';
      if (!ALLOWED_MIME_TYPES.includes(file.type) || !ALLOWED_EXTENSIONS.includes(fileExtension)) 
          return NextResponse.json({ error: `Unsupported file type: ${file.name}` }, { status: 400 });

      if (file.size > MAX_FILE_SIZE) 
          return NextResponse.json({ error: `File exceeds limit of ${MAX_FILE_SIZE / 1024 / 1024}MB` }, { status: 400 });
    
      const uuid = crypto.randomUUID();
      const baseFileName = `${uuid}`.replace(/[^\w.-]/g, '_');
      const fileName = `${shopId}/category/${baseFileName}`
      const arrayBuffer = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      const uploadResponse = await b2.uploadFile({       uploadUrl: uploadData.uploadUrl,
                                                   uploadAuthToken: uploadData.authorizationToken,
                                                          fileName,
                                                              data: buffer,
                                                              mime: file.type,
                                                     contentLength: buffer.length                      });
      console.log(uploadResponse)
      // const downloadUrl = `${process.env.B2_DOWNLOAD_URL_PREFIX || 'https://f002.backblazeb2.com/file/' + process.env.B2_BUCKET_NAME}/${fileName}`;

      // const baseUrl = process.env.B2_DOWNLOAD_URL_PREFIX || `https://f002.backblazeb2.com/file/${process.env.B2_BUCKET_NAME}`;
      // const downloadUrl = `${baseUrl.replace(/\/+$/, '')}/${fileName}`;

      const { data: authTokenData } = await b2.getDownloadAuthorization({
        bucketId: process.env.B2_BUCKET_ID,
        fileNamePrefix: fileName,
        validDurationInSeconds: 604800, // 1 hour
      });
      const downloadUrl = `https://f002.backblazeb2.com/file/${process.env.B2_BUCKET_NAME}/${fileName}?Authorization=${authTokenData.authorizationToken}`;


      return NextResponse.json({ message: 'Image uploaded successfully',
                                  result: { originalName: file.name,
                                                  fileId: uploadResponse.data.fileId,
                                                fileName: uploadResponse.data.fileName,
                                             downloadUrl,
                                                    size: file.size,
                                                  status: 'success'                         }
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


// const config = { api: {  bodyParser: false,
//                           sizeLimit: '20mb'  } };

// const MAX_CONCURRENT_UPLOADS = 3;
// const uploadQueue = [];
// const MAX_TOTAL_SIZE = 5 * 1024 * 1024; // 5MB total for all files
// Process individual file upload
// async function uploadSingleFile({file, uploadData, folder}) {
//   const fileExtension = file.name.split('.').pop()?.toLowerCase() || '';
  
//   // Validate file
//   if (!ALLOWED_MIME_TYPES.includes(file.type) ||  !ALLOWED_EXTENSIONS.includes(fileExtension))
//     throw new Error(`Unsupported file type: ${file.name}`);
  
//   if (file.size > MAX_FILE_SIZE) 
//     throw new Error(`File ${file.name} exceeds ${MAX_FILE_SIZE / 1024 / 1024}MB limit`);  

//   // Sanitize filename
//   // const cleanName = file.name.replace(/[^a-zA-Z0-9_.-]/g, '_');
//   const uuid = crypto.randomUUID();
//   // const fileName = `uploads/${uuid}-${cleanName}`;
//   const fileName = `temp_${folder}/${uuid}`;

  
//   // Convert to buffer
//   const arrayBuffer = await file.arrayBuffer();
//   const buffer = Buffer.from(arrayBuffer);
  
//   // Upload to B2
//   const uploadResponse = await b2.uploadFile({
//     uploadUrl: uploadData.uploadUrl,
//     uploadAuthToken: uploadData.authorizationToken,
//     fileName,
//     data: buffer,
//     mime: file.type,
//     contentLength: buffer.length,
//   });

//   // Construct download URL
//   const downloadUrl = `${process.env.B2_DOWNLOAD_URL_PREFIX || 
//     'https://f002.backblazeb2.com/file/' + process.env.B2_BUCKET_NAME}/${fileName}`;

//   return {
//     originalName: file.name,
//     status: 'success',
//     fileId: uploadResponse.data.fileId,
//     fileName: uploadResponse.data.fileName,
//     downloadUrl,
//     size: file.size,
//   };
// }

// Process upload with concurrency control
// async function processWithConcurrency({files, uploadData, folder}) {
//   const results = [];
//   let totalSize = 0;

//   // Validate total size first
//   for (const file of files) 
//     totalSize += file.size;
  
//   if (totalSize > MAX_TOTAL_SIZE) 
//     throw new Error(`Total upload size exceeds ${MAX_TOTAL_SIZE / 1024 / 1024}MB limit`);

//   // Process files with concurrency control
//   const processFile = async (file) => {
//     try {
//       return await uploadSingleFile({file, uploadData, folder});
//     } catch (error) {
//       return {
//         originalName: file.name,
//         status: 'error',
//         error: error.message
//       };
//     }
//   };

//   // Create worker promises
//   const workers = Array(MAX_CONCURRENT_UPLOADS).fill(null).map(async (_, i) => {
//     while (uploadQueue.length > 0) {
//       const file = uploadQueue.shift();
//       const result = await processFile(file);
//       results.push(result);
//     }
//   });

//   // Add files to queue
//   uploadQueue.push(...files);
  
//   // Wait for all workers to finish
//   await Promise.all(workers);
  
//   return results;
// }




  // const  vendorId = request.headers.get('x-vendor-identifier');
  // const      host = request.headers.get('host'); 
  // const userAgent = request.headers.get('user-agent') || '';
  // if (!vendorId && !host) return NextResponse.json({ error: "Missing vendor identifier or host" },{ status: 400 });

  // const fingerprint = request.headers.get('x-fingerprint') || null;

  //   // Connect to auth database
  //   const auth_db = await authDbConnect();
  //   const ShopModel = shopModel(auth_db);
    
  //   // Get shop configuration
  //   const shop = await ShopModel.findOne({ $or: [ { vendorId }, { "domains": { $elemMatch: { domain: host } } }]})
  //                               .select("+_id "+
  //                                       "+dbInfo +dbInfo.uri +dbInfo.prefix "+
  //                                       "+maxSessionAllowed "+
  //                                       "+keys +keys.ACCESS_TOKEN_SECRET +keys.REFRESH_TOKEN_SECRET " +
  //                                       "+timeLimitations.ACCESS_TOKEN_EXPIRE_MINUTES +timeLimitations.REFRESH_TOKEN_EXPIRE_MINUTES" 
  //                                     ).lean();

  //   if (!shop) 
  //     return NextResponse.json( { error: "Authentication failed" }, { status: 400 } )