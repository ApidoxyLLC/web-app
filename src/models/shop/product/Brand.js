import mongoose from 'mongoose';

const imageSchema = new mongoose.Schema({
            url: { type: String, required: [true, 'Logo URL is required'], match: [/^https?:\/\/.+\..+$/, 'Please use a valid URL'] },
        altText: { type: String, default: 'Brand logo' }
}, { _id: false });

const socialLinksSchema = new mongoose.Schema({
       platform: { type: String, enum: ['facebook', 'twitter', 'telegram', 'discord', 'whatsapp', 'instagram', 'linkedin', 'youtube', 'tiktok']  },
           link: { type: String },
}, { _id: false });

const metaInfoSchema = new mongoose.Schema({
          title: String,
    description: String,
       keywords: [String]
}, { _id: false });

export const brandSchema = new mongoose.Schema({
          title: { type: String, required: true, unique: true, trim: true },
           slug: { type: String, required: true, unique: true, lowercase: true },
    description: { type: String, default: '' }, 
           logo: { type: imageSchema, default: undefined},
        website: { type: String, default: '', match: [/^https?:\/\/.+\..+$/, 'Please use a valid URL']},
    socialLinks: { type: [socialLinksSchema], default: undefined},
         status: { type: String, enum: ['active', 'inactive', 'archived'], default: 'active' },       
           meta: { type: metaInfoSchema, default: undefined},
       products: { type: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Product' }], default: undefined},
      createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
      updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User'}
}, { timestamps: true });


