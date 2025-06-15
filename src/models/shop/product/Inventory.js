import mongoose from "mongoose";

const inventoryHistorySchema = new mongoose.Schema({
    actionType: { type:String, enum: ['IN', 'OUT', 'ADJUSTMENT', 'TRANSFER']},    
    quantityChange: { type: Number, required: true  },
    previousQuantity: { type: Number, required: true },
    newQuantity: { type: Number, required: true },
    reference: { type: String }, // Order ID, Adjustment ID, etc.
    performedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
});

export const inventorySchema = new mongoose.Schema({
    quantity: { type: Number, required: true, min: 0 },
    lowStockThreshold: { type: Number, default: 10 },
    backorder: { type: Boolean, default: false },
    preorder: { type: Boolean, default: false },
    location: String,
    status: { type: String, default: 'in-stock',
                enum: ['in-stock', 'out-of-stock', 'discontinued', 'pre-order'] },
    history: [inventoryHistorySchema],
    reserved: { type: Number, default: 0 }
}, { _id: false });