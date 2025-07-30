import { z } from 'zod';

const policyDTOSchema = z.object({
  shop: z.string().min(1, "Shop ID is required"),
  policies: z.string().min(1, "Business name cannot be empty").optional()
});
export default policyDTOSchema; 