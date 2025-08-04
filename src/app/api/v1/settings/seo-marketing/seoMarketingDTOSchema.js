import { z } from "zod";

export const marketingDTOSchema = z.object({
    shop: z.string().min(1, "Shop ID is required"),
    googleTagManager: z
        .object({
            gtmId: z.string().min(1, "GTM ID is required"),
        })
        .optional(),
    facebookPixel: z
        .object({
            pixelId: z.string().min(1, "Pixel ID is required"),
            accessToken: z.string().min(1, "Pixel Access Token is required"),
            testEventId: z.string().optional(),
        })
        .optional(),
}).refine((data) => data.googleTagManager || data.facebookPixel, {
    message: "At least one provider must be configured",
});
