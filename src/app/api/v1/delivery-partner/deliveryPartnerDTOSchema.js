import { z } from "zod";

// Flattened discriminated union
export const deliveryPartnerDTOSchema = z.discriminatedUnion("type", [
  z.object({
    partner: z.literal("pathao"),
    shop: z.string().min(1, "Shop ID is required"),
    clientId: z.string().min(1, "clientId is required"),
    clientSecret: z.string().min(1, "clientSecret is required"),
    username: z.string().min(1, "username is required"),
    password: z.string().min(1, "password is required"),
  }).strict(), // Optional: Rejects extra fields
  z.object({
    partner: z.literal("steadfast"),
    shop: z.string().min(1, "Shop ID is required"),
    apiKey: z.string().min(1, "apiKey is required"),
    apiSecret: z.string().min(1, "apiSecret is required"),
  }).strict(), // Optional: Rejects extra fields
]);

export default deliveryPartnerDTOSchema;