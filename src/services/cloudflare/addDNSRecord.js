import config from "./config";

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

export async function addDNSRecord({ domain, template, zoneId, ttl = null }) {
  const controller = new AbortController();
  const timeout = 10000;
  const timeoutId = setTimeout(() => controller.abort(), timeout);


  if (!templates || !Array.isArray(templates)) {
        throw new Error('Templates configuration is missing or invalid');
    }
    const templateConfig = templates.find(t => t && t.name === template);
    if (!templateConfig) {
        throw new Error(`Template not found for project: ${template}`);
    }

  try {
    const response = await fetch(
      `https://api.cloudflare.com/client/v4/zones/${zoneId}/dns_records`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Auth-Email": config.email,
          "X-Auth-Key": config.apiKey,
          // If you prefer token auth:
          // Authorization: `Bearer ${config.apiToken}`
        },
        body: JSON.stringify({
          type: "CNAME",
          name: domain,
          content: templateConfig.cname,
          proxied: true,
          ttl: ttl ? ttl : config.dnsTtlMs,
        }),
        signal: controller.signal,
      }
    );

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }

    const data = await response.json();

    if (!data.success) {
      const errorMsg =
        data.errors?.map((e) => e.message).join(", ") || "Unknown Cloudflare error";
      throw new Error(`API error: ${errorMsg}`);
    }

    console.log(`Successfully added DNS record for ${domain}`);
    return {
      success: true,
      record: data.result,
    };
  } catch (error) {
    console.error(`Failed to add DNS record for ${domain}:`, error.message);

    if (error.name === "AbortError") {
      throw new Error("Request timed out. Please try again or check your connection.");
    }

    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
}