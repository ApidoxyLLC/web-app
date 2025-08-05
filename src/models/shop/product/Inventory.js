import mongoose from "mongoose";
import cuid from "@bugsnag/cuid";

// const inventoryHistorySchema = new mongoose.Schema({
//            actionType: { type:String, enum: ['IN', 'OUT', 'ADJUSTMENT', 'TRANSFER']},    
//        quantityChange: { type: Number, required: true  },
//      previousQuantity: { type: Number, required: true },
//           newQuantity: { type: Number, required: true },
//             reference: { type: String },
//           performedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
//         }, { _id: true });

// const stockSchema = new mongoose.Schema({
//                 total: { type: Number, required: true, default: 0 },
//              reserved: { type: Number, required: true, default: 0 },
//             available: { type: Number, required: true, default: 0 },
//         });

export const inventorySchema = new mongoose.Schema({
          // inventoryId: { type: String, default: ()=> cuid() },
            // productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
            // variantId: { type: mongoose.Schema.Types.ObjectId, default: null },
                  sku: { type: String, required: true, index: true, unique: true },
              barcode: String,
                // stock: stockSchema,
    // lowStockThreshold: { type: Number, default: 5 },
             quantity: { type: Number, required: false, min: 0 },
    //         backorder: { type: Boolean, default: false },
    //          preorder: { type: Boolean, default: false },
    //            status: { type: String, default: 'in-stock', enum: ['in-stock', 'out-of-stock', 'discontinued', 'pre-order'] },
    //          reserved: { type: Number, default: 0 },
    //   lastStockChange: {     actionType: { type: String, enum: ['IN', 'OUT', 'ADJUSTMENT'] }, 
    //                       quantityDelta: Number, 
    //                           timestamp: Date }
}, { _id: true });