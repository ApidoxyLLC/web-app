import mongoose from "mongoose";
import { planSnapshotSchema } from "./Plan";


const cancellationSchema = new mongoose.Schema({
            canceledBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
            canceledAt: Date,
    cancellationReason: String,
}, { _id: false});

const trialSchema = new mongoose.Schema({
  startAt: { type: Date },
    endAt: { type: Date },
}, { _id: false  });

const subscriptionCouponHistorySchema = new Schema({
      couponCode: { type: String, required: true, index: true, ref: 'SubscriptionCoupon' },
          userId: {  type: mongoose.Schema.Types.ObjectId, required: true, ref: 'User' },
          usedAt: {  type: Date,  default: Date.now }, 
         orderId: {  type: Schema.Types.ObjectId, ref: 'Order',  default: nul },
  discountAmount: { type: Number, required: true }
}, {
  timestamps: true,
  collection: 'subscription_coupon_histories',
});
export const SubscriptionCouponHistoryModel = (db) =>  db.models.SubscriptionCouponHistory || db.model('SubscriptionCouponHistory', subscriptionCouponHistorySchema);


const subscriptionCouponSchema = new Schema({
        code: { type: String, required: true, unique: true },
    discount: { type: Number, required: true, min: 0 },
        type: { type: String, enum: ['percentage_off', 'fixed_amount' ], required: true },
  validUntil: { type: Date, required: true },
     maxUses: { type: Number, default: 1 },
   usedCount: { type: Number, default: 0 }
}, {
  timestamps: true,
  collection: 'subscription_coupons',
});
export const subscriptionCouponModel = (db) =>  db.models.SubscriptionCoupon || db.model('SubscriptionCoupon', subscriptionCouponSchema);


const subscriptionSchema = new mongoose.Schema({
            userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
            planId: { type: mongoose.Schema.Types.ObjectId, ref: 'SubscriptionPlan', required: true },
      // planSnapshot: { type: planSnapshotSchema },
      planSnapshot: { type: mongoose.Schema.Types.Mixed },
         startDate: { type: Date, default: Date.now },
           endDate: { type: Date, default: undefined },
         isDefault: { type: Boolean, default: false }, 
             trial: { type: trialSchema, default: undefined },
            status: { type: String, enum: ['active', 'free-trial', 'past_due', 'canceled', 'paused', 'expired', 'unpaid', 'user-default'], default: 'user-default' },
      billingCycle: { type: String, enum: ["monthly", "quarterly", "yearly", "custom"], default: 'monthly' },
         autoRenew: { type: Boolean, default: false },
       renewalDate: { type: Date, default: null },
          currency: { type: String, default: 'BDT', enum: ['BDT', 'USD', 'EUR', 'GBP', 'INR', 'JPY' ] },
            amount: { type: Number, default: 0, min: 0 },
          invoices: { type: [String], ref: 'Invoice', default: [] },
         discounts: { type: [String], ref: 'Discount', default: [] },
   paymentMethodId: { type: String, default: null },
    paymentHistory: { type: [mongoose.Schema.Types.ObjectId],  ref: 'Payment', default: []},
      cancellation: { type: cancellationSchema, default: undefined },
         isDeleted: { type: Boolean, default: false },
         deletedAt: { type: Date, default: undefined },
        // ipAddress: String,
        // userAgent: String,
        // metadata: { type: mongoose.Schema.Types.Mixed, default: undefined }
}, {
  timestamps: true,
  collection: 'subscriptions',
});

export const subscriptionModel = (db) =>  db.models.Subscription || db.model('Subscription', subscriptionSchema);