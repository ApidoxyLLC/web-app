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
    title: {type: String, default: undefined},
    quantity: { type: Number, default: 0 }, 
    price: { type: itemPriceSchema },
    subtotal: { type: Number, default: 0}, 
    added_at: { type: Date, default: Date.now },
    currency: { type: String, enum: ["USD", "BDT"]} 
}, { _id: false });

const cartSchema = new mongoose.Schema({
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'ShopUser' },
    items:[cartItemSchema],
    totals: {   subtotal: {type: Number, default:0 },
                discount: {type: Number, default:0 },
                tax: {type: Number, default:0 },
                deliveryCharge: {type: Number, default:0 },
                grandTotal: {type: Number, default:0 },         },
    coupons : { type: mongoose.Schema.Types.ObjectId, ref: 'Coupon' },
}, {
  timestamps: true,
  collection: 'carts'
});


export const cartModel = (db) => db.models.Cart || db.model('Cart', cartSchema);