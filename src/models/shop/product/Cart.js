import mongoose from "mongoose";

const itemPriceSchema = new mongoose.Schema({
          basePrice: { type: Number, required: [true, 'Original price is required'], min: [0, 'Price cannot be negative'] },
    discountedPrice: { type: Number, min: [0, 'Discounted price cannot be negative'], },
           currency: { type: String, enum: ["USD", "BDT"]} 
}, { _id: false });

const cartItemSchema = new mongoose.Schema({
    sessionId: { type: String, required: false },
    productId: { type: mongoose.Schema.Types.ObjectId },
    variantId: { type: mongoose.Schema.Types.ObjectId },
        title: {type: String, required: true},
     quantity: { type: Number, default: 1, min: [1, 'Quantity must be at least 1'], validate: { validator: Number.isInteger, message: 'Quantity must be an integer' } }, 
        price: { type: itemPriceSchema },
     subtotal: { type: Number, default: 0}, 
     added_at: { type: Date, default: Date.now }
}, { _id: false });

const metaInfoSchema = new mongoose.Schema({
    appliedAt: { type: Date, default: Date.now, default: undefined },
    appliedBy: {  userId: mongoose.Schema.Types.ObjectId, sessionId: String, default: undefined },
    originalAmount: { type: Number, default: undefined },
    minOrderValue: { type: Number, default: undefined },
    maxDiscount: { type: Number, default: undefined },
    discountRate: { type: Number, default: undefined },
    discountTierLevel: { type: String, default: undefined},
    stackPosition: { type: Number, default: undefined },   
    redeemMethod: { type: String, enum: ['link', 'automatic', 'code'], default: undefined },
    currency: { type: String, enum: ['USD', 'EUR', 'GBP', 'JPY', 'INR', 'BDT'], default: undefined }
}, { _id: false });


const discountDetailSchema = new mongoose.Schema({
        couponId: { type: String, ref: 'Coupon', required: true }, // Match with coupon.couponId (cuid), not Mongo _id
            code: { type: String, required: true },     // Redundant but useful for snapshot
            type: { type: String, enum: [ 'percentage_off', 'fixed_amount', 'free_shipping', 'bogo', 'free_gift', 'tiered', 'flash_sale', 'first_purchase', 'next_purchase', 'cashback', 'preorder_discount', 'bundle' ], required: true },
          amount: { type: Number, required: true }, // Actual discount applied (after calculation)
       appliedTo: {          type: { type: String, enum: ['products', 'categories', 'cart'], required: true },
                         products: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Product' }], 
                       categories: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Category' }] },
                             bogo: { qualifyingItems: [{ productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' }, 
                                                          quantity: Number }],
                                       rewardedItems: [{ productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
                                                          quantity: Number }]  },
  validationHash: { type: String, required: true },
  verifiedAt: Date,
  metadata: { type: metaInfoSchema, default: undefined }
}, { _id: false });




const cartSchema = new mongoose.Schema({
           user: { type: mongoose.Schema.Types.ObjectId, ref: 'ShopUser' },
          items: [cartItemSchema],
      sessionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Session' },
        isGuest: { type: Boolean, default: true },
    fingerprint: { type: String, select: false, required: true },  
         totals: {   subtotal: { type: Number, default:0 },
                     discount: { type: Number, default:0 },
                          tax: { type: Number, default:0 },
               deliveryCharge: { type: Number, default:0 },
            discountBreakdown: { type: [discountDetailSchema], default: undefined },
                   grandTotal: { type: Number, default:0 },         },
        
       currency: { type: String, enum: ["USD", "BDT"], required: true },
    lastUpdated: { type: Date, default: Date.now }
}, 
{ timestamps: true, collection: 'carts' });

export const cartModel = (db) => db.models.Cart || db.model('Cart', cartSchema);




// which data should I store to the cart ?