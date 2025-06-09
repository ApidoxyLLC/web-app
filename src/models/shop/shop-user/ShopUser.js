import cuid from "@bugsnag/cuid";
import mongoose from 'mongoose';

const consentSchema = new mongoose.Schema({
  acceptedTermsAt: { type: Date, default: null},
  marketingConsent: { type: Boolean, default: false },
  dataProcessingConsent: { type: Boolean, default: false }
}, { _id: false });

const verificationSchema = new mongoose.Schema({
  emailVerificationToken: { type: String, default: undefined, select: false },
  emailVerificationTokenExpiry: { type: Number, default: undefined, select: false  },
  phoneVerificationOTP: { type: String, default: undefined, select: false  },
  phoneVerificationOTPExpiry: { type: Date, default: undefined, select: false  }
}, { _id: false });

const securitySchema = new mongoose.Schema({
  password: { type: String, select: false, default: null },
  failedAttempts: { type: Number, default: null },
  lastLogin: { type: Date, default: null },

  forgotPasswordToken: { type: String, default: undefined },
  forgotPasswordTokenExpiry: { type: Number, default: undefined },

  resetPasswordToken: { type: String, default: undefined },
  resetPasswordTokenExpiry: { type: Number, default: undefined },
  
  passwordChangedAt: { type: Date, select: false, default: undefined },
  isFlagged: { type: Boolean, default: false, select: false  },
}, { _id: false });

const statusSchema = new mongoose.Schema({
  currentStatus: { type: String, enum: ['pending', 'active', 'suspended', 'deleted', 'initiate'], default: 'initiate' },
  changeAt: { type: Date, default: null },
  changeReason: { type: String, default: null },
  changeBy: { type: mongoose.Schema.Types.ObjectId, ref: 'users', default: null },
}, { _id: false });

const lockSchema = new mongoose.Schema({
  isLocked: { type: Boolean, default: null },
  lockReason: { type: String, default: null },
  lockUntil: { type: Date, default: null  },
}, { _id: false });

const twoFactorSchema = new mongoose.Schema({
  enabled: { type: Boolean, default: false },
  token: { type: String, select: false, default: null, select: false  },
  tokenExpiry: { type: Date, default: null, select: false  },
  attempts: { type: Number, default: null, select: false  },
}, { _id: false });

const shopSchema = new mongoose.Schema({
  shopId: {  type: mongoose.Schema.Types.ObjectId },
  dbCluster: { type: String },
  dbUri: { type: String },
  dbSecret: { type: String },
  dbNamePrefix: { type: String, default: process.env.APP_DB_PREFIX || 'app_db_' }
}, { _id: false });



const userSchema = new mongoose.Schema({
  name: { type: String, maxlength: 255, required: true },
  avatar: { type: String, default: null},
  activeSessions:[{ type: mongoose.Schema.Types.ObjectId,   
                      ref: 'Session',
                      select: false,
                    }],
  email: { type: String, trim: true, unique: true, index: true, sparse: true  },
  phone: { type: String, trim: true, unique: true, sparse: true },
  isEmailVerified: { type: Boolean, default: false },
  isPhoneVerified: { type: Boolean, default: false },
  verification:  { type: verificationSchema, default: () => ({}), select: false },
  security: { type: securitySchema, default: () => ({}), select: false },
  consent: { type: consentSchema, default: () => ({}) },
  status: { type: statusSchema, default: () => ({}), select: false  },
  lock: { type: lockSchema, default: () => ({}), select: false },
  twoFactor: { type: twoFactorSchema, default: () => ({}), select: false },

  isDeleted: { type: Boolean, default: false, select: false  },
  deletedAt: { type: Date, default: null, select: false  },
  role: {type: [String], default: ['end-user']},
  theme: { type: String, enum: ['light', 'dark', 'os'], default: 'os' },
  language: { type: String, default: 'english',
            enum: ['english', 'bangla'] },
  timezone: { type: String, default: null },
  currency: { type: String, default: null },
}, {
  timestamps: true,
  collection: 'users'
});

export const userModel = (db) => db.models.User || db.model('User', userSchema);


