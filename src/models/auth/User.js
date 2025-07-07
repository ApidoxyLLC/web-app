import cuid from "@bugsnag/cuid";
import mongoose from 'mongoose';

const ConsentSchema = new mongoose.Schema({
  acceptedTermsAt: { type: Date, default: null},
  marketingConsent: { type: Boolean, default: false },
  dataProcessingConsent: { type: Boolean, default: false }
}, { _id: false });

// previous version 
// const VerificationSchema = new mongoose.Schema({
//   // isEmailVerified: { type: Boolean, default: undefined },
//   emailVerificationToken: { type: String, default: undefined, select: false },
//   emailVerificationTokenExpiry: { type: Number, default: undefined, select: false  },
//   // isPhoneVerified: { type: Boolean, default: undefined },
//   phoneVerificationOTP: { type: String, default: undefined, select: false  },
//   phoneVerificationOTPExpiry: { type: Number, default: undefined, select: false  },
//   otpAttempts: { type: Number, default: 0, select: false },
// }, { _id: false });

const VerificationSchema = new mongoose.Schema({
  // isEmailVerified: { type: Boolean, default: undefined },
  token: { type: String, default: undefined, select: false },
  tokenExpiry: { type: Number, default: undefined, select: false  },
  // isPhoneVerified: { type: Boolean, default: undefined },
  otp: { type: String, default: undefined, select: false  },
  otpExpiry: { type: Number, default: undefined, select: false  },
  otpAttempts: { type: Number, default: 0, select: false },
}, { _id: false });

const SecuritySchema = new mongoose.Schema({
  password: { type: String, select: false, default: null },
  // salt: { type: String, select: false, default: null },
  failedAttempts: { type: Number, default: 0 },
  lastLogin: { type: Date, default: null },
  forgotPasswordToken: { type: String, default: undefined },
  forgotPasswordTokenExpiry: { type: Number, default: undefined }
}, { _id: false });

const StatusSchema = new mongoose.Schema({
  currentStatus: { type: String, enum: ['pending', 'active', 'suspended', 'deleted', 'initiate'], default: 'initiate' },
  changeAt: { type: Date, default: null },
  changeReason: { type: String, default: null },
  changeBy: { type: mongoose.Schema.Types.ObjectId, ref: 'users', default: null },
}, { _id: false });

const LockSchema = new mongoose.Schema({
  isLocked: { type: Boolean, default: false },
  lockReason: { type: String, default: undefined },
  lockUntil: { type: Date, default: undefined  },
}, { _id: false });

const OAuthProviderSchema = new mongoose.Schema({
  id: { type: String, required: true },
  accessToken: { type: String, required: true, select: false },
  refreshToken: { type: String, select: false }, // For token refresh
  tokenExpiresAt: { type: Date, select: false }, // When the token expires
  picture: { type: String }, // Profile picture URL from provider
  scope: { type: String }, // Granted permissions scope
  tokenType: { type: String }, // e.g., "Bearer"
}, { _id: false });

const TwoFactorSchema = new mongoose.Schema({
  enabled: { type: Boolean, default: false },
  token: { type: String, select: false, default: null, select: false  },
  tokenExpires: { type: Date, default: null, select: false  },
  attempts: { type: Number, default: null, select: false  },
}, { _id: false });

const shopSchema = new mongoose.Schema({
  shopId: {  type: mongoose.Schema.Types.ObjectId },
  dbCluster: { type: String },
  dbUri: { type: String },
  dbSecret: { type: String },
  dbNamePrefix: { type: String, default: process.env.APP_DB_PREFIX || 'app_db_' }
}, { _id: false });

const oauthSchema = new mongoose.Schema({
    google: { type: OAuthProviderSchema },
  facebook: { type: OAuthProviderSchema }
}, { _id: false });

const usageSchema = new mongoose.Schema({
         customDomains: { type: Number, default: 0 },
            subDomains: { type: Number, default: 0 },
                 shops: { type: Number, default: 0 },
                  apps: {
                      android: { type: Number, default: 0 },
                          web: { type: Number, default: 0 },
                          ios: { type: Number, default: 0 }
                        },
                builds: {
                      android: { type: Number, default: 0 },
                          web: { type: Number, default: 0 },
                          ios: { type: Number, default: 0 }
                      },
   paymentIntegrations: { type: Number, default: 0 },
  deliveryIntegrations: { type: Number, default: 0 },
           smsGateways: { type: Number, default: 0 },
  monthlyNotifications: { type: Number, default: 0 },
             storageMB: { type: Number, default: 0 },
      customerAccounts: { type: Number, default: 0 },
            staffUsers: { type: Number, default: 0 },
              products: { type: Number, default: 0 },
         monthlyOrders: { type: Number, default: 0 },
}, { _id: false });

const userSchema = new mongoose.Schema({
           referenceId: { type: String, default:()=>cuid(), select: true },
                  name: { type: String, maxlength: 255, required: true },
              username: { type: String, unique: true, sparse: true},
                avatar: { type: String, default: null},
        activeSessions: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Session', select: false }],
                 shops: { type: [mongoose.Schema.Types.ObjectId], select: false, default: [] },
                 email: { type: String, trim: true, unique: true, index: true, sparse: true  },
                 phone: { type: String, trim: true, unique: true, sparse: true },
       isEmailVerified: { type: Boolean, default: false, select: false  },
       isPhoneVerified: { type: Boolean, default: false, select: false  },
          verification: { type: VerificationSchema, default: () => ({}), select: false },
              security: { type: SecuritySchema, default: () => ({}), select: false },
               consent: { type: ConsentSchema, default: () => ({}), select: false },
                status: { type: StatusSchema, default: () => ({}), select: false  },
                  lock: { type: LockSchema, default: () => ({}), select: false },
             twoFactor: { type: TwoFactorSchema, default: () => ({}), select: false },
    activeSubscription: { type: mongoose.Schema.Types.ObjectId, ref:'Subscription', default: undefined  },
                 usage: { type: usageSchema },
                 oauth: { type: oauthSchema, default: undefined, select: false},
    // Profile Delete informationf

             isDeleted: { type: Boolean, default: false, select: false  },
             deletedAt: { type: Date, default: null, select: false  },
                  role: { type: [String], default: ['user'], select: true},
                 theme: { type: String, enum: ['light', 'dark', 'os'], default: 'os' },
              language: { type: String, default: 'english', enum: ['english', 'bangla'] },
              timezone: { type: String, default: null },
              currency: { type: String, default: null },
}, {
  timestamps: true,
  collection: 'users'
});

export const userModel = (db) => db.models.User || db.model('User', userSchema);