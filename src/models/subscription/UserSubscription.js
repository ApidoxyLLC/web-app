import mongoose from "mongoose";

const userSubscriptionSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  planId: { type: mongoose.Schema.Types.ObjectId, ref: "SubscriptionPlan" },
  startDate: Date,
  endDate: Date,
  status: { type: String, enum: ["active", "expired", "cancelled"], default: "active" },
  paymentId: String,
}, { timestamps: true, collection: 'user_subscriptions' });

export const UserSubscription=(db)=> db.models.UserSubscription ||
  db.model("UserSubscription", userSubscriptionSchema);
