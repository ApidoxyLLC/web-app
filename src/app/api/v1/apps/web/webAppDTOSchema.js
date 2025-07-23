import { z } from 'zod';

export const webAppDTOSchema = z.object({
  shop: z.string(),
  title: z.string(),
  logo: z.string().optional(),
  metaDescription: z.string().optional(),
  metaTags: z.string().optional(),
});

export default webAppDTOSchema;