import { z } from "zod";

function resolveIdentifierType(identifier) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const phoneRegex = /^\+?\d{10,15}$/;

  if (emailRegex.test(identifier)) return "email";
  if (phoneRegex.test(identifier)) return "phone";
  return "username";
}

export const loginDTOSchema = z.object({
 fingerprint: z.string().length(32, 'Invalid fingerprint ID length')
                .regex(/^[a-f0-9]{32}$/, 'Invalid fingerprint ID format'),
   userAgent: z.string().optional(),
    timezone: z.string().optional(),
  identifier: z.string(),
    password: z.string()
               .min(6, "Password must be at least 6 characters")
                // Uncomment the below lines to enforce password complexity
              // .regex(/(?=.*[!@#$%^&*])/, "Password must contain at least one special character")
              // .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
              // .regex(/[a-z]/, "Password must contain at least one lowercase letter")
              // .regex(/[0-9]/, "Password must contain at least one number"),
}).transform(data => {
  const trimmedIdentifier = data.identifier.trim();
  const type = resolveIdentifierType(trimmedIdentifier);

  if (!['email', 'phone', 'username'].includes(type)) {
    throw new Error("Invalid identifier type");
  }

  return {
        identifier: trimmedIdentifier,
          password: data.password,
    identifierName: type,
       fingerprint: data.fingerprint,
         userAgent: data.userAgent,
          timezone: data.timezone
  };
})

  export default loginDTOSchema;