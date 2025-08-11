import z from 'zod';

const variantSchema = z.object({
  name: z.string(),
  options: z.array(z.string().min(1)).min(1, "At least one option is required"),
});

const imageObjectSchema = z.object({
  id: z.number().default(0).optional(),
  fileName: z.string().min(1, { message: 'fileName is required when id is not provided' }).optional(),
  alt: z.string().optional(),
  position: z.number().optional(),
}).refine(  data => typeof data.id === 'number' || (data.fileName && data.fileName.trim() !== ''), { message: 'Either id or fileName must be provided' } );

const productDTOSchema = z.object({
  shop: z.string(),

  title: z.string().min(1, { message: 'Title is required' }),
  description: z.string().min(1, { message: 'Description is required' }),

  gallery: z.array(imageObjectSchema).optional().default([]), 

  category: z.string().optional().or(z.literal('')),

  isPhysical: z.boolean(),

  weight: z.number().min(0, { message: 'Weight cannot be negative' }).refine((val, ctx) => {
      const unit = ctx?.parent?.weightUnit;
      const kg = unit === 'g' ? val / 1000 : unit === 'mg' ? val / 1_000_000 : val;
      return kg <= 1000;
    }, { message: 'Weight must not exceed 1000kg' }),

  weightUnit: z.enum(['mg', 'g', 'kg']),
  price: z.number().nonnegative(),
  compareAtPrice: z.number().optional(),
  costPerItem: z.number().optional(),
  profit: z.number().optional(),
  margin: z.number().optional(),
  sellWithOutStock: z.boolean().optional(),
  sku: z.string().optional(),
  barcode: z.string().optional(),
  isFreeShiping: z.boolean().optional(),
  variants: z .array(
      z.object({
        name: z.string(),
        options: z.array(z.string().min(1)).min(1),
      })
    ).optional().default([]),
  status: z.enum(['draft', 'active', 'archived']).default('draft'),
  type: z.string().optional(),
  vendor: z.string().optional(),
  tags: z.array(z.string()).optional(),
});


export default productDTOSchema;