import { z } from 'zod';

// Zod schema to validate required environment variables
const cloudflareConfigSchema = z.object({
    accountId: z.string().min(1, 'CLOUDFLARE_ACCOUNT_ID is required'),
    zoneId: z.string().min(1, 'CLOUDFLARE_ZONE_ID is required'),
    apiKey: z.string().min(1, 'CLOUDFLARE_API_KEY is required'),
    email: z.string().email('CLOUDFLARE_EMAIL must be a valid email address'),
});

// Load from environment variables
const envConfig = {
    accountId: process.env.CLOUDFLARE_ACCOUNT_ID,
    zoneId: process.env.CLOUDFLARE_ZONE_ID,
    apiKey: process.env.CLOUDFLARE_API_KEY,
    email: process.env.CLOUDFLARE_EMAIL,
};

// Validate config with Zod
const result = cloudflareConfigSchema.safeParse(envConfig);

if (!result.success) {
    console.error("Invalid Cloudflare config:", result.error.flatten().fieldErrors);
    throw new Error("Invalid Cloudflare configuration. Please check your environment variables.");
}

export default result.data;
