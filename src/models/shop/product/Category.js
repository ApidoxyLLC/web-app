import cuid from '@bugsnag/cuid';
import mongoose from 'mongoose';
import imageSchema from '@/models/imageSchema';

const categorySchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true },
  slug: { type: String, required: true, unique: true, lowercase: true, trim: true, match: /^[a-z0-9_-]+$/ },
  description: { type: String, default: '' },
  // image: { url: { type: String }, alt: { type: String }, width: Number, height: Number },
  image: { type: imageSchema, default: null},


  isActive: { type: Boolean, default: true },

  // Hierarchy
  parent: { type: mongoose.Schema.Types.ObjectId, ref: 'Category', default: null },
  ancestors: [ { type: mongoose.Schema.Types.ObjectId, ref: 'Category' } ],
  children: { type: [ { type: mongoose.Schema.Types.ObjectId, ref: 'Category' } ], default: [] },
  level: { type: Number, default: 1 },
  // position: { type: Number, default: 0}, 
  
  // SEO
  metaTitle: { type: String, trim: true, maxlength: [70, 'Meta title cannot exceed 70 characters'] },
  metaDescription: { type: String, trim: true, maxlength: [160, 'Meta description cannot exceed 160 characters'] },
  keywords: [String],
  metadata: { type: Map, of: String, default: {} },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }

}, { timestamps: true, collection: 'categories' });

export const categoryModel = (db) => db.models.Category || db.model('Category', categorySchema);