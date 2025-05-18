import { z } from "zod";

export const emailLoginSchema = z
  .object({
    email: z.string().email("Invalid email").required(),
    password: z.string().required()
              .min(6, "Password must be at least 6 characters")
              // temporary disable password complexity
              // .regex(/(?=.*[!@#$%^&*])/, "Password must contain at least one special character")
              // .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
              // .regex(/[a-z]/, "Password must contain at least one lowercase letter")
              // .regex(/[0-9]/, "Password must contain at least one number"),
  })

  export default registerSchema;