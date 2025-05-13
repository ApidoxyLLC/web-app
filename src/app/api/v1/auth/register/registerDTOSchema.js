import { z } from "zod";


export const registerSchema = z
  .object({
    name: z.string().min(1, "Name is required"),
    email: z.string().email("Invalid email").optional(),
    phone: z
      .string()
      .regex(/^\+?[1-9]\d{1,14}$/, "Invalid phone number") 
      .optional(),
    password: z.string()
              .min(6, "Password must be at least 6 characters")
              // temporary disable password complexity
              // .regex(/(?=.*[!@#$%^&*])/, "Password must contain at least one special character")
              // .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
              // .regex(/[a-z]/, "Password must contain at least one lowercase letter")
              // .regex(/[0-9]/, "Password must contain at least one number"),
  })
  .refine((data) => data.email || data.phone, {
    message: "Either email or phone is required",
    path: ["email"], // Show message under "email" field
  })
  // .refine(data => !(data.email && data.phone), {
  //   message: "Provide either email or phone, not both",
  //   path: ["phone"],
  // });

  export default registerSchema;