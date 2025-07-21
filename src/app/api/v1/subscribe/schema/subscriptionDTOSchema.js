import { z } from "zod";

// const subscriptionDTOSchema = z.object({
//   userId: z.string().min(1),
//   planId: z.string().min(1),
//   planSnapshot: z.object({
//     name: z.string(),
//     slug: z.string().optional(),
//     price: z.object({
//       monthly: z.number().nonnegative().optional(),
//       yearly: z.number().nonnegative().optional(),
//       quarterly: z.number().nonnegative().optional(),
//       billingCycles: z.array(z.enum(["monthly", "quarterly", "yearly", "custom"])).optional(),
//       currency: z.enum(['BDT', 'USD', 'GBP', 'EUR']).optional()
//     }).optional(),
//     limits: z.object({
//       customDomains: z.number().optional(),
//       subDomains: z.number().optional(),
//       shops: z.number().optional(),
//       apps: z.object({
//         android: z.number().optional(),
//         web: z.number().optional(),
//         ios: z.number().optional(),
//       }).optional(),
//       builds: z.object({
//         android: z.number().optional(),
//         web: z.number().optional(),
//         ios: z.number().optional(),
//       }).optional(),
//       paymentIntegrations: z.number().optional(),
//       deliveryIntegrations: z.number().optional(),
//       smsGateways: z.number().optional(),
//       monthlyNotifications: z.number().optional(),
//       storageMB: z.number().optional(),
//       customerAccounts: z.number().optional(),
//       staffUsers: z.number().optional(),
//       products: z.number().optional(),
//       monthlyOrders: z.number().optional(),
//     }).optional(),
//     features: z.object({
//       analyticsDashboard: z.boolean().optional(),
//       inventoryManagement: z.boolean().optional(),
//       customerSupport: z.boolean().optional(),
//       socialLogin: z.boolean().optional(),
//     }).optional(),
//     billingCycles: z.array(z.enum(["hourly", "daily", "weekly", "monthly", "quarterly", "yearly", "not-applicable", "custom"])).optional(),
//     version: z.number().optional(),
//   }).optional(),
//   duration: z.object({
//     startDate: z.date().optional(),
//     endDate: z.date().nullable().optional()
//   }).optional(),
//   trial: z.object({
//     startAt: z.date(),
//     endAt: z.date(),
//   }).optional(),
//   billingCycle: z.enum(["monthly", "quarterly", "yearly", "custom"]).optional(),
//   autoRenew: z.boolean().optional(),
//   renewalDate: z.date().nullable().optional(),
//   currency: z.enum(['BDT', 'USD', 'EUR', 'GBP', 'INR', 'JPY']).optional(),
//   amount: z.number().nonnegative().optional(),
//   paymentMethodId: z.string().optional(),
//   ipAddress: z.string().optional(),
//   userAgent: z.string().optional(),
//   dataProcessingConsent: z.object({
//     accepted: z.boolean(),
//     acceptedAt: z.date()
//   }).optional(),
//   metadata: z.record(z.any()).optional()
// });

// planId, billingCycle, autoRenew,  invoice, discount, metadata



const subscriptionDTOSchema = z.object({
           planId: z.string().min(1),
     billingCycle: z.enum(["monthly", "quarterly", "yearly", "custom"]).optional(),
        autoRenew: z.boolean().default(false),
  paymentMethodId: z.string().optional(),
        ipAddress: z.string()
                        // .regex('/^(?:\d{1,3}\.){3}\d{1,3}$|^\[?([a-fA-F0-9:]+)\]?$/', 'Invalid IP address')
                        .optional(),
        userAgent: z.string().optional(),
          invoice: z.string().optional(),
         discount: z.string().optional(),
         metadata: z.record(z.any()).optional()
});

export default subscriptionDTOSchema