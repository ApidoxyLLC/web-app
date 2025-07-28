import { z } from 'zod';

const envSchema = z.object({
    NETLIFY_API_TOKEN: z.string().min(1, 'NETLIFY_API_TOKEN is required'),
    NETLIFY_SITE_ID: z.string().min(1, 'NETLIFY_SITE_ID is required'),
    DEFAULT_CUSTOM_DOMAIN: z.string().optional(),
});

const env = envSchema.parse(process.env);

const config = {
    apiToken: env.NETLIFY_API_TOKEN,
    siteId: env.NETLIFY_SITE_ID,
    defaultDomain: env.DEFAULT_CUSTOM_DOMAIN || null,
};

export default config;
