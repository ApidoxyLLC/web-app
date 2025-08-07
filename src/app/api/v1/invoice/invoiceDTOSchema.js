import { z } from 'zod';

const invoiceDTOSchema = z.object({
    planSlug: z.string({
        required_error: "Plan slug is required",
        invalid_type_error: "Plan slug must be a string"
    }).min(1, "Plan slug cannot be empty"),

    duration: z.enum(["monthly", "yearly"], {
        errorMap: () => ({ message: 'Duration must be either "monthly" or "yearly"' }),
    }),
    shopReferenceId: z.string({
        required_error: "Shop reference ID is required",
        invalid_type_error: "Shop reference ID must be a string"
    }).min(1, "Shop reference ID cannot be empty"),
    // Optional fields if needed
    couponCode: z.string().optional(),
    metadata: z.record(z.unknown()).optional()
}).strict();

export default invoiceDTOSchema;