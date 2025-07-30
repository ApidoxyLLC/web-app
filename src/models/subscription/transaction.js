import mongoose from 'mongoose';

const transactionSchema = new mongoose.Schema({
    userId: { type: String, required: true },
    invoiceId: { type: String, required: true },

    paymentID: { type: String, required: true },
    trxID: { type: String, required: true },
    transactionStatus: {
        type: String,
        enum: ["Completed", "Failed", "Cancelled"],
        required: true,
    },

    amount: { type: String, required: true },
    currency: { type: String, default: "BDT" },

    paymentExecuteTime: { type: String },
    paymentMethod: { type: String, default: "bKash" },

    gatewayResponse: { type: Object }, 
}, { timestamps: true, collection: 'transactions' });


export const TransactionModel = (db) =>
    db.models.Transaction || db.model('Transaction', transactionSchema);
