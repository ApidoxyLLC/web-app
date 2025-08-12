import mongoose from 'mongoose';

const invoiceSchema = new mongoose.Schema({
  // User Information
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  userDetails: {
    name: { type: String, required: true },
    email: { type: String, required: true },
    phone: { type: String }
  },

  shopId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Shop',
    required: true
  },
  shopReferenceId: { type: String, required: true },
  shopDetails: {
    name: { type: String, required: true },
    domain: { type: String }
  },

  planId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'SubscriptionPlan',
    required: true
  },
  planSlug: { type: String, required: true },
  planDetails: {
    name: { type: String, required: true },
    slug: { type: String, required: true },
    services: { type: mongoose.Schema.Types.Mixed, required: true }
  },

  amount: { type: Number, required: true },
  currency: { type: String, default: 'BDT' },
 
  billingCycle: { type: String, enum: ['monthly', 'yearly'] },
  validity: {
    days: { type: Number, required: true },
    from: { type: Date, required: true },
    until: { type: Date, required: true }
  },

  status: {
    type: String,
    enum: ['pending', 'processing', 'paid', 'failed', 'cancelled'],
    default: 'pending'
  },
  paymentMethod: {
    type: String,
    enum: ['bkash'],
    default: 'bkash'
  },
  paymentGateway: { type: String, default: 'bkash' },
  gatewayInvoiceId: { type: String },
  paymentId: { type: String },
  paymentGatewayResponse: { type: mongoose.Schema.Types.Mixed },
  receiptFileId: { type: String },
  receiptUrl: { type: String },
  receiptFileName: { type: String },
  bucketId: { type: String },
  bucketName: { type: String },
  createdAt: { type: Date, default: Date.now },
  paidAt: { type: Date }
}, {
  timestamps: true,
  collection: 'invoices',

});

export const InvoiceModel = (db) => db.models.Invoice || db.model('Invoice', invoiceSchema);
// import mongoose from "mongoose";
// import cuid from "@bugsnag/cuid";

// const invoiceSchema = new mongoose.Schema({
//     userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
//     // shop referID F
//     subscriptionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Subscription', required: true },
    
//     invoiceNumber: { type: String, default: cuid() },  // Human-readable identifier
    
//     abountTotal: { type: Number, default: 0 },
//     amountDue: { type: Number, default: 0 },
//     amountPaid: { type: Number, default: 0 },
//     discountAmount: { type: Number, default: 0 },
//     discountCode: { type: String , default: undefined},
//     paymentRef:  { type: String },

//     currency: { type: String, enum:['BDT', 'USD', 'GBP', 'EUR'], default: 'BDT' },
//     status: { type: String,  enum: ['draft', 'open', 'paid', 'unpaid', 'failed', 'refunded', "cancelled"], default: 'unpaid' },
//     reference: { type: String },
//     billingAddress: mongoose.Schema.Types.Mixed,
//     ipAddress: String,
//     userAgent: String,
//     auditLog: [{
//       action: String,
//       performedBy: mongoose.Schema.Types.ObjectId,
//       timestamp: { type: Date, default: Date.now }
//     }],
//     // Soft delete
//     isArchived: { type: Boolean, default: false },
//     paymentGateway: { type: String, enum: ['stripe', 'paypal', 'braintree'] },
//     paymentMethodId: String,
//     periodStart: Date,
//     periodEnd: Date,
//     dueDate: Date,
//     tax: { type: Number, default: 0 },
// }, {
//   timestamps: true,
//   collection: 'invoices'
// });

// export const InvoiceModel = (db) => db.models.Invoice || db.model("Invoice", invoiceSchema);
// export const Invoice = mongoose.models.Invoice ||  mongoose.model("Invoice", invoiceSchema, "invoices")
// export default Invoice;