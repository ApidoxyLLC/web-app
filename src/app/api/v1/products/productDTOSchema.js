import z from 'zod';

const variantSchema = z.object({
  name: z.string(),
  options: z.array(z.string().min(1)).min(1, "At least one option is required"),
});

const productDTOSchema = z.object({
  shop: z.string().min(1, "Shop reference is required"),
  title: z.string().min(1, "Title is required").max(100, "Title too long"),
  description: z.string().max(2000, "Description too long").optional(),
  images: z.array(z.string().url("Invalid image URL")).max(20, "Too many images").optional(),
  category: z.preprocess(val => val === "" ? undefined : val, z.string().max(64, "Category too long")).optional(),
  isPhysical: z.boolean().default(true),
  weight: z.number().positive("Weight must be positive").max(1000, "Weight too high").optional(),
  weightUnit: z.enum(['kg', 'g', 'lb', 'og']).default('kg').optional(),
  price: z.number().positive("Price must be positive").max(1000000, "Price too high"),
  compareAtPrice: z.number().positive().max(1000000).optional(),
  costPerItem: z.number().positive().max(1000000).optional(),
  profit: z.number().optional(),
  margin: z.number().min(0).max(100).optional(),
  sellWithOutStock: z.boolean().default(false),
  sku: z.string().min(1, "SKU is required").max(50, "SKU too long"),
  barcode: z.string().max(50, "Barcode too long").optional(),
  isFreeShiping: z.boolean().default(false),
  variants: z.array(variantSchema).optional(),
  status: z.enum(["draft", "active", "archived"]).default("draft"),
  type: z.string().max(50).optional(),
  vendor: z.string().max(50).optional(),
  tags: z.array(z.string().max(20)).max(20, "Too many tags").optional(),
});


export default productDTOSchema;