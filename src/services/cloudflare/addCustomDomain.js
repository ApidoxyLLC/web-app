import config from "./config";

export async function addCustomDomain({ template , domain }) {
  const controller = new AbortController();
  const timeout = 10000; // 10 seconds
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(
      `https://api.cloudflare.com/client/v4/accounts/${config.accountId}/pages/projects/${template}/domains`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json",
                   "X-Auth-Email": config.email,
                     "X-Auth-Key": config.apiKey    },
        body: JSON.stringify({ name: domain }),
        signal: controller.signal,
      }
    );

    clearTimeout(timeoutId);

    if (!response.ok)
      throw new Error(`HTTP error! Status: ${response.status}`);
    
    const data = await response.json();

    if (!data.success) {
      const errorMsg = data.errors?.map(e => e.message).join(", ") || "Unknown Cloudflare error";
      throw new Error(`API error: ${errorMsg}`);
    }

    console.log(`Successfully added domain ${domain} to project ${template}`);
    return {
      success: true,
      domain: data.result,
      verificationInfo: data.result?.verification_info, // Contains DNS verification details
    };

  } catch (error) {
    console.error(`Failed to add domain ${domain}:`, error.message);

    if (error.name === "AbortError") {
      throw new Error("Request timed out. Please try again or check your connection.");
    }

    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
}