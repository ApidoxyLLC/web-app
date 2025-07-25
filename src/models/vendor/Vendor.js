import mongoose from 'mongoose';
import config from '../config';
import imageSchema from '../imageSchema';
import { pathaoSchema, steadfastSchema } from './DeliveryPartner';
import { bkashSchema } from './PaymentPartner';
import { alphaNetBdSchema, bulkSmsBdSchema, adnDiginetBdSchema } from './SmsServices';

const dbInfoSchema = new mongoose.Schema({
  dbName: { type: String },
  dbUri: { type: String },
}, { timestamps: false, _id: false });

const bucketInfoSchema = new mongoose.Schema({
  accountId: { type: String },
  bucketName: { type: String },
  bucketId: { type: String }
}, { timestamps: false, _id: false });

const secretKeySchema = new mongoose.Schema({
  accessTokenSecret: { type: String, required: true },
  refreshTokenSecret: { type: String, required: true },
  nextAuthSecret: { type: String, required: true },
}, { timestamps: false, _id: false })

const expirationSchema = new mongoose.Schema({
  emailVerificationExpireMinutes: { type: Number, required: false, },
  phoneVerificationExpireMinutes: { type: Number, required: false, },
  accessTokenExpireMinutes: { type: Number, required: false, },
  refreshTokenExpireMinutes: { type: Number, required: false, },
}, { timestamps: false, _id: false })

const transactionFieldsSchema = new mongoose.Schema({
  txId: { type: String, index: true, required: function () { return this.sagaStatus !== 'success' } },
  sagaStatus: { type: String, enum: ['pending', 'success', 'aborted', 'compensating', 'failed'], default: 'pending', index: true },
  lastTxUpdate: { type: Date },
}, { _id: false, timestamps: false });

const socialLinksSchema = new mongoose.Schema({
  platform: { type: String, enum: ['facebook', 'twitter', 'telegram', 'discord', 'whatsapp', 'instagram', 'linkedin', 'youtube', 'tiktok'] },
  link: { type: String },
}, { _id: false, timestamps: false });

const appSettingsSchema = new mongoose.Schema({
  templates: { type: String, enum: ['desiree', 'stylo'], default: 'desiree' },
  color: { type: String },
  notifications: { type: Boolean, default: true },
}, { _id: false, timestamps: false });

const contactNdSupportSchema = new mongoose.Schema({
  email: { type: String, required: false, default: null },
  phone: { type: String, required: false, default: null },
  whatsapp: { type: String },

}, { _id: false, timestamps: false });

const notificationSchema = new mongoose.Schema({
  email: { type: String, default: null },
  phone: { type: String, default: null },
  preferredChannel: { type: String, enum: ['email', 'sms', 'whatsapp'], default: null },

  hourlyNotification: {
    enabled: { type: Boolean, default: false },
    intervalHours: { type: Number, default: 1, min: 1, max: 24 }
  },

  orderNotifications: {
    enabled: { type: Boolean, default: false },
    frequency: { type: Number, default: 1, min: 1 }
  },

}, { _id: false, timestamps: false });

const deliveryPartnerSchema = new mongoose.Schema({
  pathao: { type: pathaoSchema, default: undefined },
  steadfast: { type: steadfastSchema, default: undefined }
}, { timestamps: false, _id: false })


const smsProviderSchema = new mongoose.Schema({
  bulk_sms_bd: { type: bulkSmsBdSchema, default: undefined },
  alpha_net_bd: { type: alphaNetBdSchema, default: undefined },
  adn_diginet_bd: { type: adnDiginetBdSchema, default: undefined },
}, { _id: false });


const facebookPixelSchema = new mongoose.Schema({
  provider: { type: String },
  pixelId: { type: String },
  pixelAccessToken: { type: String },
  testEventId: { type: String },
  conversionApiToken: { type: String },
  dataFeedUrl: { type: String },
}, { timestamps: false, _id: false });

const paymentPartnerSchema = new mongoose.Schema({
  bkash: { type: bkashSchema, default: undefined }
}, { timestamps: facebookPixelSchema, _id: false })

const baseAppSchema = new mongoose.Schema({
  appId: { type: String, default: null },
  appSlug: { type: String, default: null },
  appName: { type: String, default: null },
  appIcon: { type: String, default: null },
  // email: { type: String, required: false, default: null },
  // phone: { type: String, required: false, default: null },
  version: { type: String, default: null },
  status: { type: String, default: 'pending', enum: ['active', 'inactive', 'pending', 'on-build', 'prepared'] },
  language: { type: String, enum: ['en_US', 'bn_BD'], default: 'en_US' },
  appUrl: { type: String, required: false, default: null },
  contactUs: { type: String, default: null },
  settings: appSettingsSchema,
  socialLinks: [socialLinksSchema],

  // extraPolicies: [extraPolicySchema], 
  siteMap: { type: String, default: null },

}, { timestamps: true, _id: false });

