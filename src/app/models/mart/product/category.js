import mongoose from "mongoose";
import { Schema } from "mongoose";

const categorySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
    },
    slug: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      match: /^[a-z0-9]+(?:-[a-z0-9]+)*$/, // e.g., "men-shirts"
    },
    description: {
      type: String,
      trim: true,
    },
    parentCategory: {
      type: Schema.Types.ObjectId,
      ref: 'categories',
      default: null,
    },
    isLeaf: {
      type: Boolean,
      default: true, // for faster filtering when building nested categories
    },
    level: {
      type: Number,
      default: 1, // root = 1, children = 2, etc.
    },
    image: {
      url: String,
      alt: String,
    },
    icon: {
      type: String, // Can be a font-awesome class or a custom icon reference
    },
    meta: {
      title: { type: String, trim: true },
      description: { type: String, trim: true },
      keywords: [{ type: String }],
    },
    sortOrder: {
      type: Number,
      default: 0,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    isFeatured: {
      type: Boolean,
      default: false,
    },
    allowedVendors: [
      {
        type: Schema.Types.ObjectId,
        ref: 'Vendor', // Allows category visibility per vendor
      },
    ],
  },
  {
    timestamps: true,
    collection: 'categories'
  }
);
export const Category = mongoose.models.categorySchema || mongoose.model("Category", categorySchema, 'categories');
export default Category;