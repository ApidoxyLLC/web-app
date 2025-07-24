import { z } from "zod";

// Allowed social platform names
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

const socialKeyEnum = z.enum(socialKeys);

// Accept either empty string or a valid URL
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
  .merge(
    z.record(socialKeyEnum, socialLinkValueSchema.optional())
  )
  .refine(
    (data) =>
      socialKeys.some((key) => typeof data[key] === "string" && data[key] !== ""),
    {
      message: "At least one social link must be provided",
      path: [""],
    }
  );

export default socialLinksDTOSchema;