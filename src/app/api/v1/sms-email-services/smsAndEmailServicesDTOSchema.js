import { z } from "zod";

export const smsProviderDTOSchema = z.discriminatedUnion("provider", [
  z.object({
    provider: z.literal("bulk_sms_bd"),
    shop: z.string().min(1, "Shop ID is required"),
    apiKey: z.string().min(1, "API Key is required"),
    senderId: z.string().min(1, "Sender ID is required"),
    updatedAt: z.date().optional(),
  }),
  z.object({
    provider: z.literal("alpha_net_bd"),
    shop: z.string().min(1, "Shop ID is required"),
    apiKey: z.string().min(1, "API Key is required"),
    senderId: z.string().min(1, "Sender ID is required"),
    updatedAt: z.date().optional(),
  }),
  z.object({
    provider: z.literal("adn_diginet_bd"),
    shop: z.string().min(1, "Shop ID is required"),
    apiKey: z.string().min(1, "API Key is required"),
    senderId: z.string().min(1, "Sender ID is required"),
    clientId: z.string().min(1, "Client ID is required"),
    secretId: z.string().min(1, "Secret ID is required"),
    updatedAt: z.date().optional(),
  }),
]);

export const emailProviderDTOSchema = z.object({
  provider: z.literal("smtp"),
  shop: z.string().min(1, "Shop ID is required"),
  smtp: z.string().min(1, "SMTP Host is required"),
  port: z.coerce.number().min(1, "SMTP Port is required"),
  username: z.string().min(1, "SMTP Username is required"),
  password: z.string().min(1, "SMTP Password is required"),
  // fromEmail: z.string().email("Valid From Email is required"),
  updatedAt: z.date().optional(),
});
