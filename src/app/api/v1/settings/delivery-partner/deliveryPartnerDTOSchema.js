import { z } from "zod";

// Discriminated union using "partner" as the key
export const deliveryPartnerDTOSchema = z.discriminatedUnion("partner", [
  z.object({
    partner: z.literal("pathao"),
    shop: z.string().min(1, "Shop ID is required"),
    clientId: z.string().min(1, "clientId is required"),
    clientSecret: z.string().min(1, "clientSecret is required"),
    username: z.string().min(1, "username is required"),
    password: z.string().min(1, "password is required"),
  }),
  z.object({
    partner: z.literal("steadfast"),
    shop: z.string().min(1, "Shop ID is required"),
    apiKey: z.string().min(1, "apiKey is required"),
    apiSecret: z.string().min(1, "apiSecret is required"),
  }),
]);

export default deliveryPartnerDTOSchema;