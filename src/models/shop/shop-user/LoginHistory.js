import mongoose from 'mongoose';

const shopLoginHistorySchema = new mongoose.Schema({
    // projectId: { type: mongoose.Schema.Types.ObjectId, ref: 'UserProjects' },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    sessionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Session'},
    provider: { type: String, required: true,
                enum: ['local-phone', 'local-email', 'google', 'facebook', 'apple'], },
    attempt: { type: String, required: true,
        enum: ['success', 'failed', '2fa_required', 'blocked'] },
    failureReason: { type: String, default: null,
        enum: ['wrong_password', 'expired_token', 'ip_blocked', null] },
    ip: { type: String, required: false },
    userAgent: { type: String, required: false },
    device: {
        fingerprint: String,
        type: { type: String, enum: ['desktop', 'mobile', 'tablet', 'unknown'] },
        trusted: { type: Boolean, default: false } // Known devices
    },
    status: {  // Track success/failure
        type: String,
        enum: ['success', 'failed', 'suspicious'],
        default: 'success'
    },
    createdAt: { type: Date, default: Date.now },
}, {
  collection: 'shop_login_histories'
});

export const ShopLoginHistory = mongoose.models.ShopLoginHistory || mongoose.model("ShopLoginHistory", shopLoginHistorySchema, 'shop_login_histories');
export default ShopLoginHistory;