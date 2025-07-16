import { NextResponse } from 'next/server';
import vendorDbConnect from '@/lib/mongodb/vendorDbConnect';
import authDbConnect from '@/lib/mongodb/authDbConnect';
import { dbConnect } from '@/lib/mongodb/db';
import { vendorModel } from '@/models/vendor/Vendor';
import { categoryModel } from '@/models/shop/product/Category';
import slugify from 'slugify';
import { decrypt } from '@/lib/encryption/cryptoEncryption';
import getAuthenticatedUser from '../../auth/utils/getAuthenticatedUser';
import { applyRateLimit } from '@/lib/rateLimit/rateLimiter';
import config from '../../../../../../config';
import { userModel } from '@/models/auth/User';

const DICTIONARY_WORDS = ['pro', 'shop', 'store', 'mart', 'boutique', 'hub', 'zone', 'central', 'elite', 'premium'];

const securityHeaders = {
  'Strict-Transport-Security': 'max-age=63072000; includeSubDomains; preload',
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Content-Security-Policy': "default-src 'self'; frame-ancestors 'none'",
  'Permissions-Policy': 'geolocation=(), microphone=()',
  'X-XSS-Protection': '1; mode=block'
};


// Utility Functions
const createSlugFromTitle = (title) => slugify(title, {
  lower: true,
  strict: true,
  trim: true
});

const extractUniqueWords = (title, slug) => {
  const titleWords = new Set(slugify(title, { lower: true, strict: true }).split('-').filter(word => word.length > 2));
  const slugWords = new Set(slug.split('-'));
  return [...titleWords].filter(word => !slugWords.has(word));
};

const generateRecommendations = async (baseSlug, exclude, title, CategoryModel) => {
  const suggestions = new Set();
  const customWords = title ? extractUniqueWords(title, baseSlug) : [];

  // Generate variations (title-based, dictionary, and numbered)
  customWords.forEach(word => {
    [
      `${baseSlug}-${word}`,
      `${word}-${baseSlug}`,
      `${baseSlug}-${word.toLowerCase()}`
    ].forEach(variant => suggestions.add(variant));
  });

  DICTIONARY_WORDS.forEach(word => {
    if (suggestions.size >= config.categorySlugMaxSuggestion * 3) return;
    suggestions.add(`${baseSlug}-${word}`);
  });

  Array.from({ length: 3 }, (_, i) => `${baseSlug}-${i + 1}`)
    .forEach(s => suggestions.add(s));

  // Filter and check availability
  const uniqueSuggestions = [...suggestions]
    .filter(s => s !== baseSlug && !exclude.includes(s))
    .slice(0, config.categorySlugMaxSuggestion * 2); // Get extras for availability checking

  const existingSlugs = await CategoryModel.find(
    { slug: { $in: uniqueSuggestions }},
    { slug: 1, _id: 0 }
  ).lean();

  const takenSlugs = new Set(existingSlugs.map(s => s.slug));
  return uniqueSuggestions
    .filter(s => !takenSlugs.has(s))
    .slice(0, config.categorySlugMaxSuggestion);
};

