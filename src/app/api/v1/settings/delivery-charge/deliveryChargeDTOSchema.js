const { z } = require('zod');

const deliveryChargeDTOSchema = z.object({
    shop: z.string().min(1, "Vendor is required"),
    isDefault: z.boolean().default(false),   
    isRefundable: z.boolean().default(false), 
    chargeBasedOn: z.enum(['zone', 'upazilla', 'district']).optional(),
    regionName: z.string().max(100).optional(), 
    charge: z.number().min(0, "Charge amount cannot be negative").default(0),
    partner: z.enum(['pathao', 'steadfast']).optional()
        .transform(val => val === "" ? undefined : val),
}).refine(data => {
    if (!data.isDefault && !data.regionName) {
        return false;
    }
    return true;
}, { message: "Region name is required unless it's default", path: ["regionName"] });

export default deliveryChargeDTOSchema;