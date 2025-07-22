import { z } from 'zod';

// First, define the sub-schemas that are referenced

const socialPlatforms = [   'facebook',
                            'twitter', 
                            'telegram',
                            'discord',
                            'whatsapp',
                            'instagram',
                            'linkedin',
                            'youtube',
                            'tiktok'    ]

const appSettingsSchema = z.object({
  templates: z.enum(['desiree', 'stylo']).default('desiree'),
  color: z.string(),
  notifications: z.boolean().default(true)
});

const socialLinksSchema = z.object({
  platform: z.enum(socialPlatforms).optional(),
  link: z.string().optional()
}).strict();

const buildInfoSchema = z.object({
  buildNo: z.number().default(0),
  versionName: z.string().optional(),
  buildTime: z.string().optional(),
  buildDuration: z.string().optional(),
  gitBranch: z.string().optional(),
  buildStatus: z.enum(['success', 'pending', 'queued', 'failed']).optional()
});

const buildHistoryItemSchema = z.object({
  si_no: z.string(),
  version: z.string().default("")
});

// Base app schema
const baseAppSchema = z.object({
  appId: z.string(),
  appSlug: z.string().nullable().default(null),
  appName: z.string(),
  appIcon: z.string(),
  email: z.string().nullable().default(null),
  phone: z.string().nullable().default(null),
  version: z.string().nullable().default(null),
  status: z.enum(['active', 'inactive', 'pending', 'on-build', 'prepared']).default('pending'),
  language: z.enum(['en_US', 'bn_BD']).default('en_US'),
  appUrl: z.string().nullable().default(null),
  contactUs: z.string().nullable().default(null),
     settings: appSettingsSchema,
  socialLinks: z.array(socialLinksSchema),
  siteMap: z.string().nullable().default(null),
  createdAt: z.date().optional(),
  updatedAt: z.date().optional()
});

// Android app schema
const androidAppSchema = baseAppSchema.extend({
  packageName: z.string(),
  buildInfo: z.array(buildInfoSchema).default([]),
  firebaseJSONData: z.string().optional(),
  buildHistory: z.array(buildHistoryItemSchema).default([])
});

// Web app schema
const webAppSchema = baseAppSchema.extend({
  domain: z.string()
});


const appSchema = z.object({
    appSlug: z.string().nullable().default(null),
    appName: z.string(),
    appIcon: z.string(),
      email: z.string().nullable().default(null),
      phone: z.string().nullable().default(null),
      version: z.string().nullable().default(null),
       status: z.enum(['active', 'inactive', 'pending', 'on-build', 'prepared']).default('pending'),
     language: z.enum(['en_US', 'bn_BD']).default('en_US'),
       appUrl: z.string().nullable().default(null),
    contactUs: z.string().nullable().default(null),
     settings: appSettingsSchema,
  socialLinks: z.array(socialLinksSchema),
});

// Export the schemas
export {
  baseAppSchema,
  androidAppSchema,
  webAppSchema,
  buildInfoSchema,
  buildHistoryItemSchema
};