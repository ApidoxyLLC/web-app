import mongoose from 'mongoose';


// const oauthSchema = new mongoose.Schema({
//     provider: { type: String, enum: ['google', 'facebook']},
//     providerUserId: { type: String, },
//     providerAccessToken: { type: String, },
//     providerRefreshToken: { type: String, },
//     providerTokenExpiresAt: { type: Date}
// , }, { _id: false });
const OAuthProviderSchema = new mongoose.Schema({
    provider: String,
    providerUserId: String,
    providerAccessToken: String,
    providerRefreshToken: String,
    providerTokenExpiresAt: Date
  }, { _id: false });

// const oauthSchema = new mongoose.Schema({
//     google: { type: OAuthProviderSchema },
//   facebook: { type: OAuthProviderSchema }
// }, { _id: false });

const sessionSchema = new mongoose.Schema({
                      _id: { type: String },
                   userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
                 provider: { type: String,  enum: ['local-phone', 'local-email', 'local-username', 'google', 'facebook', 'apple'], required: true},
              accessToken: { type: String,  select: false,  required: true },
     accessTokenExpiresAt: { type: Date,    select: false,  required: true },
             refreshToken: { type: String,  select: false,  required: true },    
    refreshTokenExpiresAt: { type: Date,    select: false,  required: true },
              fingerprint: { type: String,  select: false,  required: false },  
                       ip: { type: String,                  required: false },
                userAgent: { type: String,                  required: false },
                     role: { type: [String], default: ['user'] },
             providerData: { type: OAuthProviderSchema, default: undefined },
                  // device: { type: String, required: false },
                createdAt: { type: Date,    default: Date.now },
               lastUsedAt: { type: Date,    default: Date.now },
                  revoked: { type: Boolean, default: false }
}, {
  timestamps: false,
  collection: 'sessions'
});

sessionSchema.index({ refreshTokenExpiresAt: 1 }, { expireAfterSeconds: 0 });
export const sessionModel = (db) => db.models.Session || db.model('Session', sessionSchema);

// export const Session = mongoose.models.Session || mongoose.model("Session", sessionSchema, 'sessions');
// export default Session;
