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

export const smtpSchema = new mongoose.Schema({
    host: { type: String, required: true },
    port: { type: Number, required: true },
    user: { type: String, required: true },
    password: { type: String, required: true },
    fromEmail: { type: String, required: true },
}, { timestamps: true, _id: false });
