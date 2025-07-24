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

const socialKeyEnum  = z.enum(socialKeys);

// Schema for the object
const socialLinksDTOSchema = z.object({ shop: z.string().min(1, { message: "Shop is required" }) })
                                    .merge( z.record(socialKeyEnum, z.string().url().optional()))
                                    .refine((data) => socialKeys.some((key) => typeof data[key] === "string" && data[key]),
                                                    { message: "At least one social link must be provided",
                                                         path: [""],  }
                                            );
export default socialLinksDTOSchema;