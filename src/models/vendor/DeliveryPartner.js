import mongoose from "mongoose";


export const pathaoSchema = new mongoose.Schema({
    clientId: { type: String, required: true },
    clientSecret: { type: String, required: true },
    username: { type: String, required: true },
    password: { type: String, required: true },
}, { timestamps: true, _id: false });

export const steadfastSchema = new mongoose.Schema({
    apiKey: { type: String, required: true },
    apiSecret: { type: String, required: true },
}, { timestamps: true, _id: false  });