const { z } = require("zod");  // For CommonJS (Node.js)
// OR: import { z } from "zod";  // For ES Modules

const socialKeys = [
  "facebook",
  "linkedin",
  "youtube",
  "twitter",
  "tiktok",
  "telegram",
  "whatsApp",
  "discord",
  "instagram",
];

// Schema for a single social link (empty string or valid URL)
const socialLinkValueSchema = z
  .string()
  .refine(
    (val) => val === "" || z.string().url().safeParse(val).success,
    { message: "Must be a valid URL or an empty string" }
  );

// Final schema
const socialLinksDTOSchema = z
  .object({
    shop: z.string().min(1, { message: "Shop is required" }),
  })
  .extend(  // `.merge()` also works, but `.extend()` is more explicit
    Object.fromEntries(
      socialKeys.map((key) => [key, socialLinkValueSchema.optional()])
    )
  )
  .refine(
    (data) => socialKeys.some((key) => data[key] && data[key] !== ""),
    {
      message: "At least one social link must be provided",
    }
  );

export default socialLinksDTOSchema;