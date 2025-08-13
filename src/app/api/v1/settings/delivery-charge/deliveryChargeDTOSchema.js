const { z } = require('zod');

const deliveryChargeDTOSchema = z.object({
           shop: z.string().min(1, "Vendor is required"),
  chargeBasedOn: z.enum(['zone', 'upazilla', 'district']).default('district'),
     regionName: z.string().min(1, "Region name is required").max(100, "Region name must be 100 characters or less"),
         charge: z.number().min(0, "Charge amount cannot be negative").default(0),
        partner: z.enum(['pathao', 'steadfast']).optional().transform(val => val === "" ? undefined : val),
});
export default deliveryChargeDTOSchema;