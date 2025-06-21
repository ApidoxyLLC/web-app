import { z } from 'zod';
import mongoose from 'mongoose';

export const couponDTOSchema = z.object({
           code: z.string().min(3).max(50),
         userId: z.string().cuid().optional(),
      productId: z.string().cuid().optional(),
     categoryId: z.string().cuid().optional(),
  cartMinAmount: z.coerce.number().min(0).optional(),
        country: z.string().max(2).optional(),
         region: z.string().max(50).optional(),
     postalCode: z.string().max(20).optional(),
  paymentMethod: z.enum(['cod', 'bkash', 'bank_transfer']).optional(),
});

export default couponDTOSchema;