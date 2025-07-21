import mongoose from 'mongoose';
import { inventorySchema } from './Inventory';
import cuid from '@bugsnag/cuid';

const discountSchema = new mongoose.Schema({
   type: { type: String, enum: ['fixed', 'percentage'], default: undefined },
  value: { type: Number, min: 0, default: undefined }
}, { _id: false });

const priceSchema = new mongoose.Schema({
   currency: { type: String, enum: ['BDT', 'USD', 'EUR', 'GBP'], default: undefined },
       base: { type: Number, required: true, min: 0, default: undefined },
  compareAt: { type: Number, min: 0, default: undefined },
       cost: { type: Number, min: 0, default: undefined },
   discount: { type: discountSchema, default: undefined },
   minPrice: { type: Number, min: 0, default: undefined },
   maxPrice: { type: Number, min: 0, default: undefined },
}, { _id: false });

const attributeSchema = new mongoose.Schema({
     name: { type: String, required: true },
    value: { type: String, required: true }
}, { _id: false });

// Improved variant schema
const variantSchema = new mongoose.Schema({
         variantId: { type: String, default: () => cuid(), unique: true },
             title: { type: String, required: true }, 
           options: { type: [attributeSchema], default: undefined },
             price: { type: priceSchema, default: undefined },
       priceVaries: { type: Boolean, default: undefined },
            weight: Number,
               sku: { type: String, sparse: true },
           barcode: String,
       isAvailable: { type: Boolean, default: undefined },
  requiresShipping: { type: Boolean, default: undefined  },
           taxable: { type: Boolean, default: true },
         inventory: { type: inventorySchema }, 
            images: [{ type: String }],
          position: Number,
}, { _id: true });

const detailSchema = new mongoose.Schema({
             material: String, 
                  fit: String,
         fabricWeight: String,
             neckLine: String,
               madeIn: String,
           dimensions: String, 
     careInstructions: String                   
}, { _id: false });

const imageSchema = new mongoose.Schema({
                 id: { type: Number, default: 0 },
                url: { type: String, required: true },
                alt: String,
           position: Number
}, { _id: false });

const mediaSchema = new mongoose.Schema({
       type: { type: String,  enum: ['image', 'video', 'document'], required: true },
        url: { type: String, required: true },
      about: String,
}, { _id: false });

const shippingSchema = new mongoose.Schema({
          weight: Number,
      dimensions: { length: Number, width: Number, height: Number },
    freeShipping: { type: Boolean, default: false },
   shippingClass: String
}, { _id: false });

// Digital assets schema
const digitalAssetSchema = new mongoose.Schema({
         name: { type: String, required: true },
          url: { type: String, required: true },
     mimeType: String,
  accessLimit: Number,
       expiry: Date
}, { _id: false });

const productSchema = new mongoose.Schema({
         //   productId: { type: String, default: () => cuid(), unique: true },
                slug: { type: String, required: true, unique: true },
               title: { type: String, required: true, trim: true },
         description: String, 
                tags: [{ type: String }],
             gallery: { type:[imageSchema] },
  otherMediaContents: { type:[mediaSchema] },
               price: { type: priceSchema  },
           thumbnail: { type: String, required: true },
             options: { type: [String], enum:["size", "color", "material"] },
             details: { type: detailSchema, default: undefined },
          categories: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Category'}],
         hasVariants: { type: Boolean, default: false },
         isAvailable: { type: Boolean, default: undefined },
            warranty: { type: { duration: Number, termsNdConditions: String },  default: undefined },
              status: { type: String, default: 'draft',  enum: ['active', 'draft', 'archived', 'discontinued'] },
      approvalStatus: { type: String, default: 'pending', enum: ['pending', 'approved', 'rejected'] },
       productFormat: { type: String, enum: ['physical', 'digital'],  default: 'physical' },
       digitalAssets: { type: [digitalAssetSchema], default: undefined },
               brand: { type: mongoose.Schema.Types.ObjectId, ref: 'Brand' },
            shipping: { type: shippingSchema, default: undefined},
             ratings: { average: { type: Number, default: 0, min: 0, max: 5 },
                          count: { type: Number, default: 0 }  },
          isFeatured: { type: Boolean, default: false },
           createdAt: { type: Date, default: Date.now },
            variants: { type: [variantSchema] },
           inventory: { type: inventorySchema, default: undefined },
             reviews: { type: [mongoose.Schema.Types.ObjectId], ref: 'Review', default: [] },
          productUrl: { type: String, default: undefined },
         publishedAt: { type: Date, default: undefined },
        reservations: { type: [mongoose.Schema.Types.ObjectId], default: undefined },
            metadata: {         title: String,
                          description: String,
                         canonicalUrl: String  },
}, 
{ timestamps: true, collection: 'products' });

export const productModel = (db) => db.models.Product || db.model('Product', productSchema);