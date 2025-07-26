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

const env = envSchema.parse(process.env);

const config = {
  cloudflare: {
    accountId: env.CLOUDFLARE_ACCOUNT_ID,
    zoneId: env.CLOUDFLARE_ZONE_ID,
    apiKey: env.CLOUDFLARE_API_KEY,
    email: env.CLOUDFLARE_EMAIL,
    defaultShopDomain: env.DEFAULT_SHOP_DOMAIN,
    dnsTtlMs: parseInt(env.CLOUDFLARE_DNS_DEFAULT_TTL_MS || '3600', 10),
  },
  netlify: {
    apiToken: env.NETLIFY_API_TOKEN,
    siteId: env.NETLIFY_SITE_ID,
    defaultDomain: env.DEFAULT_CUSTOM_DOMAIN || null,
  },
};

export default config;
