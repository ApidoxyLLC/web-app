import { z } from 'zod';

// Helper schemas
const discountSchema = z.object({
  type: z.enum(['fixed', 'percentage']).optional(),
  value: z.number().min(0).optional()
}).strict();

const priceSchema = z.object({
  currency: z.enum(['BDT', 'USD', 'EUR', 'GBP']).optional(),
  base: z.number().min(0),
  compareAt: z.number().min(0).optional(),
  cost: z.number().min(0).optional(),
  discount: discountSchema.optional(),
  minPrice: z.number().min(0).optional(),
  maxPrice: z.number().min(0).optional()
}).strict();

const attributeSchema = z.object({
  name: z.string().min(1),
  value: z.string().min(1)
}).strict();

const variantSchema = z.object({
  title: z.string().min(1),
  options: z.array(attributeSchema).optional(),
  price: priceSchema.optional(),
  priceVaries: z.boolean().optional(),
  weight: z.number().optional(),
  sku: z.string().optional(),
  barcode: z.string().optional(),
  isAvailable: z.boolean().optional(),
  requiresShipping: z.boolean().optional(),
  taxable: z.boolean().default(true)
}).strict();

const detailSchema = z.object({
  material: z.string().optional(),
  fit: z.string().optional(),
  fabricWeight: z.string().optional(),
  neckLine: z.string().optional(),
  madeIn: z.string().optional(),
  dimensions: z.string().optional(),
  careInstructions: z.string().optional()
}).strict();

const imageSchema = z.object({
  id: z.number().default(0),
  url: z.string().url(),
  alt: z.string().optional(),
  position: z.number().optional()
}).strict();

const mediaSchema = z.object({
  type: z.enum(['image', 'video', 'document']),
  url: z.string().url(),
  about: z.string().optional()
}).strict();

const shippingSchema = z.object({
  weight: z.number().optional(),
  dimensions: z.object({
    length: z.number(),
    width: z.number(),
    height: z.number()
  }).optional(),
  freeShipping: z.boolean().default(false),
  shippingClass: z.string().optional()
}).strict();

const digitalAssetSchema = z.object({
  name: z.string().min(1),
  url: z.string().url(),
  mimeType: z.string().optional(),
  accessLimit: z.number().optional(),
  expiry: z.date().optional()
}).strict();

// Main product schema
export const productDTOSchema = z.object({
  title: z.string().min(1, "Title is required").max(200),
  slug: z.string().regex(/^[a-z0-9\-]+$/, "Invalid slug format").optional(),
  description: z.string().optional(),
  tags: z.array(z.string()).optional(),
  gallery: z.array(imageSchema).optional(),
  otherMediaContents: z.array(mediaSchema).optional(),
  price: priceSchema,
  thumbnail: z.string().url(),
  options: z.array(z.enum(["size", "color", "material"])).optional(),
  details: detailSchema.optional(),
  categories: z.array(z.string().refine(val => mongoose.Types.ObjectId.isValid(val), {
    message: "Invalid category ID"
  })).optional(),
  hasVariants: z.boolean().default(false),
  isAvailable: z.boolean().optional(),
  warranty: z.object({
    duration: z.number(),
    terms: z.string()
  }).optional(),
  status: z.enum(['active', 'draft', 'archived', 'discontinued']).default('draft'),
  approvalStatus: z.enum(['pending', 'approved', 'rejected']).default('pending'),
  productFormat: z.enum(['physical', 'digital']).default('physical'),
  digitalAssets: z.array(digitalAssetSchema).optional(),
  brand: z.string().refine(val => mongoose.Types.ObjectId.isValid(val), {
    message: "Invalid brand ID"
  }).optional(),
  shipping: shippingSchema.optional(),
  variants: z.array(variantSchema).optional(),
  vendorId: z.string().min(1, "Vendor ID is required")
}).strict();


export default productDTOSchema;