const buildInfoSchema = new mongoose.Schema({
  buildNo: { type: Number, default: 0 },
  versionName: { type: String },
  buildTime: { type: String },
  buildDuration: { type: String },
  gitBranch: { type: String },
  buildStatus: { type: String, enum: ['success', 'pending', 'queued', 'failed'] }
}, { timestamps: false, _id: false });

const androidAppSchema = new mongoose.Schema({
  ...baseAppSchema.obj,
  packageName: { type: String },
  buildInfo: [buildInfoSchema],
  firebaseJSONData: String,
  buildHistory: [{
    si_no: { type: String, default: null },
    version: { type: String, default: null }
  }]
}, { timestamps: false, _id: false });

const webAppSchema = new mongoose.Schema({
  ...baseAppSchema.obj,
  logo: { type: String },
  title: { type: String },
  domain: { type: String }
}, { timestamps: false, _id: false });

const iosAppSchema = new mongoose.Schema({
  ...baseAppSchema.obj,
  buildInfo: [buildInfoSchema],
  firebaseJSONData: String,
  bundleId: { type: String },
}, { timestamps: false, _id: false });

const metadataSchema = new mongoose.Schema({
  description: { type: String },
  keywords: { type: [{ type: String, trim: true, lowercase: true }] },
  tags: { type: [{ type: String, trim: true, lowercase: true }] }
  // tags: { type: [{ name: String, content: String, property: String }] },
}, { timestamps: false, _id: false });

const googleTagManagerSchema = new mongoose.Schema({
  provider: { type: String },
  tagManagerId: { type: [{ type: String, trim: true, lowercase: true }] },
}, { timestamps: false, _id: false });

// const smsProviderSchema = new mongoose.Schema({
//         provider: { type: String, enum: ['bulk-sms-bd', 'twilio', 'nexmo', 'msg91', 'banglalink'] },
//           apiKey: { type: String },
//         senderId: { type: String },
//         clientId: { type: String },
//     clientSecret: { type: String },
//           active: { type: Boolean, default: false }
// }, { timestamps: false,  _id: false });

const emailProviderSchema = new mongoose.Schema({
  provider: { type: String, enum: ['mailgun', 'sendgrid', 'smtp', 'ses'] },
  smtpHost: { type: String },
  port: { type: String },
  username: { type: String },
  password: { type: String },
  active: { type: Boolean, default: false },
}, { timestamps: false, _id: false });

const chatSupportSchema = new mongoose.Schema({
  provider: { type: String, enum: ['facebook', 'whatsapp', 'intercom', 'tawk'] },
  link: { type: String },
  active: { type: Boolean, default: false },
}, { timestamps: true, _id: false });

const marketingSchema = new mongoose.Schema({
  sitemapUrl: { type: String },
  googleTagManager: { type: googleTagManagerSchema },
  facebookPixel: { type: facebookPixelSchema },
  smsProviders: { type: smsProviderSchema },
  emailProviders: { type: emailProviderSchema }
}, { timestamps: true, _id: false });

const stuffSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: false },
    designation: { type: String, enum: ['store_manager', 'assistant_manager', 'cashier', 'sales_associate', 'inventory_clerk', 'security', 'janitor', 'other'], required: false },
    status: { type: String, enum: ['active', 'terminated', 'on_leave', 'resigned'], default: 'active' },
    permission: { type: [String], enum: ['r:delivery-partner', 'w:delivery-partner', 'r:shop', 'w:shop', 'r:product', 'c:product', 'w:shop', 'r:category', 'c:category', 'w:category'] },
    startDate: { type: Date, required: false, },
    endDate: { type: Date },
    notes: [{
      date: { type: Date, default: Date.now },
      author: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      content: String
    }],
  }, { timestamps: true, _id: false });


// const integrationSchema = new mongoose.Schema({
//   googleTagManagerId: { type: String },
//   facebookPixelId: { type: String },
//   pixelAccessToken: { type: String },
//   pixelTestEventId: { type: String },
//   facebookConversionApiToken: { type: String },
//   sitemapUrl: { type: String },
//   facebookDataFeedUrl: { type: String },
//   // add more integrations as needed
// }, { timestamps: true });

// const smsSchema = new mongoose.Schema({
//   apiKey: { type: String },
//   senderId: { type: String },
//   clientId: { type: String },
//   clientSecret: { type: String },
// }, { timestamps: true });

// const emailSchema = new mongoose.Schema({
//   SMTP: { type: String },
//   port: { type: String },
//   username: { type: String },
//   password: { type: String },
// }, { timestamps: true });







