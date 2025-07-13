import { addCustomDomain } from "@/services/cloudflare/addCustomDomain";
import { addDNSRecord } from "@/services/cloudflare/addDNSRecord";
import cloudflareConfig from "@/services/cloudflare/config";
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

export async function createDefaultDomain({ template, shopId }) {
    // Create 
    if (!template) throw new Error('Template is required');
    if (!templates || !Array.isArray(templates)) 
        throw new Error('Templates configuration is missing or invalid');

    const templateConfig = templates.find(t => t && t.name === template);
    if (!templateConfig) 
        throw new Error(`Template not found for project: ${template}`);

    const domain = shopId+'.'+ cloudflareConfig.defaultShopDomain
    
    const customDomainResult = await addCustomDomain({ template , domain })
    const baseResponse = { success: customDomainResult.success,
                            domain: domain,
                             cname: templateConfig.cname,
                        created_on: new Date().toISOString(),
                            status: customDomainResult.result?.status || 'pending' };

    const       zoneId = getZoneIdForDomain(domain) || cloudflareConfig.zoneId
    const shouldManage = isManageDomain(domain);
    

    if (customDomainResult.success && shouldManage) {
            try {
                await addDNSRecord({ domain, template, zoneId });
                return { ...baseResponse,
                         message: 'Domain connected and DNS record added successfully'};
            } catch (dnsError) {
                return { ...baseResponse,
                                 message: 'Domain connected but DNS record creation failed',
                                   error: dnsError.message  };
            }
        }
    return { ...baseResponse,
                     message: 'Domain connected successfully',
                        note: shouldManage ? undefined : 'Please configure your DNS records manually'  };
}


function isManageDomain(domain) {
    if (!domains || !Array.isArray(domains)) 
        throw new Error('Domains configuration is missing or invalid');
    return domains.some(d => {
        if (!d || !d.domain) return false;
        return domain.endsWith(`.${d.domain}`) || domain === d.domain;
    });
}

function getZoneIdForDomain(domain) {
  const matched = domains.find((d) => domain.endsWith(`.${d.domain}`) || domain === d.domain);
  return matched?.zone_id || null;
}