export async function GET(request) {
  try {
      const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || request.headers.get('x-real-ip') || request.socket?.remoteAddress || '';
      const { allowed, retryAfter } = await applyRateLimit({ key: ip, scope: 'checkSlug' });
      if (!allowed) return NextResponse.json({ error: 'Too many requests. Please try again later.' }, {status: 429, headers: { 'Retry-After': retryAfter.toString(),}});

      const { authenticated, error, data } = await getAuthenticatedUser(request);
      if(!authenticated) 
           return NextResponse.json({ error: "...not authorized" }, { status: 401, headers: securityHeaders });

      /** 
       * fake Authentication for test purpose only 
       * *******************************************
       * *****REMOVE THIS BLOCK IN PRODUCTION***** *
       * *******************************************
       * *              ***
       * *              ***
       * *            *******
       * *             *****
       * *              *** 
       * *               *           
       * */

      // const authDb = await authDbConnect()
      // const User = userModel(authDb);
      // const user = await User.findOne({ referenceId: "cmcr5pq4r0000h4llwx91hmje" })
      //                        .select('referenceId _id name email phone role isEmailVerified')
      // const data = { sessionId: "686f81d0f3fc7099705e44d7",
      //          userReferenceId: user.referenceId,
      //                   userId: user._id,
      //                     name: user.name,
      //                    email: user.email,
      //                    phone: user.phone,
      //                     role: user.role,
      //               isVerified: user.isEmailVerified || user.isPhoneVerified,
      //               }
      
      /** 
       * fake Authentication for test purpose only 
       * *******************************************
       * *********FAKE AUTHENTICATION END********* *
       * *******************************************
      **/


    // Parse and validate parameters
      const { searchParams } = new URL(request.url);
      const params = { inputSlug: searchParams.get('slug'),
                            shop: searchParams.get('shop'),
                           title: searchParams.get('title'),
                         exclude: (searchParams.get('exclude') || '').split(',').map(s => s.trim()).filter(Boolean) };

    if ((!params.title && !params.inputSlug) || !params.shop) 
      return NextResponse.json({ error: 'Missing required parameters' }, { status: 400, headers: securityHeaders });

    if (params.inputSlug && !/^[a-z0-9-]+$/.test(params.inputSlug)) 
      return NextResponse.json({ error: 'Slug contains invalid characters' },{ status: 400, headers: securityHeaders });
    
    const baseSlug = params.inputSlug || createSlugFromTitle(params.title);
    const vendor_db = await vendorDbConnect();
    const vendor = await vendorModel(vendor_db).findOne({ referenceId: params.shop })
                                         .select("+_id +ownerId +dbInfo")
                                         .lean()
    // Validate access
    if ( !vendor || vendor.ownerId.toString() != data.userId.toString()) 
      return NextResponse.json( { success: false, error: "Not authorized" }, { status: 401, headers: securityHeaders });

    // Vendor DB connection
    // const DB_URI_ENCRYPTION_KEY = process.env.VENDOR_DB_URI_ENCRYPTION_KEY;
    // if (!DB_URI_ENCRYPTION_KEY) 
    //   return NextResponse.json({ success: false, error: "Server configuration error" }, { status: 500, headers: securityHeaders });

    if (!vendor.dbInfo?.dbUri || !vendor.dbInfo?.dbName) {
      return NextResponse.json({ success: false, error: "Vendor DB info missing" }, { status: 500, headers: securityHeaders });
    }
    const dbUri = await decrypt({ cipherText: vendor.dbInfo.dbUri,
                                     options: { secret: config.vendorDbUriEncryptionKey } });

    const shop_db = await dbConnect({ dbKey: vendor.dbInfo.dbName, dbUri });
    const CategoryModel = categoryModel(shop_db)

    // Check availability and get recommendations
    const [isTaken, recommendations] = await Promise.all([ CategoryModel.exists({ slug: baseSlug }),
                                                            generateRecommendations(baseSlug, params.exclude, params.title, CategoryModel)  ]);

    // Build response
    const response = NextResponse.json({
      requestedSlug: baseSlug,
      isAvailable: !isTaken,
      recommendations,
      ...(!isTaken && { alternativeSlugs: recommendations.slice(0, 3) }) // Show top 3 as alternatives
    });

    // Apply security headers
    Object.entries(securityHeaders).forEach(([key, value]) => { response.headers.set(key, value) });
    return response;

  } catch (error) {
    console.error('Slug check error:', error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500, headers: securityHeaders }
    );
  }
}


// const limiter = rateLimit({
//   windowMs: RATE_LIMIT_WINDOW_MS,
//   max: RATE_LIMIT_MAX_REQUESTS,
//   keyGenerator: (req) => {
//     const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 
//                req.headers.get('x-real-ip') || 'unknown_ip';
//     const fingerprint = req.headers.get('x-fingerprint') || '';
//     return `${ip}:${fingerprint}`;
//   }
// });