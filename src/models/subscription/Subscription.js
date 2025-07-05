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

const subscriptionSchema = new mongoose.Schema({
            userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
            planId: { type: mongoose.Schema.Types.ObjectId, ref: 'SubscriptionPlan', required: true },
      planSnapshot: { type: planSnapshotSchema },
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