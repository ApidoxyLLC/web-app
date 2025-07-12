import config from "./config";

export async function getDomains({ page = null, perPage = 20 }) {
    const allDomains = [];
    let fetchPage = page || 1;
    let resultInfo = null;
    

    const controller = new AbortController();
    const timeout = 10000;
    const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    while (true) {
        const validatedPerPage = Math.min(perPage, 100);
      const response = await fetch( `https://api.cloudflare.com/client/v4/zones?page=${fetchPage}&per_page=${validatedPerPage}&status=active`,
                                    {  method: "GET",
                                      headers: { "Content-Type": "application/json",
                                                 "X-Auth-Email": config.email,
                                                   "X-Auth-Key": config.apiKey },
                                       signal: controller.signal,
                                    });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }

      const data = await response.json();

      if (!data.success) {
        const errorMsg = data.errors?.map(e => e.message).join(", ") || "Unknown Cloudflare error";
        throw new Error(`API error: ${errorMsg}`);
      }

      // ✅ Filter only active and not paused, and map to id + name only
      const filtered = data.result.filter(zone => zone.paused === false)
                                  .map(zone => ({   id: zone.id,
                                                  name: zone.name }));
        allDomains.push(...filtered);
        if(page){
            resultInfo = data.result_info
            break
        }
        
        if (fetchPage >= data.result_info.total_pages || data.result.length < perPage) {
            resultInfo = { "total_pages": data.result_info.total_pages,
                             "count": data.result_info.count}
            break                             
        };
        fetchPage++;
    }

    console.log(`Successfully fetched ${allDomains.length} active domains`);
    return {
                success: true,
                domains: allDomains,
                result_info: resultInfo,
            };

  } catch (error) {
    console.error("Failed to fetch domains:", error.message);

    if (error.name === "AbortError") {
      throw new Error("Request timed out. Please try again or check your connection.");
    }

    throw error;
  }
}
