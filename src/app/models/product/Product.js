import mongoose from 'mongoose';
import { inventorySchema } from './Inventory';
import { reviewSchema } from './Review';

const priceSchema = new mongoose.Schema({
  currency: { type: String, enum: ['BDT', 'USD', 'EUR', 'GBP'], default: 'BDT' },
  basePrice: { type: Number, required: true, min: 0 },
  salePrice: { type: Number, min: 0 },
  costPrice: { type: Number, min: 0 },
  discount: {   enable: { type:Boolean, default:false },
                value: {type: Number, default: 0 },                
                type:{ type: String, enum: ['fixed', 'percentage', null]} },
//   finalAmount: { type: Number, required: true, min: 0 },
  taxInfo: String
}, { _id: false });

// Add virtual for final price calculation
// priceSchema.virtual('finalPrice').get(function() {
//   let price = this.salePrice || this.basePrice;
  
//   if (this.discount?.type === 'percentage') {
//     price = price * (1 - (this.discount.value / 100));
//   } else if (this.discount?.type === 'fixed') {
//     price = Math.max(0, price - this.discount.value);
//   }
  
//   if (!this.tax.inclusive && this.tax.rate > 0) {
//     price = price * (1 + (this.tax.rate / 100));
//   }
  
//   return parseFloat(price.toFixed(2));
// });

const variantSchema = new mongoose.Schema({
    variantType: {type: [String], enum: ['color','size', 'weight', 'material']},
    name: { type: String, required: true },           // e.g., 'Color'
    attributes: { 
        color: String, 
        size: String, 
        weight: String,
        material: String,
    weightUnit:{ type: String, enum:['kg', 'lbs'], required:false, default: undefined },
    dimensions: { length: Number, width: Number, height: Number }
  },
  images: [{ imageGalleryId: String }],  
  variantPrice: { type: priceSchema }
}, { _id: false });

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
    slug: { type: String, required: true, unique: true, lowercase: true, index: true },
    gallery: [imageGallery],
    thumbnail: { type: String, default:''},
    medias: { type:[String], required: true },
    price: priceSchema,
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