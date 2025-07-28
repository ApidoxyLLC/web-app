import { z } from 'zod';

export const addDomainDTOSchema = z.object({
    domain: z.string().min(1, 'Domain is required'),
    txtRecordValue: z.string().optional(), // or z.string().min(1) if required
});
export default addDomainDTOSchema;