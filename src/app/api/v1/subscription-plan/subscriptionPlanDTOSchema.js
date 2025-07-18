import { z } from "zod";

const maxLimitSchema = z.object({
         customDomains: z.number().default(0),
            subDomains: z.number().default(1),
                 shops: z.number().default(1),
                  apps: z.object({ android: z.number().default(1),
                                       web: z.number().default(1),
                                       ios: z.number().default(0), }).default({}),

                builds: z.object({ android: z.number().default(1),
                                       web: z.number().default(1),
                                       ios: z.number().default(0), }).default({}),

   paymentIntegrations: z.number().default(1),
  deliveryIntegrations: z.number().default(1),
           smsGateways: z.number().default(1),
  monthlyNotifications: z.number().default(500),
             storageMB: z.number().default(500),
      customerAccounts: z.number().default(50),
            staffUsers: z.number().default(0),
              products: z.number().default(15),
         monthlyOrders: z.number().default(20),
}).default({});

const featuresSchema = z.object({
   analyticsDashboard: z.boolean().default(false),
  inventoryManagement: z.boolean().default(false),
      customerSupport: z.boolean().default(false),
          socialLogin: z.boolean().default(false),
}).default({});

const pricingSchema = z.object({
        monthly: z.number().default(0),
         yearly: z.number().default(0),
      quarterly: z.number().default(0),
  billingCycles: z.array( z.enum(["not-applicable", "monthly", "quarterly", "yearly", "custom"]) ).min(1, "At least one billing cycle is required"),  // Required field
       currency: z.enum(['BDT', 'USD', 'GBP', 'EUR']).default('BDT'),
}).refine(data => data.billingCycles.length > 0, { message: "At least one billing cycle is required", path: ["billingCycles"]});

const trialPeriodSchema = z.object({
              days: z.number().min(0).max(30).default(0),
  includedFeatures: z.array(z.string()).optional(),
}).default({});

const metadataSchema = z.object({
       displayOrder: z.number().default(0),
          isPopular: z.boolean().default(false),
      isRecommended: z.boolean().default(false),
          badgeText: z.string().optional(),
  highlightFeatures: z.array(z.string()).default([]),
}).default({});

// Main Plan Schema
const subscriptionPlanDTOSchema = z.object({
        title: z.string().min(1, "Title is required").max(100).regex(/^[a-zA-Z0-9\s-]+$/, "Only alphanumeric, spaces and hyphens allowed"),
  description: z.string().min(1, "Description is required").max(500),
         slug: z.string().min(1, "Slug is required"),
         tier: z.enum(['free-starter', 'basic', 'growth', 'professional', 'enterprise']).default('free-starter'),
     isActive: z.boolean().default(true),
       prices: pricingSchema,
       limits: maxLimitSchema.optional(),
     features: featuresSchema.optional(),
  trialPeriod: trialPeriodSchema.optional(),
     metadata: metadataSchema.optional(),
}).strict();


export default subscriptionPlanDTOSchema;