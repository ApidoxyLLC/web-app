import mongoose from "mongoose";
import cuid from "@bugsnag/cuid";

const inventoryReservationSchema = new mongoose.Schema({
  reservationId:  { type: String, required: true, unique: true, default: () => cuid()},
  productId:      { type: mongoose.Schema.Types.ObjectId, required: true, ref: 'Product' },
  variantId:      { type: mongoose.Schema.Types.ObjectId },
  cartId:         { type: mongoose.Schema.Types.ObjectId, ref: 'Cart' },
  userId:         { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  fingerprint:    { type: String, select: false },
  quantity:       { type: Number, required: true },
  expiresAt:      { type: Date, required: false, default: undefined },
  status:         { type: String, enum: ['reserved', 'released', 'used'], default: 'reserved' },
  originalPrice:  { type: Number },
  reservedPrice:  { type: Number, required: true },
  discountCode:   { type: String, required: false }
}, {
             timestamps: true,
             collection: 'inventory_reservations',
  optimisticConcurrency: true
});

export const inventoryReservationModel = (db) => db.models.InventoryReservation || db.model('InventoryReservation', inventoryReservationSchema);
