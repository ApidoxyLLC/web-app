import mongoose from "mongoose";

export const bulkSmsBdSchema = new mongoose.Schema({
    apiKey: { type: String, required: true },
    senderId: { type: String, required: true },
}, { timestamps: true, _id: false });

export const alphaNetBdSchema = new mongoose.Schema({
    apiKey: { type: String, required: true },
    senderId: { type: String, required: true },
}, { timestamps: true, _id: false });

export const adnDiginetBdSchema = new mongoose.Schema({
    apiKey: { type: String, required: true },
    senderId: { type: String, required: true },
    clientId: { type: String, required: true },
    secretId: { type: String, required: true },
}, { timestamps: true, _id: false });
