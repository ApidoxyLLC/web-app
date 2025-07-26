import mongoose from "mongoose";


export const bkashSchema = new mongoose.Schema({
    marchantAppKey: { type: String, required: true },
    marchantSecretKey: { type: String, required: true },
    marchantUsername: { type: String, required: true },
    marchantPassword: { type: String, required: true },
}, { timestamps: true, id: false });