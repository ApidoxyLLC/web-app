import mongoose from 'mongoose';

const bucketSchema = new mongoose.Schema({
        bucketName: { type: String, required: true, unique: true },
          bucketId: { type: String, required: true, unique: true },
        bucketType: { type: String, required: true, enum: ['allPrivate', 'allPublic'], default: 'allPrivate' },
         createdBy: { type: mongoose.Schema.Types.ObjectId, required: false, ref: 'User' },
            shopId: { type: mongoose.Schema.Types.ObjectId, required: false, ref: 'Shop' },
}, {
  timestamps: true, collection: 'buckets'
});

export const bucketModel = (db) => db.models.BucketModel || db.model('BucketModel', bucketSchema);
