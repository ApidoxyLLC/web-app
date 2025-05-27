import mongoose from "mongoose";

const invoiceSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    subscriptionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Subscription', required: true },
    amountPaid: { type: Number, default: 0 },
    currency: { type: String, default: 'USD' },
    status: { type: String,  enum: ['paid', 'unpaid', 'failed', 'refunded'], default: 'unpaid' },
    reference: { type: String },
    paymentRef:  { type: String }
}, {
  timestamps: true,
  collection: 'invoices'
});

export const InvoiceModel = (db) => db.models.Invoice || db.model("Invoice", invoiceSchema);
export const Invoice = mongoose.models.Invoice ||  mongoose.model("Invoice", invoiceSchema, "invoices")
export default Invoice;