import mongoose from 'mongoose';

const loginHistorySchema = new mongoose.Schema({
          userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
       sessionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Session'},
        provider: { type: String, required: true,   enum: ['local-phone', 'local-email', 'google', 'facebook', 'apple'] },
              ip: { type: String, required: false,  select: false },
       userAgent: { type: String, required: false,  select: false },
     fingerprint: { type: String, required: true,   select: false },
       createdAt: { type: Date,   default: Date.now },
}, {
  collection: 'login_histories'
});

export const loginHistoryModel = (db) => db.models.LoginHistory || db.model('LoginHistory', loginHistorySchema);
// export const LoginHistory = mongoose.models.LoginHistory || mongoose.model("LoginHistory", loginHistorySchema, 'login_histories');
// export default LoginHistory;

// attempt: { type: String, required: true,
//     enum: ['success', 'failed', '2fa_required', 'blocked'] },
// failureReason: { type: String, default: null,
//     enum: ['wrong_password', 'expired_token', 'ip_blocked', null] },
// device: {
//     fingerprint: String,
//     type: { type: String, enum: ['desktop', 'mobile', 'tablet', 'unknown'] },
//     trusted: { type: Boolean, default: false } 
// },
// status: {  // Track success/failure
//     type: String,
//     enum: ['success', 'failed', 'suspicious'],
//     default: 'success'
// },