import { z } from 'zod';

export const notificationDTOSchema = z.object({
  triggerBasis: z.enum(['hourly', 'order']),
  count: z.string().min(1, 'Count is required and must be at least 1'),
  notifyVia: z.array(z.enum(['email', 'sms', 'whatsapp'])).min(1, 'At least one notification method is required'),
  email: z.string().email('Invalid email').optional().nullable(),
  phone: z.string().optional(),
  whatsapp: z.string().optional(),
})
.refine((data) => {
  // Contact info must be provided for each selected notifyVia method
  return data.notifyVia.every((method) => {
    if (method === 'email') return !!data.email;
    if (method === 'sms') return !!data.phone;
    if (method === 'whatsapp') return !!data.whatsapp;
    return true;
  });
}, {
  message: 'Missing contact info for selected notifyVia methods',
});
export default notificationDTOSchema;
