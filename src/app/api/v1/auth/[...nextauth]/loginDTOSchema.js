import { z } from "zod";

export const emailLoginSchema = z.object({
  email: z.string().email("Invalid email"),
  password: z
    .string()
    .min(6, "Password must be at least 6 characters")
    // Uncomment the below lines to enforce password complexity
    // .regex(/(?=.*[!@#$%^&*])/, "Password must contain at least one special character")
    // .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
    // .regex(/[a-z]/, "Password must contain at least one lowercase letter")
    // .regex(/[0-9]/, "Password must contain at least one number"),
});

  export default emailLoginSchema;