import { z } from 'zod';

const envSchema = z.object({
  // Cloudflare
  CLOUDFLARE_ACCOUNT_ID: z.string().min(1, 'CLOUDFLARE_ACCOUNT_ID is required'),
  CLOUDFLARE_ZONE_ID: z.string().min(1, 'CLOUDFLARE_ZONE_ID is required'),
  CLOUDFLARE_API_KEY: z.string().min(1, 'CLOUDFLARE_API_KEY is required'),
  CLOUDFLARE_EMAIL: z.string().email('CLOUDFLARE_EMAIL must be a valid email'),
  CLOUDFLARE_DNS_DEFAULT_TTL_MS: z.string().optional().default('3600'),
  DEFAULT_SHOP_DOMAIN: z.string().min(1),

  // Netlify
  NETLIFY_API_TOKEN: z.string().min(1, 'NETLIFY_API_TOKEN is required'),
  NETLIFY_SITE_ID: z.string().min(1, 'NETLIFY_SITE_ID is required'),
  DEFAULT_CUSTOM_DOMAIN: z.string().optional(),
});

const config = {
  cloudflare: {
    accountId: process.env.CLOUDFLARE_ACCOUNT_ID,
    zoneId: process.env.CLOUDFLARE_ZONE_ID,
    apiKey: process.env.CLOUDFLARE_API_KEY,
    email: process.env.CLOUDFLARE_EMAIL,
    defaultShopDomain: process.env.DEFAULT_SHOP_DOMAIN,
    dnsTtlMs: parseInt(process.env.CLOUDFLARE_DNS_DEFAULT_TTL_MS || '3600', 10),
  },
  netlify: {
    apiToken: process.env.NETLIFY_API_TOKEN,
    siteId: process.env.NETLIFY_SITE_ID,
    defaultDomain: process.env.DEFAULT_CUSTOM_DOMAIN || null,
  },

};

export default config;
