import mongoose from "mongoose";

const limitSchema = new mongoose.Schema({
    shops: { type: Number, default: null },
    mobileApps: { type: Number, default: null },
    webApps: { type: Number, default: null },
    // duration: {type: Number, default: null },
    storageMb: { type: Number, default: null }, 
    users: {type: Number, default: null },
    products: {type: Number, default: null },
    ordersMonthly: {type: Number, default: null },
}, { _id: false });

const featuresSchema = new mongoose.Schema({
    analyticsDashboard: { type: Boolean, default: false },
    customDomain: { type: Boolean, default: false },
    inventoryManagement: { type: Boolean, default: false },
    multiCurrency: { type: Boolean, default: false },
    customerSupport: { type: Boolean, default: false },
    manualIntegration: { type: Boolean, default: false },
    socialLogin: { type: Boolean, default: false },
}, { _id: false });

const planHistorySchema = new mongoose.Schema({
  planId: { type: mongoose.Schema.Types.ObjectId, ref: 'Plan', required: true },
  version: { type: Number, required: true },
  changes: mongoose.Schema.Types.Mixed, // Track specific fields changed
  effectiveFrom: Date,
  effectiveUntil: Date,
  archivedAt: Date
}, { timestamps: true });

const planSchema = new mongoose.Schema({
    name: { type: String, required: true },
    description: { type: String, required: true },
    tier: { type: String, enum: ['free', 'starter', 'pro', 'enterprise'], default: 'free' },
    limits: { type: limitSchema, default: () => ({}) },
    features: { type: featuresSchema, default: () => ({}) },
    price: { type: Number, default: null },
    currency: { type: String, default: 'USD', enum: ['USD', 'EUR', 'GBP'] },
    billingCycle: { type: String, enum: ['monthly', 'yearly'], default: null  },
    isActive: { type: Boolean, default: true },
    // type: { type: [String], default: ['monthly'], enum: ['monthly', 'yearly', 'request', 'storege', 'user', 'product', 'order'] },
    duration: { type: String, default: null },
    version: { type: Number, default: 1 }, // Increment on changes
    // parentPlan: { type: mongoose.Schema.Types.ObjectId, ref: 'Plan' }, // For forks
    metadata: mongoose.Schema.Types.Mixed,
    isDeleted: { type: Boolean, default: false }
}, {
  timestamps: true,
  collection: 'plans'
});

export const PlanModel = (db) => db.models.Plan || db.model('Plan', planSchema);
export const Plan = mongoose.models.Plan ||  mongoose.model("Plan", planSchema, "plan")
export default Plan;

// stater advanced premium 