import mongoose from "mongoose";

const cartItem = new mongoose.Schema({
    productId: { type: mongoose.Schema.Types.ObjectId },
    variantId: { type: mongoose.Schema.Types.ObjectId },
    name: {type: String, default: undefined},
    quantity: { type: Number, default: 0 }, 
    price: { type: Number, default: 0},
    subtotal: { type: Number, default: 0}, 
    added_at: { type: Date, default: Date.now },
    currency: { type: String, enum: ["USD", "BDT"]} 
}, { _id: false });

const couponSchema = new mongoose.Schema({
    couponId: { type: mongoose.Schema.Types.ObjectId },
    code: { type: String }, 
    discount:  {type: Number, default:0 }, 
    discount_type: { type: String, enum: ['percentage', 'fixed'], required: function () {
                                                                        return !!this.code; // only required if coupon exists
                                                                    } },
    validity: { type: Date },
    appliedAt: { type: Date },
}, { _id: false });

const cartSchema = new mongoose.Schema({
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'MartUser', required: [true, 'User reference is required'], index: true },
    martId: { type: mongoose.Schema.Types.ObjectId, ref: 'Mart', required: true },
    items:[cartItem],
    totals: {
        subtotal: {type: Number, default:0 },
        discount: {type: Number, default:0 },
        tax: {type: Number, default:0 },
        deliveryCharge: {type: Number, default:0 },
        grandTotal: {type: Number, default:0 },
    },
    coupons : [couponSchema],
    // sessionId: { type: String, required: false },
    timezone: { type: String, default: undefined },
    updatedAt: { type: Date },
    currency: {
        type: String,
        enum: ['USD', 'BDT'],
        required: true,
        default: 'BDT'
    },
}, {
  timestamps: true,
  collection: 'carts'
});


export const Cart = mongoose.models.Cart ||  mongoose.model("Cart", cartSchema, "carts")
export default Cart