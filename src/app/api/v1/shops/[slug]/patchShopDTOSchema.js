import { z } from "zod";

const socialLinkSchema = z.object({
  platform: z.enum([
    "facebook", "twitter", "telegram", "discord", "whatsapp",
    "instagram", "linkedin", "youtube", "tiktok"
  ]),
  link: z.string().url()
});

const appSettingsSchema = z.object({
  templates: z.enum(["desiree", "stylo"]).optional(),
  color: z.string(),
  notifications: z.boolean().optional()
});

// const extraPolicySchema = z.object({
//   type: z.string().optional(),
//   title: z.string().optional(),
//   description: z.string().optional(),
//   url: z.string().optional(),
//   status: z.enum(["active", "inactive", "draft"]).optional(),
//   deletedAt: z.union([z.string(), z.null()]).optional(),
//   isDeleted: z.boolean().optional(),
//   deletedBy: z.string().optional(),
//   deletedReason: z.string().nullable().optional()
// }).partial();

const baseAppSchema = z.object({
  appId: z.string().optional(),
  appSlug: z.string().nullable().optional(),
  appName: z.string().optional(),
  appIcon: z.string().optional(),
  email: z.string().email().nullable().optional(),
  phone: z.string().nullable().optional(),
  version: z.string().nullable().optional(),
  status: z.enum(['active', 'inactive', 'pending', 'on-build', 'prepared']).optional(),
  language: z.enum(['en_US', 'bn_BD']).optional(),
  appUrl: z.string().nullable().optional(),
  contactUs: z.string().nullable().optional(),
  settings: appSettingsSchema.optional(),
  socialLinks: z.array(socialLinkSchema).optional(),
  policies:  z.string(),
  // extraPolicies: z.array(extraPolicySchema).optional(),
  siteMap: z.string().nullable().optional()
}).partial();

const webAppSchema = baseAppSchema.extend({
  domain: z.string().optional()
});

const androidAppSchema = baseAppSchema.extend({
  packageName: z.string().optional(),
  firebaseJSONData: z.string().optional(),
  buildInfo: z.array(z.any()).optional(),
  buildHistory: z.array(z.object({
    si_no: z.string().optional(),
    version: z.string().optional()
  })).optional()
});

const iosAppSchema = baseAppSchema.extend({
  bundleId: z.string(),
  firebaseJSONData: z.string().optional()
});

const shopPatchSchema = z.object({
  referenceId: z.string().optional(),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  country: z.string().optional(),
  industry: z.string().optional(),
  businessName: z.string().optional(),
  location: z.string().optional(),
  slug: z.string().nullable().optional(), 
  activeApps: z.array(z.enum(['web', 'android', 'ios'])).optional(),
  web: webAppSchema.nullable().optional(),      
  android: androidAppSchema.nullable().optional(), 
  ios: iosAppSchema.nullable().optional(),  
  primaryDomain: z.string().nullable().optional(),
  domains: z.array(z.string()).optional(),
  socialLinks: z.array(socialLinkSchema).optional(),
  facebookDataFeed: z.string().nullable().optional(),
  policies: z.string().optional(),
  support: z.object({}).optional(),
  notification: z.object({}).optional(),
  deliveryPartner: z.object({}).optional(),
  paymentPartner: z.object({}).optional(),
  chatSupport: z.array({}).optional(),
  marketing: z.object({}).optional()
}).partial();


export const patchShopSchema = shopPatchSchema;