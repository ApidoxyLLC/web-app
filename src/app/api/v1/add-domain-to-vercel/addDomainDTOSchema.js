import { z } from 'zod';

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
            'apidoxy.store'
        ].includes(val), {
            message: "Invalid domain selection"
        })
});