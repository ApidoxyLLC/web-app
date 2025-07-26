import config from "./config";

const templates = [
  {
    name: "shop2",
    cname: "shop2-dxi.pages.dev",
  },
  {
    name: "shop3",
    cname: "shop3-dxi.pages.dev",
  },
];

export async function addDNSRecord({
  domain,
  template,
  type = "CNAME",
  content,
  ttl = null,
  proxied = true,
}) {
  const controller = new AbortController();
  const timeout = 10000;
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  let recordContent = content;

  if (type === "CNAME") {
    if (!recordContent) {
      if (!templates || !Array.isArray(templates)) {
        throw new Error("Templates configuration is missing or invalid");
      }
      const templateConfig = templates.find((t) => t?.name === template);
      if (!templateConfig) {
        throw new Error(`Template not found for project: ${template}`);
      }
      recordContent = templateConfig.cname;
    }
  } else if (type === "TXT") {
    if (!recordContent) {
      throw new Error("TXT record requires 'content' parameter");
    }
    proxied = false;
  } else {
    throw new Error(`Unsupported DNS record type: ${type}`);
  }

  try {
    const response = await fetch(
      `https://api.cloudflare.com/client/v4/zones/${config.cloudflare.zoneId}/dns_records`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Auth-Email": config.cloudflare.email,
          "X-Auth-Key": config.cloudflare.apiKey,
        },
        body: JSON.stringify({
          type,
          name: domain,
          content: recordContent,
          proxied,
          ttl: ttl || config.cloudflare.dnsTtlMs,
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

    console.log(`Successfully added ${type} DNS record for ${domain}`);
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
