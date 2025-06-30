import { z } from "zod";

<<<<<<< HEAD
export const otpLoginDTOSchema = z.object({ phone: z.string().regex(/^\+?[1-9]\d{1,14}$/, "Invalid phone number"),
                                              otp: z.number().min(100000).max(999999),  
                                      fingerprint: z.string()
                                                    // .regex(/^[a-f0-9]{32}$/, 'Invalid fingerprint ID format')
                                                    .length(32, 'Invalid fingerprint ID length'),                                                           
                                        userAgent: z.string().optional(),
                                         timezone: z.string().optional()     })
  export default otpLoginDTOSchema;
=======
export const otpLoginDTOSchema = z.object({
  phone: z.string().regex(/^\+?[1-9]\d{1,14}$/, "Invalid phone number"),
  otp: z.min(100000).max(999999),
  fingerprint: z
    .string()
    // .regex(/^[a-f0-9]{32}$/, 'Invalid fingerprint ID format')
    .length(32, "Invalid fingerprint ID length"),
  userAgent: z.string().optional(),
  timezone: z.string().optional(),
});
export default otpLoginDTOSchema;
>>>>>>> 67dd9e36d76b91a09ed8d5a286155f41c0c66dab
