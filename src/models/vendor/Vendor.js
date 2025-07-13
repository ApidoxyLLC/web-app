import mongoose from 'mongoose';
import config from '../config';

const dbInfoSchema = new mongoose.Schema({
    dbName: { type: String },
     dbUri: { type: String },
}, { timestamps: false });

const secretKeySchema = new mongoose.Schema({
           accessTokenSecret: { type: String, required: true },
          refreshTokenSecret: { type: String, required: true }, 
              nextAuthSecret: { type: String, required: true },
}, { timestamps: false, _id: false })

const expirationSchema = new mongoose.Schema({
   emailVerificationExpireMinutes: { type: Number, required: false,  }, 
   phoneVerificationExpireMinutes: { type: Number, required: false, }, 
         accessTokenExpireMinutes: { type: Number, required: false,  }, 
        refreshTokenExpireMinutes: { type: Number, required: false,  }, 
}, { timestamps: false, _id: false })

const transactionFieldsSchema = new mongoose.Schema({
                txId: {  type: String, index: true, required: function() { return this.sagaStatus !== 'success' }},
          sagaStatus: { type: String, enum: ['pending', 'success', 'aborted', 'compensating', 'failed'], default: 'pending', index: true },
        lastTxUpdate: { type: Date },
}, { _id: false, timestamps: false });

const socialLinksSchema = new mongoose.Schema({
    platform: { type: String, enum: ['facebook', 'twitter', 'telegram', 'discord', 'whatsapp', 'instagram', 'linkedin', 'youtube', 'tiktok']  },
    link: { type: String },
}, { _id: false });


const vendorSchema = new mongoose.Schema({
                                   _id: { type: mongoose.Schema.Types.ObjectId, required: true },
                           referenceId: { type: String, required: true, unique: true },
                          businessName: { type: String, required: true },
                              location: { type: String, required: true },
                               country: { type: String, required: true },
                              industry: { type: String, required: true },
                                 email: { type: String, trim: true },
                                 phone: { type: String, trim: true },
                     maxSessionAllowed: { type: Number, default: () => config.defaultMaxSessions, select: false },
                                dbInfo: { type: dbInfoSchema, default: null, select: false },
                               secrets: { type: secretKeySchema, default: null, select: false },
                           expirations: { type: expirationSchema, default: undefined, select: false },
                         primaryDomain: { type: String, trim: true, unique: true, sparse: true },
                               domains: { type: [String], default: [] },
                           socialLinks: { type: [socialLinksSchema], required: false, default: [] },
                      facebookDataFeed: { type: String, default: null },
                           transaction: { type: transactionFieldsSchema },
}, { timestamps: true, collection: 'vendors' });

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