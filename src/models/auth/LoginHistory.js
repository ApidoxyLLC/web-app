import mongoose from 'mongoose';

const loginHistorySchema = new mongoose.Schema({
          userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
       sessionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Session'},
        provider: { type: String, required: true,   enum: ['local-phone', 'local-email', 'google', 'facebook', 'apple'] },
              ip: { type: String, required: false,  select: false },
       userAgent: { type: String, required: false,  select: false },
     fingerprint: { type: String, required: false,   select: false },
       createdAt: { type: Date,   default: Date.now },
}, {
  collection: 'login_histories'
});

export const loginHistoryModel = (db) => db.models.LoginHistory || db.model('LoginHistory', loginHistorySchema);