import mongoose from "mongoose";

const userSubscriptionHistorySchema = new mongoose.Schema({
            userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
            planId: { type: mongoose.Schema.Types.ObjectId, ref: 'SubscriptionPlan', required: true },
      planSnapshot: { type: String, required: true },
}, {
  timestamps: true,
  collection: 'user_subscription_histories',
});

export const userSubscriptionHistoryModel = (db) =>  db.models.UserSubscriptionHistory || db.model('UserSubscriptionHistory', userSubscriptionHistorySchema);