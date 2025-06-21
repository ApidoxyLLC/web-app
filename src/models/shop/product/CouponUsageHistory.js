import mongoose from "mongoose";

const couponUsageHistorySchema = new mongoose.Schema({
        couponId: { type: mongoose.Schema.Types.ObjectId, ref: 'Coupon', required: true },
      customerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
         orderId: { type: mongoose.Schema.Types.ObjectId, ref: 'Order' },
          usedAt: { type: Date, default: Date.now },
    usageContext: {       cartTotal: Number,
                    discountApplied: Number,
                     itemsPurchased: [{ productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
                                        quantity: Number }]         },
        // location: {      ip: String,
        //             country: String,
        //              device: String     }
}, {
  timestamps: true,
  collection: 'coupon_usage_histories'
});

export const couponUsageHistoryModel = (db) =>
  db.models.CouponUsageHistory || db.model('CouponUsageHistory', couponUsageHistorySchema);