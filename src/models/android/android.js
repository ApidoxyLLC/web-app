import mongoose from 'mongoose';

const androidSchema = new mongoose.Schema({
    themeName: {
        type: String,
        required: true
    },
    appName: {
        type: String,
        required: true
    },
    packageName: {
        type: String,
        required: true
    },
    versionCode: {
        type: String,
        required: true
    },
    color: {
        type: String,
        required: true
    },
    buildStatus: {
        type: Number,
        default: 0,  // 0: pending, 1: success, -1: error
        enum: [-1, 0, 1]
    },
    buildMessageType: {
        type: String,
        enum: ['error', 'pending', 'success'],
        default: 'pending'
    },
    buildMessage: {
        type: String,
        default: 'Build initiated'
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    updatedAt: {
        type: Date,
        default: Date.now
    },
    downloadUrl: {
        type: String,
        default: null
    }
}, { timestamps: true, collection: 'staffs' });

export const androidModel = (db) => db.models.Android || db.model('Android', androidSchema);