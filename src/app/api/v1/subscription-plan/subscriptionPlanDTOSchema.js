import { z } from 'zod';

const durationSchema = z.object({
  monthly: z.number().min(1),
  yearly: z.number().min(1),
});

const servicesSchema = z.object({
  website: z.object({
    subdomains: z.number().nonnegative(),
    customDomains: z.number().nonnegative()
  }),
  androidBuilds: z.number().nonnegative(),
  iosBuilds: z.number().nonnegative(),
  paymentGateways: z.number().nonnegative(),
  deliveryGateways: z.number().nonnegative(),
  smsGateways: z.number().nonnegative(),
  userAccess: z.number().nonnegative(),
  pushNotifications: z.union([z.string(), z.number()]),
  products: z.string()
});

const subscriptionPlanDTOSchema = z.object({
  name: z.enum(['PLAN A', 'PLAN B', 'PLAN C']),
  slug: z.string().min(1, "Slug is required"), 
  price: z.number().nonnegative(),
  duration: durationSchema,
  services: servicesSchema
});

export default subscriptionPlanDTOSchema;