const vendorSchema = new mongoose.Schema({
  _id: { type: mongoose.Schema.Types.ObjectId, required: true },
  referenceId: { type: String, required: true, unique: true },
  ownerId: { type: mongoose.Schema.Types.ObjectId, required: true, ref: 'User' },
  businessName: { type: String, required: true },
  location: { type: String, required: true },
  country: { type: String, required: true },
  industry: { type: String, required: true },
  email: { type: String, trim: true },
  phone: { type: String, trim: true },
  logo: { type: imageSchema },
  stuffs: { type: [stuffSchema], default: undefined },
  maxSessionAllowed: { type: Number, default: () => config.defaultMaxSessions, select: false },
  dbInfo: { type: dbInfoSchema, default: null, select: false },
  bucketInfo: { type: bucketInfoSchema, default: null, select: false },
  secrets: { type: secretKeySchema, default: null, select: false },
  expirations: { type: expirationSchema, default: undefined, select: false },
  primaryDomain: { type: String, trim: true, unique: true, sparse: true },
  domains: { type: [String], default: [] },
  socialLinks: { type: [socialLinksSchema], required: false, default: [] },
  facebookDataFeed: { type: String, default: null },
  transaction: { type: transactionFieldsSchema },
  policies: { type: String, default: null },
  support: { type: contactNdSupportSchema, select: true },
  notification: { type: notificationSchema, select: true },
  deliveryPartner: { type: deliveryPartnerSchema, default: null },
  smsProvider: { type: smsProviderSchema, default: {} },
  paymentPartner: { type: paymentPartnerSchema, default: null },
  chatSupport: { type: [chatSupportSchema], default: null },
  marketing: { type: marketingSchema, default: null },
  activeApps: { type: [String], default: [], enum: ['web', 'android', 'ios'] },
  web: { type: webAppSchema, default: null },
  android: { type: androidAppSchema, default: null },
  ios: { type: iosAppSchema, default: null },
  metadata: { type: metadataSchema }
}, { timestamps: true, collection: 'vendors' });





// contactNdSupportSchema
// notificationSchema

// ───── Status Transitions ─────
// const allowedStatusTransitions = {
//   pending: ['completed', 'failed'],
//   completed: [],
//   failed: [],
// };

// // ───── Methods ─────

// vendorSchema.methods.updateSagaStep = async function (stepName, status, details = {}) {
//   if (!this.transaction) this.transaction = {};
//   if (!Array.isArray(this.transaction.sagaSteps)) this.transaction.sagaSteps = [];

//   const stepIndex = this.transaction.sagaSteps.findIndex(s => s.stepName === stepName);

//   if (stepIndex === -1) {
//     // New step
//     this.transaction.sagaSteps.push({
//       stepName,
//       status,
//       details,
//       completedAt: status === 'completed' ? new Date() : undefined
//     });
//   } else {
//     const currentStatus = this.transaction.sagaSteps[stepIndex].status;

//     if (currentStatus === status) return this; // idempotent

//     if (!allowedStatusTransitions[currentStatus]?.includes(status)) {
//       throw new Error(`Invalid status transition from ${currentStatus} to ${status} for step "${stepName}"`);
//     }

//     this.transaction.sagaSteps[stepIndex].status = status;
//     this.transaction.sagaSteps[stepIndex].details = details;
//     if (status === 'completed') {
//       this.transaction.sagaSteps[stepIndex].completedAt = new Date();
//     }
//   }

//   this.transaction.lastTxUpdate = new Date();
//   return this.save();
// };

// vendorSchema.methods.isSagaComplete = function () {
//   return ['success', 'aborted'].includes(this?.transaction?.sagaStatus);
// };

// vendorSchema.methods.getSagaStatus = function () {
//   return this.transaction?.sagaStatus ?? 'not_initialized';
// };

// vendorSchema.statics.findByTxId = function (txId) {
//   return this.findOne({ 'transaction.txId': txId });
// };

// // ───── Hooks ─────

// vendorSchema.pre('save', function (next) {
//   const tx = this.transaction;

//   if (this.isModified('transaction.sagaStatus') && tx) {
//     if (['success', 'aborted'].includes(tx.sagaStatus)) {
//       tx.lastTxUpdate = new Date();

//       if (Array.isArray(tx.sagaSteps)) {
//         tx.sagaSteps.forEach(step => {
//           if (step.status === 'pending') {
//             step.status = 'completed';
//             step.completedAt = new Date();
//           }
//         });
//       }
//     }
//   }

//   next();
// });

export const vendorModel = (db) => db.models.Vendor || db.model('Vendor', vendorSchema);