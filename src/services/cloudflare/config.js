const config = {
                  accountId: process.env.CLOUDFLARE_ACCOUNT_ID,
                     zoneId: process.env.CLOUDFLARE_ZONE_ID,
                     apiKey: process.env.CLOUDFLARE_API_KEY,
                      email: process.env.CLOUDFLARE_EMAIL,
          defaultShopDomain: process.env.DEFAULT_SHOP_DOMAIN,

     dnsTtlMs: parseInt(process.env.CLOUDFLARE_DNS_DEFAULT_TTL_MS || '3600', 10),
};
export default config