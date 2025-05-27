import cuid from "@bugsnag/cuid";
import mongoose from 'mongoose';

const ConsentSchema = new mongoose.Schema({
  acceptedTermsAt: { type: Date, default: undefined},
  marketingConsent: { type: Boolean, default: false },
  dataProcessingConsent: { type: Boolean, default: false }
}, { _id: false });

const VerificationSchema = new mongoose.Schema({
  isEmailVerified: { type: Boolean, default: undefined },
  emailVerificationToken: { type: String, default: undefined },
  emailVerificationTokenExpires: { type: Date, default: undefined },
  isPhoneVerified: { type: Boolean, default: undefined },
  phoneVerificationToken: { type: String, default: undefined },
  phoneVerificationTokenExpires: { type: Date, default: undefined }
}, { _id: false });

const SecuritySchema = new mongoose.Schema({
  password: { type: String, select: false, default: undefined },
  salt: { type: String, select: false, default: undefined },
  failedAttempts: { type: Number, default: undefined },
  lastLogin: { type: Date, default: undefined }
}, { _id: false });

const StatusSchema = new mongoose.Schema({
  currentStatus: { type: String, enum: ['pending', 'active', 'suspended', 'deleted', 'initiate'], default: 'initiate' },
  changeAt: { type: Date, default: undefined },
  changeReason: { type: String, default: undefined },
  changeBy: { type: mongoose.Schema.Types.ObjectId, ref: 'users',default: undefined },
}, { _id: false });

const LockSchema = new mongoose.Schema({
  isLocked: { type: Boolean, default: undefined },
  lockReason: { type: String, default: undefined },
  lockUntil: { type: Date, default: undefined },
}, { _id: false });

const TwoFactorSchema = new mongoose.Schema({
  enabled: { type: Boolean, default: false },
  token: { type: String, select: false, default: undefined },
  tokenExpires: { type: Date, default: undefined },
  attempts: { type: Number, default: undefined },
}, { _id: false });

const shopUserSchema = new mongoose.Schema({
  projectId: { type: mongoose.Schema.Types.ObjectId, ref: 'UserProjects' },
  name: { type: String, maxlength: 255, required: true },
  avatar: { type: String, default: undefined},
  activeSessions:[{ type: mongoose.Schema.Types.ObjectId, ref: 'Sessions' }],
  email: { type: String, trim: true, unique: true, index: true  },
  phone: { type: String, trim: true, unique: true },

  verification:  { type: VerificationSchema, default: () => ({}) },
  security: { type: SecuritySchema, default: () => ({}) },
  consent: { type: ConsentSchema, default: () => ({}) },
  status: { type: StatusSchema, default: () => ({}) },
  lock: { type: LockSchema, default: () => ({}) },
  twoFactor: { type: TwoFactorSchema, default: () => ({}) },
  
  // Profile Delete information
  isDeleted: { type: Boolean, default: false },
  deletedAt: { type: Date, default: undefined },
  role: {type: [String], enum: ['end_user', 'project_operator'], default: ['end_user']},
  theme: { type: String, enum: ['light', 'dark', 'os'], default: 'os' },
  language: { type: String, default: 'english',
            enum: ['english', 'bangla'] },
  timezone: { type: String, default: undefined },
  currency: { type: String, default: undefined },
}, {
  timestamps: true,
  collection: 'shop_users'
});


export const ShopUser = mongoose.models.ShopUser ||  mongoose.model("ShopUser", shopUserSchema, "shop_users")
export default ShopUser



  // GDPR/Privacy
  // acceptedTermsAt: { type: Date, default: undefined},
  // marketingConsent: { type: Boolean, default: false },
  // dataProcessingConsent: { type: Boolean, default: false },

  // Email  
  // email: { type: String, trim: true, default: undefined, sparse: true },
  // isEmailVerified: { type: Boolean, default: undefined },
  // emailVerificationToken: { type: String, default: undefined },
  // emailVerificationTokenExpires: { type: Date, default: undefined },

  // Phone 
  // phone: { type: String, trim: true, default: undefined, sparse: true },
  // isPhoneVerified: { type: Boolean, default: undefined },
  // phoneVerificationToken: { type: String, default: undefined },
  // phoneVerificationTokenExpires: { type: Date, default: undefined },

  // Security
  // password: { type: String, select: false , default: undefined },
  // salt: { type: String, select: false, default: undefined},
  // isTwoFactorEnable: { type: Boolean, default: false, },
  // lastLogin: { type: Date, default: undefined },
  // failedAttempts: {  type: Number,  default: 0 },