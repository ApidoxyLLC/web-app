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
  appId: z.string(),
  appSlug: z.string().nullable().optional(),
  appName: z.string(),
  appIcon: z.string(),
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
  packageName: z.string(),
  firebaseJSONData: z.string().optional(),
  buildInfo: z.array(z.any()).optional(),
  buildHistory: z.array(z.object({
    si_no: z.string(),
    version: z.string().optional()
  })).optional()
});

const iosAppSchema = baseAppSchema.extend({
  bundleId: z.string(),
  firebaseJSONData: z.string().optional()
});

// ---------------
const supportSchema = z.object({
  email: z.string().email().nullable().optional(),
  phone: z.string().nullable().optional(),
  whatsapp: z.string(),
});
const notificationSchema = z.object({
  email: z.string().nullable().optional(),
  phone: z.string().nullable().optional(),
  preferredChannel: z.enum(['email', 'sms', 'whatsapp']).nullable().optional(),

  hourlyNotification: z.object({
    enabled: z.boolean().optional(),
    intervalHours: z.number().min(1).max(24).optional(),
  }).optional(),

  orderNotifications: z.object({
    enabled: z.boolean().optional(),
    frequency: z.number().min(1).optional(),
  }).optional(),
});
const pathaoSchema = z.object({
  apiKey: z.string().optional(), 
  secret: z.string().optional(), 
});

const steadfastSchema = z.object({
  user: z.string().optional(), 
  password: z.string().optional(),
});

const deliveryPartnerSchema = z.object({
  pathao: pathaoSchema.optional(),
  steadfast: steadfastSchema.optional(),
});
const bkashSchema = z.object({
  username: z.string().optional(), 
  password: z.string().optional(),
});

const paymentPartnerSchema = z.object({
  bkash: bkashSchema.optional(),
});
const chatSupportSchema = z.object({
  provider: z.enum(['facebook', 'whatsapp', 'intercom', 'tawk']),
  link: z.string(),
  active: z.boolean().optional(),
});
const googleTagManagerSchema = z.object({
  provider: z.string().optional(),
  tagManagerId: z.array(z.string()).optional(),
});

const facebookPixelSchema = z.object({
  provider: z.string().optional(),
  pixelId: z.string().optional(),
  pixelAccessToken: z.string().optional(),
  testEventId: z.string().optional(),
  conversionApiToken: z.string().optional(),
  dataFeedUrl: z.string().optional(),
});

const smsProviderSchema = z.object({
  provider: z.enum(['bulk-sms-bd', 'twilio', 'nexmo', 'msg91', 'banglalink']),
  apiKey: z.string().optional(),
  senderId: z.string().optional(),
  clientId: z.string().optional(),
  clientSecret: z.string().optional(),
  active: z.boolean().optional(),
});

const emailProviderSchema = z.object({
  provider: z.enum(['mailgun', 'sendgrid', 'smtp', 'ses']),
  smtpHost: z.string().optional(),
  port: z.string().optional(),
  username: z.string().optional(),
  password: z.string().optional(),
  active: z.boolean().optional(),
});

const marketingSchema = z.object({
  sitemapUrl: z.string().optional(),
  googleTagManager: googleTagManagerSchema.optional(),
  facebookPixel: facebookPixelSchema.optional(),
  smsProviders: smsProviderSchema.optional(),
  emailProviders: emailProviderSchema.optional(),
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
  support: supportSchema.optional(),
  notification: notificationSchema.optional(),
  deliveryPartner: deliveryPartnerSchema.optional(),
  paymentPartner: paymentPartnerSchema.optional(),
  chatSupport: chatSupportSchema.optional(),
  marketing: marketingSchema.optional()
}).partial();


export const patchShopSchema = shopPatchSchema;