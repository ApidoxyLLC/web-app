import mongoose from 'mongoose';
import { inventorySchema } from './Inventory';
import { reviewSchema } from './Review';

const priceSchema = new mongoose.Schema({
  currency: { type: String, enum: ['BDT', 'USD', 'EUR', 'GBP'], default: 'BDT' },
  price: { type: Number, required: true, min: 0 },
  compareAtPrice: { type: Number, required: true, min: 0 },
  minPrice: { type: Number, required: true, min: 0 },
  maxPrice: { type: Number, required: true, min: 0 },

//   salePrice: { type: Number, min: 0 },
  costPrice: { type: Number, min: 0 },
  discount: {   enable: { type:Boolean, default:false },
                value: {type: Number, default: 0 },                
                type:{ type: String, enum: ['fixed', 'percentage', null]} },
  taxInfo: String
}, { _id: false });

const variantSchema = new mongoose.Schema({
    title: {type: String, default:undefined},
    options: {type: [String], enum: ['small','black', 'cotton']},

    option1: {type: String, default: undefined },
    opiton2: {type: String, default: undefined },
    option3: {type: String, default: undefined },
    price:  {type: Number, default: undefined},
    weight: {type: Number, default: undefined},
    compareAtPrice: { type: Number, required: true, min: 0 },
    inventoryManagement: {type: String, default: undefined },
    isAvailable:{type: Boolean, default: undefined },
    sku: {type: String, default: undefined },
    requireShipping: {type: Boolean, default: undefined },
    taxable: {type: Boolean, default: undefined },
    barcode: { type: String, unique: true, sparse: true },
  images: [{ imageGalleryId: String }],  
  variantPrice: { type: priceSchema }
}, { _id: true });

const imageGallery = new mongoose.Schema({
    id: { type: Number, default: 0 },
    url: { type: String, required: true },
    altText: String,
}, { _id: false });

const productSchema = new mongoose.Schema({
    title: { type: String, required: true},
    description: {type: String, default: undefined },
    tags: [String],
    keywords: [String],

    // handle 
    slug: { type: String, required: true, unique: true, lowercase: true, index: true },
    gallery: [imageGallery],
    thumbnail: { type: String, default:''},
    medias: { type:[String], required: true },
    price: priceSchema,
    details:{
        material:{ type: String, default: undefined },
        fit: { type: String, default: undefined },
        febricWeight:{ type: String, default: undefined },
        neckLine: { type: String, default: undefined },
        careInstruction: { type: String, default: undefined },
        madeIn: { type: String, default: undefined },
    },

    categories: { type:[String], default:[] },    
    barcode: { type: String, unique: true, sparse: true },
    hasVariants: { type: Boolean, default: false },
    warranty: { period: {type:String, default:0},
                terms: String },
    sku: { type: String, unique: true, index: true },
    status: { type: String, default: 'draft', 
        enum: ['active', 'inactive', 'draft', 'unpubilshed', 'archived', 'discontinued'] },
    approvalStatus: { type: String, default: 'pending',
        enum: ['pending', 'approved', 'rejected', 'flagged'],},        
    productType:{ type: String, enum: ['physical', 'digital']},
    digitalAssets: [{   name: String,
                        url: String,
                        fileSize: Number,
                        fileType: String,
                        accessCount: { type: Number, default: 0 },
                        downloadLimit: Number,
                        accessExpiry: Number // days
                    }],
    brand: { type: String, default: 'generic' },
    shipping: {
        weight: { type: Number, min: 0 }, // in grams
        dimensions: {
        length: { type: Number, min: 0 }, // in cm
        width: { type: Number, min: 0 },
        height: { type: Number, min: 0 }
        },
        isFreeShipping: { type: Boolean, default: false },
        requiresShipping: { type: Boolean, default: true },
        shippingClass: String, // e.g., 'fragile', 'oversized'
        restrictions: {     countries: [String], // ISO country codes
                            zipCodes: [String] }
    },
    promotions: [{
        type: { type: String, enum: ['discount', 'bundle', 'flash-sale'] },
        name: String,
        startDate: Date,
        endDate: Date
    }],
    vendor: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    ratings: {  average: { type: Number, min: 0, max: 5, default: 0 },
                count: { type: Number, default: 0 } },
    reviewsCount: { type: Number, default: 0 },
    delivery: {
        availablePartner: [{ type: mongoose.Schema.Types.ObjectId, ref: 'DeliveryPartner' }],
        estimatedDays: { type: Number, default: 5 }
    },
    isFeatured: { type: Boolean, default: false },
    isBestSeller: { type: Boolean, default: false },
    isNewArrival: { type: Boolean, default: false },

    publishedAt: {type: Date, default: null},
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    variants: [variantSchema],
    inventory: inventorySchema,
    reviews: [reviewSchema]
}, {
    timestamps: true,
    collection: 'products'
});

export const Product = mongoose.models.Product || mongoose.model("Product", productSchema, 'products');
export default Product;