
const templates = [
  {
        "name": "test",
        "cname": "test-dxi.pages.dev",
    },
    {
        "name": "test2",
        "cname": "test2-dxi.pages.dev",
    },
];

const domains = [
  {
        "domain": "appcommerz.com",
        "zone_id": "d1e2f3g4h5i6j7k8l9m0n1o2p3q4r5s6",
    },
    {
        "domain": "apidoxy.com",
        "zone_id": "d1e2f3sda54f1j7k8l9m0n1o2p3q4r5s6",
    },
];

export async function connectDomain(template, domain) {
  // Extract and validate env vars
  const ENV = {
    ACCOUNT_ID: process.env.CLOUDFLARE_ACCOUNT_ID,
    ZONE_ID: process.env.CLOUDFLARE_ZONE_ID,
    API_KEY: process.env.CLOUDFLARE_API_KEY,
    EMAIL: process.env.CLOUDFLARE_EMAIL,
  };

  for (const [key, value] of Object.entries(ENV)) {
    if (!value) {
      return {
        success: false,
        message: `Missing required environment variable: ${key}`,
        error: `Missing ${key}`,
      };
    }
  }

  // Helper: Find template config
  const templateConfig = templates.find(t => t?.name === template);
  if (!templateConfig) {
    return {
      success: false,
      domain,
      cname: `${template}.pages.dev`,
      created_on: new Date().toISOString(),
      status: "failed",
      message: "Invalid project template",
      error: "Template not found",
    };
  }

  // Helper: Check if domain is managed
  const isManaged = Array.isArray(domains) && domains.some(d => {
    if (!d?.domain) return false;
    return domain === d.domain || domain.endsWith(`.${d.domain}`);
  });

  try {
    // Call Cloudflare Pages API to connect domain
    const cfRes = await fetch( `https://api.cloudflare.com/client/v4/accounts/${ENV.ACCOUNT_ID}/pages/projects/${template}/domains`,
                                {
                                    method: "POST",
                                    headers: { "Content-Type": "application/json",
                                               "X-Auth-Email": ENV.EMAIL,
                                                 "X-Auth-Key": ENV.API_KEY },
                                    body: JSON.stringify({ name: domain }),
                                }
                            );

    const cfData = await cfRes.json();

    const baseResponse = { success: cfData.success,
                            domain,
                             cname: templateConfig.cname,
                        created_on: new Date().toISOString(),
                            status: cfData.result?.status || "pending",
                        };
    
    const isManagedDomain = domains.some(d=> d && d.domain && (domain.endsWith(`.${d.domain}`) || d.domain === domain))

    // Handle already connected domain
    const alreadyConnected = cfData.errors?.[0]?.code === 10007;
    if (!cfData.success) {
      if (alreadyConnected) {
            return { ...baseResponse,
                             success: true,
                              status: "active",
                             message: "This domain is already connected" };
        }
      return { ...baseResponse,
                       success: false,
                        status: "failed",
                       message: "Domain connection failed",
                         error: cfData.errors?.[0]?.message || "Unknown error",
                };
    }

    // If domain is managed, fire DNS setup in background
    if (isManaged) {
      createDNSRecord(domain, templateConfig.cname, ENV).catch(console.error);

      return {
        ...baseResponse,
        message: "Domain connected; DNS setup started in background",
      };
    }

    // Otherwise: manual DNS setup
    return {
      ...baseResponse,
      message: "Domain connected successfully",
      note: "Please configure your DNS records manually",
    };
  } catch (err) {
    return {
      success: false,
      domain,
      cname: templateConfig.cname || `${template}.pages.dev`,
      created_on: new Date().toISOString(),
      status: "failed",
      message: "Unhandled error during domain connection",
      error: err.message || "Unknown error",
    };
  }
}

// 🔧 Helper to create DNS record in background
async function createDNSRecord(domain, cname, ENV) {
  const dnsRes = await fetch(
    `https://api.cloudflare.com/client/v4/zones/${ENV.ZONE_ID}/dns_records`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Auth-Email": ENV.EMAIL,
        "X-Auth-Key": ENV.API_KEY,
      },
      body: JSON.stringify({
        type: "CNAME",
        name: domain,
        content: cname,
        ttl: 3600,
        proxied: true,
      }),
    }
  );

  const dnsData = await dnsRes.json();

  if (!dnsRes.ok || !dnsData.success) {
    throw new Error(dnsData.errors?.[0]?.message || "DNS record creation failed");
  }

  return dnsData;
}