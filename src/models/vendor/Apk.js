// models/apk/Apk.js
import mongoose from 'mongoose';

const ApkFileInfoSchema = new mongoose.Schema({
  size: { type: Number, required: true },
  version: { type: String, required: true },
  releaseNotes: { type: String, required: true },
  originalName: { type: String, required: true },
  downloadCount: { type: Number, default: 0 },
  minSdkVersion: { type: String },
  targetSdkVersion: { type: String },
  packageName: { type: String },
  sha256Hash: { type: String }
});

const ApkSchema = new mongoose.Schema({
  provider: { type: String, required: true, default: 'b2' }, // e.g., 'b2' for Backblaze
  uploadBy: { type: mongoose.Schema.Types.ObjectId, required: true, ref: 'User' },
  fileName: { type: String, required: true },
  fileId: { type: String, required: true },
  fileInfo: { type: ApkFileInfoSchema, required: true },
  shopId: { type: mongoose.Schema.Types.ObjectId, required: true, ref: 'Vendor' },
  folder: { type: String, required: true, default: 'apks' },
  backblazeUrl: { type: String, required: true },
  mimeType: { type: String, required: true },
  isActive: { type: Boolean, default: false },
  version: { type: String, required: true },
  releaseNotes: { type: String, required: true },
  bucketId: { type: String, required: true },
  bucketName: { type: String, required: true }
}, { timestamps: true, collection: 'apks' });

export const apkModel = (db) => db.models.Image || db.model('Apk', ApkSchema);  
export default apkModel