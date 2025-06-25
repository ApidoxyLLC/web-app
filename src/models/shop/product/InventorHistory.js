import mongoose from "mongoose";
import cuid from "@bugsnag/cuid";

const inventoryHistorySchema = new mongoose.Schema({
            productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
            variantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Variant', default: undefined },
              orderId: { type: mongoose.Schema.Types.ObjectId, ref: 'Order', default: undefined },
           actionType: { type:String, enum: ['IN', 'OUT', 'ADJUSTMENT', 'TRANSFER'], required: true },    
       quantityChange: { type: Number, required: true  },
     previousQuantity: { type: Number, required: true },
          newQuantity: { type: Number, required: true },
            reference: { type: String },
          performedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
               reason: { type: String },
                 note: { type: String },
                 meta: mongoose.Schema.Types.Mixed
        }, {  _id: true,
             timestamps: true,
             collection: 'inventory_histories'
         });

export const inventoryHistoryModel = (db) => db.models.InventoryHistory || db.model('InventoryHistory', inventoryHistorySchema);

