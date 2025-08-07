
import z from "zod";

export const verifyPhoneDTOSchema = z.object({
  phone: z.string().min(10, "Phone number must be at least 10 characters").max(20),
    otp: z.string().length(process.env.END_USER_PHONE_OTP_LENGTH,  `OTP must be ${process.env.END_USER_PHONE_OTP_LENGTH} characters`)
});
export default verifyPhoneDTOSchema;