import mongoose from "mongoose";

export const reviewSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  rating: { type: Number, required: true, min: 1, max: 5 },
  name: { type: String,  maxlength: 100 },
  image: { type: String },
  comment: { type: String, trim: true, maxlength: 1000 },
  verifiedPurchase: { type: Boolean, default: false },
  helpfulCount: { type: Number, default: 0 },
  status: { type: String, default: 'pending',
            enum: ['pending', 'approved', 'rejected'] },
  response: {
    text: String,
    respondedAt: Date,
    responderId: { type: mongoose.Schema.Types.ObjectId, ref: 'Review' }
  }
}, { 
  timestamps: true,
  collection: 'reviews' 
});