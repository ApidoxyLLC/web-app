import { z } from "zod";

export const smsProviderDTOSchema = z.discriminatedUnion("provider", [
  z.object({
    provider: z.literal("bulk_sms_bd"),
    shop: z.string().min(1, "Shop ID is required"),
    apiKey: z.string().min(1, "API Key is required"),
    senderId: z.string().min(1, "Sender ID is required"),
  }),
  z.object({
    provider: z.literal("alpha_net_bd"),
    shop: z.string().min(1, "Shop ID is required"),
    apiKey: z.string().min(1, "API Key is required"),
    senderId: z.string().min(1, "Sender ID is required"),
  }),
  z.object({
    provider: z.literal("adn_diginet_bd"),
    shop: z.string().min(1, "Shop ID is required"),
    apiKey: z.string().min(1, "API Key is required"),
    senderId: z.string().min(1, "Sender ID is required"),
    clientId: z.string().min(1, "Client ID is required"),
    secretId: z.string().min(1, "Secret ID is required"),
  }),
]);

export default smsProviderDTOSchema;
