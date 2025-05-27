import mongoose from "mongoose";

const auditLogSchema = new mongoose.Schema({
    timestamp: { type: Date, default: Date.now } ,
    action: String,
    performedBy: String,
    details: String
}, { _id: false });

const subscriptionSchema = new mongoose.Schema({


    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    planId: { type: mongoose.Schema.Types.ObjectId, ref: 'Plan', required: true },
    planSnapshot: { name: String,
                    price: Number,
                    features: [String],
                    billingCycle: String
                },
    startDate: { type: Date, default: Date.now },
    endDate: { type: Date },
    trialStartAt: Date,
    trialEndAt: Date,
    status: { type: String, enum: ['active', 'trialing', 'past_due', 'canceled', 'paused'], default: 'trialing' },
    billingCycle: { type: String, enum: ['monthly', 'yearly', 'none'], default:'monthly', required: true },
    
    
    autoRenew: { type: Boolean, default: false },
    renewalDate: { type: Date, default: null },
    currency: { type: String, default: 'USD',  enum: ['USD', 'EUR', 'GBP', 'INR', 'JPY']},
    amount: { type: Number },
    invoices: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Invoice' }],
    
    discounts: [{ type: mongoose.Schema.Types.ObjectId, 
                    ref: 'Discount'
                }],
    paymentMethodId: { type: String, required: function() { return this.status !== 'canceled'; }},
    failedPaymentAttempts: { type: Number, default: 0 },
    paymentHistory: [{ type: mongoose.Schema.Types.ObjectId, 
                    // ref: 'Payment' 
                }],
    lastPaymentFailure: {   timestamp: Date, errorCode: String, message: String },                
    
    gracePeriodEnd: Date,
    canceledBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    canceledAt: { type: Date, default: null},
    cancellationReason: { type: String, default: null},
    auditLog: { type: [auditLogSchema], required: false, default: []},

    // soft delete
    isDeleted: { type: Boolean, default: false },
    deletedAt: { type: Date, default: null },

    
    dataProcessingConsent: { accepted: Boolean, acceptedAt: Date },
    // ipAddress: String, 
    // userAgent: String,
    metadata: { type: mongoose.Schema.Types.Mixed, default: {} }
}, {
  timestamps: true,
  collection: 'subscriptions'
});

export const SubscriptionModel = (db) => db.models.Subscription || db.model('Subscription', subscriptionSchema);
export const Subscription = mongoose.models.Subscription ||  mongoose.model("Subscription", subscriptionSchema, "subscriptions")
export default Subscription;