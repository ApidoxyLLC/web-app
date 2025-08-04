import mongoose from 'mongoose';

const staffSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: false },
    designation: { type: String, enum: ['store_manager', 'assistant_manager', 'cashier', 'sales_associate', 'inventory_clerk', 'security', 'janitor', 'other'], required: false },
    status: { type: String, enum: ['active', 'terminated', 'on_leave', 'resigned'], default: 'active' },
    permission: { type: [String], enum: ['r:delivery-partner', 'w:delivery-partner', 'r:shop', 'w:shop', 'r:product', 'c:product', 'w:shop', 'r:category', 'c:category', 'w:category', 'r:customer', 'w:customer'] },
    startDate: { type: Date, required: false, },
    endDate: { type: Date },
    notes: [{
      date: { type: Date, default: Date.now },
      author: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      content: String
    }],
  }, {  timestamps: true, collection: 'staffs' });

export const staffModel = (db) => db.models.Staff || db.model('Staff', staffSchema);