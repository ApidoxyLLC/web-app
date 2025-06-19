import mongoose from "mongoose";
import cuid from "@bugsnag/cuid";

const itemSchema = new mongoose.Schema({
    productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
    variantId: { type: String },
     quantity: { type: Number, required: true, min: 1, validate: { validator: Number.isInteger, message: 'Quantity must be an integer' } },
originalPrice: { type: Number, required: true },
reservedPrice: { type: Number, required: true }
}, { _id: false });

const reservationSchema = new mongoose.Schema({
    reservationId: { type: String, required: true,     unique: true, default: () => cuid()},
        sessionId: { type: String, required: true },
        ipAddress: { type: String, required: true },
      fingerprint: { type: String,   select: false,  required: true },  
            items: [{ type: itemSchema }],
        createdAt: { type: Date, default: Date.now, index: { expires: '30m' } },
        expiresAt: { type: Date, default: () => new Date(Date.now() + 30*60*1000) },
   lastExtendedAt: Date,
           status: { type: String, enum: ['reserved', 'converted', 'expired', 'released'], default: 'reserved' },
conversionOrderId: { type: mongoose.Schema.Types.ObjectId, ref: 'Order' },
           source: { type: String, enum: ['web', 'mobile', 'pos', 'api'], required: true },
        userAgent: String,
}, {
  timestamps: true,
  collection: 'reservations',
  optimisticConcurrency: true
});

export const reservationModel = (db) => db.models.Reservation || db.model('Reservation', reservationSchema);

// Indexes for fast queries
// reservationSchema.index({ sessionId: 1, status: 1 });
// reservationSchema.index({ 'items.productId': 1, status: 1 });
// reservationSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// Pre-save hooks
// reservationSchema.pre('save', function(next) {
//   if (this.isModified('items')) {
//     this.markModified('items');
//   }
//   next();
// });

// Static methods
// reservationSchema.statics.findActiveByProduct = function(productId) {
//   return this.find({
//     'items.productId': productId,
//     status: 'reserved',
//     expiresAt: { $gt: new Date() }
//   });
// };

// Instance methods
// reservationSchema.methods.extendReservation = function(minutes = 10) {
//   this.expiresAt = new Date(Date.now() + minutes*60*1000);
//   this.lastExtendedAt = new Date();
//   return this.save();
// };

export const Reservation = mongoose.model('Reservation', reservationSchema);