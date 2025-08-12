import mongoose from "mongoose";


export const deleteInfoSchema = new mongoose.Schema({
                 isDeleted: { type: Boolean, default: undefined },
                 deletedAt: { type: Date, default: undefined },
                 deletedBy: { type: mongoose.Schema.Types.ObjectId, default: undefined },
        isDeleteFromBucket: { type: Boolean, default: undefined },
}, { timestamps: false, _id: false });



export const imageSchema = new mongoose.Schema({
                       _id: { type: mongoose.Schema.Types.ObjectId, required: true },
                  provider: { type: String, enum: ['b2', 's3',
                    'cloudinary', 'local'], default:'b2' },
                  fileName: { type: String, required: true },
                    fileId: { type: String, required: true },
                  fileInfo: { type: mongoose.Schema.Types.Mixed },
                    shopId: { type: mongoose.Schema.Types.ObjectId, default: undefined },
             shopReference: { type: String, default: undefined },
              backblazeUrl: { type: String },
                  mimeType: { type: String, default: undefined }, 
                    folder: { type: String, default: undefined },
                  bucketId: { type: String, default: undefined },
                bucketName: { type: String, default: undefined },
                  uploadBy: { type: mongoose.Schema.Types.ObjectId },
                deleteInfo: { type: deleteInfoSchema, default: undefined }
}, { collection: 'images', timestamps: true });

export const imageModel = (db) => db.models.Image || db.model('Image', imageSchema);  