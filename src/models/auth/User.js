import cuid from "@bugsnag/cuid";
import mongoose from 'mongoose';

const ConsentSchema = new mongoose.Schema({
  acceptedTermsAt: { type: Date, default: null},
  marketingConsent: { type: Boolean, default: false },
  dataProcessingConsent: { type: Boolean, default: false }
}, { _id: false });

const VerificationSchema = new mongoose.Schema({
  isEmailVerified: { type: Boolean, default: null },
  emailVerificationToken: { type: String, default: null, select: false },
  emailVerificationTokenExpires: { type: Date, default: null, select: false  },
  isPhoneVerified: { type: Boolean, default: null },
  phoneVerificationOTP: { type: String, default: null, select: false  },
  phoneVerificationOTPExpires: { type: Date, default: null, select: false  }
}, { _id: false });

const SecuritySchema = new mongoose.Schema({
  password: { type: String, select: false, default: null, select: false  },
  salt: { type: String, select: false, default: null, select: false  },
  failedAttempts: { type: Number, default: null, select: false  },
  lastLogin: { type: Date, default: null }
}, { _id: false });

const StatusSchema = new mongoose.Schema({
  currentStatus: { type: String, enum: ['pending', 'active', 'suspended', 'deleted', 'initiate'], default: 'initiate' },
  changeAt: { type: Date, default: null },
  changeReason: { type: String, default: null },
  changeBy: { type: mongoose.Schema.Types.ObjectId, ref: 'users',default: null },
}, { _id: false });

const LockSchema = new mongoose.Schema({
  isLocked: { type: Boolean, default: null },
  lockReason: { type: String, default: null },
  lockUntil: { type: Date, default: null, select: false  },
}, { _id: false });

const TwoFactorSchema = new mongoose.Schema({
  enabled: { type: Boolean, default: false },
  token: { type: String, select: false, default: null, select: false  },
  tokenExpires: { type: Date, default: null, select: false  },
  attempts: { type: Number, default: null, select: false  },
}, { _id: false });

const userSchema = new mongoose.Schema({
  vendorId: { type: String, unique: true,
              default: () => cuid() },
  name: { type: String, maxlength: 255, required: true },
  avatar: { type: String, default: null},
  activeSessions:[{ type: mongoose.Schema.Types.ObjectId, 
                      ref: 'sessions', 
                      select: false,
                      validate: {
                                validator: function (arr) {
                                  const ids = arr.map(String); // Convert ObjectIds to strings
                                  return ids.length === new Set(ids).size;
                                },
                                message: 'activeSessions must contain unique session IDs'
                              }                    
                    }],
  email: { type: String, trim: true, unique: true, index: true, sparse: true  },
  phone: { type: String, trim: true, unique: true, sparse: true },
  verification:  { type: VerificationSchema, default: () => ({}) },
  security: { type: SecuritySchema, default: () => ({}) },
  consent: { type: ConsentSchema, default: () => ({}) },
  status: { type: StatusSchema, default: () => ({}), select: false  },
  lock: { type: LockSchema, default: () => ({}) },
  twoFactor: { type: TwoFactorSchema, default: () => ({}), select: false },
  
  // Profile Delete information
  isDeleted: { type: Boolean, default: false, select: false  },
  deletedAt: { type: Date, default: null, select: false  },
  plan: { type: String, default: 'basic', enum: ['basic', 'standard', 'premium', 'enterprise'] },
  role: {type: [String], enum: ['user', 'operator'], default: ['user']},
  theme: { type: String, enum: ['light', 'dark', 'os'], default: 'os' },
  language: { type: String, default: 'english',
            enum: ['english', 'bangla'] },
  timezone: { type: String, default: null },
  currency: { type: String, default: null },
}, {
  timestamps: true,
  collection: 'users'
});

// userSchema.set('toJSON', {
//   transform(_, ret) { delete ret.__v; delete ret._id; return ret; }
// });
// userSchema.index({ email: 1 }, { unique: true, sparse: true });
// 
// userSchema.pre('save', function (next) {
//   if (this.activeSessions) {
//     this.activeSessions = [...new Set(this.activeSessions.map(id => id.toString()))];
//   }
//   next();
// });

export const User = mongoose.models.User ||  mongoose.model("User", userSchema, "users")
export default User



  // GDPR/Privacy
  // acceptedTermsAt: { type: Date, default: null},
  // marketingConsent: { type: Boolean, default: false },
  // dataProcessingConsent: { type: Boolean, default: false },

  // Email  
  // email: { type: String, trim: true, default: null, sparse: true },
  // isEmailVerified: { type: Boolean, default: null },
  // emailVerificationToken: { type: String, default: null },
  // emailVerificationTokenExpires: { type: Date, default: null },

  // Phone 
  // phone: { type: String, trim: true, default: null, sparse: true },
  // isPhoneVerified: { type: Boolean, default: null },
  // phoneVerificationToken: { type: String, default: null },
  // phoneVerificationTokenExpires: { type: Date, default: null },

  // Security
  // password: { type: String, select: false , default: null },
  // salt: { type: String, select: false, default: null},
  // isTwoFactorEnable: { type: Boolean, default: false, },
  // lastLogin: { type: Date, default: null },
  // failedAttempts: {  type: Number,  default: 0 },