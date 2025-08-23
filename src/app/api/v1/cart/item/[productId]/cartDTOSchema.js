import { z } from 'zod';

export const cartDTOSchema = z.object({
//     productId: z.string().min(1, "Product ID is required"),
    variantId: z.string().optional(),
     quantity: z.number().int().optional(),
       action: z.enum(['inc', 'dec', '+', '-', 'checked', 'unchecked']),
       coupon: z.string().optional()
});

export default cartDTOSchema