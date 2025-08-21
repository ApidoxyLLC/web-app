import { z } from 'zod';

export const cartDTOSchema = z.object({
    productId: z.string().min(1, "Product ID is required"),
    variantId: z.string().optional(),
     quantity: z.number().int().min(1, "Quantity must be at least 1").optional(),
       action: z.enum(['inc', 'dec', '+', '-']),
//   fingerprint: z.string().optional(),
       coupon: z.string().optional(),        // can be inferred from user session too
});

export default cartDTOSchema