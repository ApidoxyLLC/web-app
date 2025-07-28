import mongoose from "mongoose";
import cuid from "@bugsnag/cuid";

const invoiceSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    // shop referID F
    subscriptionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Subscription', required: true },
    
    invoiceNumber: { type: String, default: cuid() },  // Human-readable identifier
    
    abountTotal: { type: Number, default: 0 },
    amountDue: { type: Number, default: 0 },
    amountPaid: { type: Number, default: 0 },
    discountAmount: { type: Number, default: 0 },
    discountCode: { type: String , default: undefined},
    paymentRef:  { type: String },

    currency: { type: String, enum:['BDT', 'USD', 'GBP', 'EUR'], default: 'BDT' },
    status: { type: String,  enum: ['draft', 'open', 'paid', 'unpaid', 'failed', 'refunded', "cancelled"], default: 'unpaid' },
    reference: { type: String },
    billingAddress: mongoose.Schema.Types.Mixed,
    ipAddress: String,
    userAgent: String,
    auditLog: [{
      action: String,
      performedBy: mongoose.Schema.Types.ObjectId,
      timestamp: { type: Date, default: Date.now }
    }],
    // Soft delete
    isArchived: { type: Boolean, default: false },
    paymentGateway: { type: String, enum: ['stripe', 'paypal', 'braintree'] },
    paymentMethodId: String,
    periodStart: Date,
    periodEnd: Date,
    dueDate: Date,
    tax: { type: Number, default: 0 },
}, {
  timestamps: true,
  collection: 'invoices'
});

export const InvoiceModel = (db) => db.models.Invoice || db.model("Invoice", invoiceSchema);
export const Invoice = mongoose.models.Invoice ||  mongoose.model("Invoice", invoiceSchema, "invoices")
export default Invoice;