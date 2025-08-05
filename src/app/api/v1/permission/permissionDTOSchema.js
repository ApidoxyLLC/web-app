import { z } from 'zod';

const permissionDTOSchema = z.object({
  shop: z.string().min(1, "Shop reference is required"),
  action: z.enum(['grant-permission', 'remove-permission']).default('grant-permission'),
  userId: z.string().min(1, "User is required"), 
});

export default permissionDTOSchema;