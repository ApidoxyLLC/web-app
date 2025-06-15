import mongoose from 'mongoose';
import { encrypt } from '../../utils/encryption';

const shopSessionSchema = new mongoose.Schema({
    fingerprint: { type: String, select: false, required: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'users', required: true },
    provider: { type: String, enum: ['local-phone', 'local-email', 'google', 'facebook', 'apple'], required: true},
    accessTokenId: { type: String, select: false, required: true },
    refreshTokenId: { type: String, select: false, required: true },
    // accessToken: { type: String, select: false, required: true },
    accessTokenExpiry: { type: Date, required: true },
    refreshTokenExpiry: { type: Date, required: true, index: { expires: '0s' } },
    // refreshToken: { type: String, select: false, required: true },
    ip: { type: String, required: false },
    userAgent: { type: String, required: false },
    timezone: { type: String, required: false },
    createdAt: { type: Date, default: Date.now },
    // lastUsedAt: {  type: Date, default: Date.now },
    // lastRefreshedAt:{  type: Date, default: Date.now },
    revoked: { type: Boolean, default: false }
}, {
  timestamps: false,
  collection: 'shop_sessions'
});

shopSessionSchema.index({ refreshTokenExpiry: 1 }, { expireAfterSeconds: 0 });
export const sessionModel = (db) => db.models.Session || db.model('Session', shopSessionSchema);
