import { z } from 'zod';

const configurationDTOSchema = z.object({
  shop: z.string().min(1, "Shop ID is required"),
  businessName: z.string().min(1, "Business name cannot be empty").optional(),
  industry: z.string().min(1, "Industry cannot be empty").optional(),
  email: z.string().email("Invalid email format").optional(),
  phone: z
    .string()
    .regex(/^[\d+\-\s()]{7,15}$/, "Invalid phone number")
    .optional(),
  country: z.string().min(2, "Country name is too short").optional(),
  address: z.string().min(5, "Address is too short").optional(),
});
export default configurationDTOSchema; 