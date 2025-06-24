import mongoose from "mongoose";
import cuid from "@bugsnag/cuid";

const itemPriceSchema = new mongoose.Schema({
  basePrice: { type: Number, required: true, min: 0 },
   currency: { type: String, enum: ["USD", "BDT"], required: true }
}, { _id: false });

const orderItemSchema = new mongoose.Schema({
  productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
  variantId: { type: mongoose.Schema.Types.ObjectId, default: undefined },
   quantity: { type: Number, required: true, min: 1 },
      price: { type: itemPriceSchema, required: true },
   subtotal: { type: Number, required: true },
      title: { type: String, default: undefined },
      image: { type: String, default: undefined }
}, { _id: false });

const discountDetailSchema = new mongoose.Schema({
    couponId: { type: String, required: true },
        code: { type: String, required: true },
        type: { type: String, enum: ['percentage_off', 'fixed_amount', 'free_shipping', 'bogo', 'cashback'], required: true },
      amount: { type: Number, required: true },  
   appliedTo: { type: { type: String, enum: ['products', 'categories', 'cart'], required: true },
            products: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Product' }],
          categories: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Category' }]       },
    metadata: { type: mongoose.Schema.Types.Mixed }
}, { _id: false });

const paymentSchema = new mongoose.Schema({
        paymentId: { type: String, default: () => cuid() },
           status: { type: String, enum: ['pending', 'paid', 'failed', 'refunded'], default: 'pending' },
           method: { type: String, enum: ['cod', 'card', 'bkash', 'nagad', 'sslcommerz', 'stripe'], required: true },
    transactionId: { type: String, default: undefined },
  gatewayResponse: { type: mongoose.Schema.Types.Mixed },
      processedAt: { type: Date }
}, { _id: false });

const shippingSchema = new mongoose.Schema({
          address: {    street: { type: String, required: true },
                          city: { type: String, required: true },
                    postalCode: { type: String },
                       country: { type: String, required: true },
                        region: String                             
                    },
            phone: String,
            notes: String,
          method: { type: String, enum: ['standard', 'express', 'pickup'], required: true },
  shippingStatus: { type: String, enum: ['pending', 'in_transit', 'delivered', 'returned'], default: 'pending' },
            cost: { type: Number, required: true },
  trackingNumber: { type: String }
}, { _id: false });

const orderSchema = new mongoose.Schema({
      orderId: { type: String, default: () => cuid(), unique: true, index: true },
       userId: { type: mongoose.Schema.Types.ObjectId, ref: 'ShopUser', required: true },
       cartId: { type: String, required: true },
        items: { type: [orderItemSchema], required: true },
       totals: {      subtotal: { type: Number, required: true },
                      discount: { type: Number, default: 0 },
                           tax: { type: Number, default: 0 },
                deliveryCharge: { type: Number, default: 0 },
                    grandTotal: { type: Number, required: true },
                      currency: { type: String, enum: ["USD", "BDT"], default: 'BDT' } },
    discounts: { type: [discountDetailSchema], default: undefined },
     shipping: { type: shippingSchema, required: true },
      payment: { type: paymentSchema, required: false },
  orderStatus: { type: String, enum: ['pending_payment','confirmed', 'processing', 'shipped', 'delivered', 'cancelled', 'refunded'], default: 'pending_payment' },
  fingerprint: { type: String, select: false },
           ip: { type: String },
    userAgent: { type: String },
     placedAt: { type: Date, default: Date.now },
  confirmedAt: { type: Date, default: undefined },
  cancelledAt: { type: Date, default: undefined },
   refundedAt: { type: Date, default: undefined },
  deliveredAt: { type: Date, default: undefined }
}, {
  collection: 'orders'
});

export const orderModel = (db) => db.models.Order || db.model('Order', orderSchema);