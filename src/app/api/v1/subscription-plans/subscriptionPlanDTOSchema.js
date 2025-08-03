import { z } from "zod";

const servicesSchema = z.object({
  website: z.object({
    subdomains: z.number().min(0).default(1),
    customDomains: z.number().min(0).default(0)
  }),
  androidBuilds: z.number().min(0).default(1),
  paymentGateways: z.number().min(0).default(1),
  deliveryGateways: z.number().min(0).default(1),
  smsGateways: z.number().min(0).default(1),
  userAccess: z.number().min(0).default(0),
  pushNotifications: z.number().min(0).default(500),
  products: z.number().min(0).default(15)
});

export const subscriptionPlanDTOSchema = z.object({
  name: z.enum(["PLAN A", "PLAN B", "PLAN C"]),
  slug: z.string().min(1, "Slug is required"),
  price: z.number().default(0),
  monthly: z.number().min(1, "Monthly duration is required"),
  yearly: z.number().min(1, "Yearly duration is required"),
  services: servicesSchema
});