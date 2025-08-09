import mongoose from "mongoose";

const subscriptionServicesSchema = new mongoose.Schema({
    website: {
        subdomains: { type: Number, required: true },
        customDomains: { type: Number, required: true }
    },
    androidBuilds: { type: Number, required: true },
    paymentGateways: { type: Number, required: true },
    deliveryGateways: { type: Number, required: true },
    smsGateways: { type: Number, required: true },
    userAccess: { type: Number, required: true },
    pushNotifications: { type: Number, required: true },
    products: { type: Number, required: true }
}, { _id: false });

const subscriptionValiditySchema = new mongoose.Schema({
    days: { type: Number, required: false },
    from: { type: Date, required: true, default: Date.now },
    until: { type: Date, required: false }
}, { _id: false });

const subscriptionSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    shopId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Shop',
        required: true
    },
    planName: { type: String, required: true },
    planSlug: { type: String, required: true },
    price: { type: Number, required: true },
    billingCycle: {
        type: String,
        enum: ['monthly', 'yearly'],
        required: false
    },
    validity: { type: subscriptionValiditySchema, required: false },
    services: { type: subscriptionServicesSchema, required: true },
    priority: { type: Number, required: true },
    paymentStatus: {
        type: String,
        enum: ['pending', 'paid', 'failed', 'refunded'],
        required: false
    },
    isActive: { type: Boolean, default: true },
    // isTrial: { type: Boolean, default: false },
    // renewsAutomatically: { type: Boolean, default: false },
    // cancelledAt: { type: Date },
    paymentGateway: { type: String, required: false },
    transactionId: { type: String, required: false },
    planSnapshot: { type: mongoose.Schema.Types.Mixed },

}, {
    timestamps: true,
    collection: 'subscriptions'
});

export const subscriptionModel = (db) =>
    db.models.Subscription || db.model('Subscription', subscriptionSchema);