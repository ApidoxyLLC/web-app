import mongoose from 'mongoose';

const shopLoginHistorySchema = new mongoose.Schema({
          userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
       sessionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Session'},
        provider: { type: String, required: true,   enum: ['local-phone', 'local-email', 'google', 'facebook', 'apple'] },
              ip: { type: String, required: false,  select: false },
       userAgent: { type: String, required: false,  select: false },
     fingerprint: { type: String, select: false },
       createdAt: { type: Date,   default: Date.now },
}, {
  collection: 'shop_login_histories'
});


export const loginHistoryModel = (db) => db.models.LoginHistory || db.model('LoginHistory', shopLoginHistorySchema);
// export const ShopLoginHistory = mongoose.models.ShopLoginHistory || mongoose.model("ShopLoginHistory", shopLoginHistorySchema, 'shop_login_histories');
// export default ShopLoginHistory;