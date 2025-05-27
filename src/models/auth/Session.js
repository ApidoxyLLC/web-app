import mongoose from 'mongoose';
import { encrypt } from '../../app/utils/encryption';

const sessionSchema = new mongoose.Schema({
    _id: { type: String },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'users', required: true, index: true },
    provider: { type: String, enum: ['local-phone', 'local-email', 'local-username', 'google', 'facebook', 'apple'], required: true},
    accessToken: { type: String, select: false, required: true },
    // accessTokenNonce: { type: String, select: false, required: true },
    accessTokenExpiresAt: { type: Date, select: false, required: true },
    // refreshTokenNonce: { type: String, select: false, required: true },
    refreshToken: { type: String, select: false, required: true },    
    refreshTokenExpiresAt: { type: Date, select: false, required: true },
    ip: { type: String, required: false },
    userAgent: { type: String, required: false },
    // device: { type: String, required: false },
    createdAt: { type: Date, default: Date.now },
    lastUsedAt: {  type: Date, default: Date.now },
    revoked: { type: Boolean, default: false }
}, {
  timestamps: false,
  collection: 'sessions'
});

// sessionSchema.index({ accessTokenExpiresAt: 1 }, { expireAfterSeconds: 0 });
sessionSchema.index({ refreshTokenExpiresAt: 1 }, { expireAfterSeconds: 0 });

export const sessionModel = (db) => db.models.Session || db.model('Session', sessionSchema);

export const Session = mongoose.models.Session || mongoose.model("Session", sessionSchema, 'sessions');
export default Session;
