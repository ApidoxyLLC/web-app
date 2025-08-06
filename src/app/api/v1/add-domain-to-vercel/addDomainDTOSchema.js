import { z } from 'zod';
import mongoose from 'mongoose'; 

export const addDomainDTOSchema = z.object({
    subdomain: z.string()
        .min(2)
        .max(63)
        .regex(/^[a-zA-Z0-9-]+$/, {
            message: "Subdomain can only contain letters, numbers, and hyphens"
        }),
    domain: z.string()
        .refine(val => [
            'apidoxy.com',
            'apidoxy.shop',
            'apidoxy.bazar',
            'apidoxy.net',
            'apidoxy.store',
            'appcommerz.com'
        ].includes(val), {
            message: "Invalid domain selection"
        }),
    shopId: z.string().min(1, "Shop ID is required")
        .refine(val => mongoose.Types.ObjectId.isValid(val), {
            message: "Invalid shop ID format"
        }),
});