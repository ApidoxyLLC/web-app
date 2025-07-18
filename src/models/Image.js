import mongoose from "mongoose";

export const imageSchema = new mongoose.Schema({
                  provider: { type: String, enum: ['b2', 's3', 'cloudinary', 'local'], default:'b2' },
                  fileName: { type: String, required: true },
                    fileId: { type: String, required: true },
                  fileInfo: { type: mongoose.Schema.Types.Mixed },
                    shopId: { type: String },
               downloadUrl: { type: String },
                    folder: { type: String },
                  bucketId: { type: String },
                bucketName: { type: String },
        authorizationToken: { type: String },
       authorizationExpiry: { type: Number }
}, { collection: 'images', timestamps: true });

export const imageModel = (db) => db.models.Image || db.model('Image', imageSchema);