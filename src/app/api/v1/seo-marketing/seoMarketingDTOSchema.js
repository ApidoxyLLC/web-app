import { z } from "zod";

export const googleTagManagerDTOSchema = z.object({
    type: z.literal("google_tag_manager"),
    shop: z.string().min(1, "Shop ID is required"),
    gtmId: z.string().min(1, "GTM ID is required"),
});


export const facebookPixelDTOSchema = z.object({
    type: z.literal("facebook_pixel"),
    shop: z.string().min(1, "Shop ID is required"),
    pixelId: z.string().min(1, "Pixel ID is required"),
    accessToken: z.string().min(1, "Pixel Access Token is required"),
    testEventId: z.string().optional(),
});
