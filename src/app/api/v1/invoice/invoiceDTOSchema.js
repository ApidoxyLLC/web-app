import { z } from 'zod';

const invoiceDTOSchema = z.object({
    userId: z.string().min(1, "User ID is required"),
    planId: z.string().min(1, "Plan ID is required"),
    duration: z.enum(["monthly", "yearly"], {
        errorMap: () => ({ message: 'Duration must be either "monthly" or "yearly"' }),
    }),
});
export default invoiceDTOSchema;