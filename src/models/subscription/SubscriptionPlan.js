import mongoose from "mongoose";

const maxLimitSchema = new mongoose.Schema({
         customDomains: { type: Number, default: 0 },
            subDomains: { type: Number, default: 1 },
                 shops: { type: Number, default: 1 },
                  apps: {
                      android: { type: Number, default: 1 },
                          web: { type: Number, default: 1 },
                          ios: { type: Number, default: 0 }
                        },
                builds: {
                      android: { type: Number, default: 1 },
                          web: { type: Number, default: 1 },
                          ios: { type: Number, default: 0 }
                      },
   paymentIntegrations: { type: Number, default: 1 },
  deliveryIntegrations: { type: Number, default: 1 },
           smsGateways: { type: Number, default: 1 },
  monthlyNotifications: { type: Number, default: 500 },
             storageMB: { type: Number, default: 500 },
      customerAccounts: { type: Number, default: 50 },
            staffUsers: { type: Number, default: 0 },
              products: { type: Number, default: 15 },
         monthlyOrders: { type: Number, default: 20 },
}, { _id: false });

const featuresSchema = new mongoose.Schema({
   analyticsDashboard: { type: Boolean, default: false },
  inventoryManagement: { type: Boolean, default: false },          
      customerSupport: { type: Boolean, default: false },
          socialLogin: { type: Boolean, default: false },
        // multiCurrency: { type: Boolean, default: false },
    // manualIntegration: { type: Boolean, default: false }
}, { _id: false });

const planHistorySchema = new mongoose.Schema({
           planId: { type: mongoose.Schema.Types.ObjectId, ref: 'Plan', required: true },
          version: { type: Number, required: true },
          changes: mongoose.Schema.Types.Mixed, // Track specific fields changed
           reason: { type: String, enum: ['price-change', 'feature-change', 'deprecation'] },
        changedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    effectiveFrom: Date,
   effectiveUntil: Date,
       archivedAt: Date
}, {  _id: false  });

const pricingSchema = new mongoose.Schema({
        monthly: { type: Number, default: 0 },
         yearly: { type: Number, default: 0 },
      quarterly: { type: Number, default: 0 },
  billingCycles: { type: [String], enum: ["not-applicable","monthly", "quarterly", "yearly", "custom"], default: ['monthly', 'yearly'] },
       currency: { type: String, default: 'BDT', enum: ['BDT', 'USD', 'GBP', 'EUR'] }
}, { _id: false });

const trialPeriodSchema = new mongoose.Schema({
  days: { type: Number, default: 0, min: 0, max: 30 },
  includedFeatures: { type: [String], default: [] }
}, { _id: false });

const basePlanSchema = new mongoose.Schema({
        title: { type: String, required: true, maxlength: 100, minlength: 3, match: /^[a-zA-Z0-9\s-]+$/  },
         slug: { type: String, unique: true, required: true, match: /^[a-z0-9-]+$/ },
  description: { type: String, required: true, maxlength: 500 },                    
         tier: { type: String, enum: ['free-trial', 'starter', 'growth', 'professional', 'enterprise'], default: 'starter',  validate: { validator: function(v) { return v !== 'free-trial' || this.trialPeriod?.days > 0; }, message: 'Free trial plans must have trial days > 0' } },
       prices: { type: pricingSchema, default:()=>({}), validate: { validator: function(prices) { return this.tier === 'free-trial' || prices.monthly > 0 || prices.yearly > 0 || prices.quarterly > 0; }, message: 'At least one pricing option required for paid plans'} },
       limits: { type: maxLimitSchema, default: ()=>({}) },
     features: { type: featuresSchema, default: ()=>({}) },
      version: { type: Number, default: 1, select: false },
  trialPeriod: { type: trialPeriodSchema, default: () => ({}) }
}, { _id: false });

export const planSnapshotSchema = new mongoose.Schema({
  ...basePlanSchema.obj,
  capturedAt: { type: Date, default: Date.now } 
}, { _id: false });

export const metadataSchema = new mongoose.Schema({
       displayOrder: { type: Number, default: 0 },
          isPopular: { type: Boolean, default: false },
      isRecommended: { type: Boolean, default: false },
          badgeText: { type: String, default: null }, // e.g., "Best Value", "Limited Offer"
  highlightFeatures: { type: [String], default: [] } // For marketing display
}, { _id: false });
      
const subscriptionPlanSchema = new mongoose.Schema({
  ...basePlanSchema.obj,
  isActive: { type: Boolean, default: true },
   history: { type: [planHistorySchema], default: [], select: false },
  metadata: { type: metadataSchema, default: undefined }
}, { timestamps: true, collection: 'subscription_plans' });
export const subscriptionPlanModel = (db) => db.models.SubscriptionPlan || db.model('SubscriptionPlan', subscriptionPlanSchema);