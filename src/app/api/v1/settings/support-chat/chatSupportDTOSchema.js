import { z } from 'zod';

const chatSupportDTOSchema = z.object({
  shop: z.string(),
  provider: z.enum(['facebook', 'whatsapp']),
  link: z.string().url(),
});
export default chatSupportDTOSchema