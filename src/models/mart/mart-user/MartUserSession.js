import mongoose from 'mongoose';
import { encrypt } from '../../utils/encryption';

const martSessionSchema = new mongoose.Schema({
    // projectId: { type: mongoose.Schema.Types.ObjectId, ref: 'UserProjects' },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'users', required: true, index: true },
    provider: { type: String, enum: ['local-phone', 'local-email', 'google', 'facebook', 'apple'], required: true},
    accessToken: { type: String, select: false, required: true },
    accessTokenNonce: { type: String, select: false, required: true },
    accessTokenExpiresAt: { type: Date, required: true },
    refreshTokenNonce: { type: String, select: false, required: true },
    refreshTokenExpiresAt: { type: Date, required: true, index: { expires: '0s' } },
    refreshToken: { type: String, select: false, required: true },
    ip: { type: String, required: false },
    userAgent: { type: String, required: false },
    device: { type: String, required: false },
    createdAt: { type: Date, default: Date.now },
    lastUsedAt: {  type: Date, default: Date.now },
    revoked: { type: Boolean, default: false }
}, {
  timestamps: false,
  collection: 'mart_sessions'
});

// Encryption 
martSessionSchema.pre('save', async function(next) {
    const accessExpiresInSec = parseInt(process.env.ACCESS_TOKEN_EXPIRES_IN || '3600'); // 1 hour
    const refreshExpiresInSec = parseInt(process.env.REFRESH_TOKEN_EXPIRES_IN || `${7 * 24 * 3600}`); // 7 day

    if (this.isModified('accessToken')) {
        const { ciphertext, nonce } = await encrypt(this.accessToken);
        this.accessToken = ciphertext;
        this.accessTokenNonce = nonce;
        if (!this.accessTokenExpiresAt) {
            this.accessTokenExpiresAt = new Date(Date.now() + accessExpiresInSec * 1000);
          }
    }

    if (this.isModified('refreshToken')) {
        const { ciphertext, nonce } = await encrypt(this.refreshToken);
        this.refreshToken = ciphertext;
        this.refreshTokenNonce = nonce;
        if (!this.refreshTokenExpiresAt) {
            this.refreshTokenExpiresAt = new Date(Date.now() + refreshExpiresInSec * 1000);
          }
    }
    next();
});

export const MartSession = mongoose.models.MartSession || mongoose.model("MartSession", martSessionSchema, 'mart_sessions');
export default MartSession;
