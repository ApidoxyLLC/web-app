const { z } = require('zod');

const deliveryChargeEditDTOSchema = z.object({
       chargeId: z.string(),
  chargeBasedOn: z.enum(['zone', 'upazilla', 'district']).default(undefined).optional(),
     regionName: z.string().default(undefined).optional(),
         charge: z.number().min(0, "Charge amount cannot be negative").default(undefined).optional(),
        partner: z.enum(['pathao', 'steadfast']).optional().default(undefined),
});
export default deliveryChargeEditDTOSchema;