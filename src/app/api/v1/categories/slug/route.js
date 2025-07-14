import { NextResponse } from 'next/server';
import mongoose from 'mongoose';
import authDbConnect from '@/lib/mongodb/authDbConnect';
import { shopModel } from '@/models/auth/Shop';
import { getToken } from 'next-auth/jwt';
import { userModel } from '@/models/auth/User';
import { categoryModel } from '@/models/shop/product/Category';
import slugify from 'slugify';
import { decrypt } from '@/lib/encryption/cryptoEncryption';
import { dbConnect } from '@/lib/mongodb/db';
import rateLimit from '@/lib/rateLimit';


const DICTIONARY_WORDS = ['pro', 'shop', 'store', 'mart', 'boutique', 'hub', 'zone', 'central', 'elite', 'premium'];
const MAX_SUGGESTIONS = 3;
const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000;
const RATE_LIMIT_MAX_REQUESTS = 100;

const securityHeaders = {
  'Strict-Transport-Security': 'max-age=63072000; includeSubDomains; preload',
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Content-Security-Policy': "default-src 'self'; frame-ancestors 'none'",
  'Permissions-Policy': 'geolocation=(), microphone=()',
  'X-XSS-Protection': '1; mode=block'
};

const limiter = rateLimit({
  windowMs: RATE_LIMIT_WINDOW_MS,
  max: RATE_LIMIT_MAX_REQUESTS,
  keyGenerator: (req) => {
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 
               req.headers.get('x-real-ip') || 'unknown_ip';
    const fingerprint = req.headers.get('x-fingerprint') || '';
    return `${ip}:${fingerprint}`;
  }
});

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
    if (suggestions.size >= MAX_SUGGESTIONS * 3) return;
    suggestions.add(`${baseSlug}-${word}`);
  });

  Array.from({ length: 3 }, (_, i) => `${baseSlug}-${i + 1}`)
    .forEach(s => suggestions.add(s));

  // Filter and check availability
  const uniqueSuggestions = [...suggestions]
    .filter(s => s !== baseSlug && !exclude.includes(s))
    .slice(0, MAX_SUGGESTIONS * 2); // Get extras for availability checking

  const existingSlugs = await CategoryModel.find(
    { slug: { $in: uniqueSuggestions }},
    { slug: 1, _id: 0 }
  ).lean();

  const takenSlugs = new Set(existingSlugs.map(s => s.slug));
  return uniqueSuggestions
    .filter(s => !takenSlugs.has(s))
    .slice(0, MAX_SUGGESTIONS);
};

export async function GET(request) {
  try {
    const rateLimitRes = await limiter(request);
    if (rateLimitRes) return rateLimitRes;

    // Validate token
    const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET });
    if (!token?.session || !mongoose.Types.ObjectId.isValid(token.session)) 
      return NextResponse.json({ success: false, error: "Not authorized" }, { status: 401, headers: securityHeaders });
    // const user_auth_session = await getServerSession(authOptions);
    
    // Parse and validate parameters
    const { searchParams } = new URL(request.url);
    const params = { inputSlug: searchParams.get('slug'),
                      vendorId: searchParams.get('vendor'),
                         title: searchParams.get('title'),
                       exclude: (searchParams.get('exclude') || '').split(',').map(s => s.trim()) };

    if ((!params.title && !params.inputSlug) || !params.vendorId) 
      return NextResponse.json({ error: 'Missing required parameters' }, { status: 400, headers: securityHeaders });

    if (params.inputSlug && !/^[a-z0-9-]+$/.test(params.inputSlug)) 
      return NextResponse.json({ error: 'Slug contains invalid characters' },{ status: 400, headers: securityHeaders });
    
    const baseSlug = params.inputSlug || createSlugFromTitle(params.title);

    // Database setup
    const auth_db = await authDbConnect();
    const [user, shop] = await Promise.all([ userModel(auth_db).findOne({   activeSessions: new mongoose.Types.ObjectId(token.session),
                                                                            isDeleted: false    })
                                                               .select('+_id +shops').lean(),

                                             shopModel(auth_db).findOne({ vendorId: params.vendorId })
                                                               .select("+_id +dbInfo.uri +dbInfo.prefix")
                                                               .lean() ]);

    // Validate access
    if (!user || !shop || !user.shops.some(id => id.equals(shop._id))) 
      return NextResponse.json( { success: false, error: "Not authorized" }, { status: 401, headers: securityHeaders });
    
    // Vendor DB connection
    const DB_URI_ENCRYPTION_KEY = process.env.VENDOR_DB_URI_ENCRYPTION_KEY;
    if (!DB_URI_ENCRYPTION_KEY) 
      return NextResponse.json({ success: false, error: "Server configuration error" }, { status: 500, headers: securityHeaders });

    const dbUri = await decrypt({ cipherText: shop.dbInfo.uri,
                                     options: { secret: DB_URI_ENCRYPTION_KEY } });

    const     vendor_db = await dbConnect({ dbKey: `${shop.dbInfo.prefix}${shop._id}`,  dbUri });
    const CategoryModel = categoryModel(vendor_db)

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