import getRedisClient from '../getRedisClient';
import config from '../../../../config';

const sessionRedis = getRedisClient('vendor');
const REFERENCE_PREFIX = 'ref:';
const HOST_PREFIX = 'host:';
const TTL = (config.vendorDataCacheExpireMinutes || 30) * 60;

const DATA_PREFIXES = {
    infrastructure: 'infra:',
    staff: 'staff:',
    delivery: 'delivery:',
    payment: 'payment:',
    communication: 'comm:',
    marketing: 'marketing:',
    platforms: 'platforms:',
    subscriptions: 'subscriptions:',
    usage: 'usage:'
};


export async function setCache({ segment, domains = [], referenceId, id, payload = {} }) {
    if (!DATA_PREFIXES[segment]) throw new Error(`Invalid segment: ${segment}`);
    if (!id) throw new Error('Missing required parameter: id');
    if (typeof payload !== 'object' || payload === null) throw new Error('Payload must be a non-null object');
    if (!Array.isArray(domains) || domains.some(d => typeof d !== 'string'))throw new Error('Domains must be an array of strings');

    const   dataPrefix = DATA_PREFIXES[segment];
    const      dataKey = `${dataPrefix}${id}`;
    const referenceKey = referenceId ? `${REFERENCE_PREFIX}${referenceId}` : null;
    const     pipeline = sessionRedis.pipeline();

    // Store payload once
    pipeline.setex(dataKey, TTL, JSON.stringify({ ...payload, domains, id, referenceId }));

    // Map referenceId → id
    if (referenceKey) pipeline.setex(referenceKey, TTL, id);

    // Map each domain → id
    domains.forEach(domain => pipeline.setex(`${HOST_PREFIX}${domain}`, TTL, id));

    try {
        const results = await pipeline.exec();
        if (!results) return { success: false, message: 'Redis pipeline failed' };
        const failedCommands = results.filter(([err]) => err);
        if (failedCommands.length > 0) return { success: false,  message: 'Partial cache failure', error: failedCommands.map(([err]) => err.message).join(', ') };
        return { success: true, segment, id, referenceId, domains, message: `${segment} data stored successfully` };
    } catch (error) {
        console.error('Redis operation failed:', error);
        return { success: false, message: 'Failed to cache data', error: error.message };
    }
}

/**
 * Generic getter for any segment
 */
export async function getCache({ segment, referenceId, domain }) {
    if (!DATA_PREFIXES[segment]) throw new Error(`Invalid segment: ${segment}`);
    if (!referenceId && !domain) throw new Error('At least one of referenceId or domain is required');

    const dataPrefix = DATA_PREFIXES[segment];

    // Resolve the ID
    let id;
    if (referenceId)    id = await sessionRedis.get(`${REFERENCE_PREFIX}${referenceId}`);
    if (!id && domain)  id = await sessionRedis.get(`${HOST_PREFIX}${domain}`);
    if (!id) return { success: false, message: `${segment} data not found` };

    const    dataKey = `${dataPrefix}${id}`;
    const cachedData = await sessionRedis.get(dataKey);
    if (!cachedData) return { success: false, id, message: `${segment} data not found for resolved id` };

    let data;
    try { data = JSON.parse(cachedData); } 
    catch (err) { return { success: false, message: 'Failed to parse cached data', error: err.message }; }

    // Refresh TTL for all related keys
    try {
        const pipeline = sessionRedis.pipeline();
        pipeline.expire(dataKey, TTL);
        if (data.referenceId) pipeline.expire(`${REFERENCE_PREFIX}${data.referenceId}`, TTL);
        if (data.domains?.length) data.domains.forEach(d => pipeline.expire(`${HOST_PREFIX}${d}`, TTL));
        await pipeline.exec();
    } catch (err) {
        console.warn('Failed to refresh TTL for cached keys', err);
    }

    return { success: true, id, data };
}


// const ID_TTL = config.vendorIdCacheExpireMinutes *  60;

// const VENDOR_PREFIX = 'vendor:';
// const INFRASTRUCTURE_PREFIX = 'infra:';
// export async function setInfrastructure({ domains = [], referenceId, id, payload = {} }) {
//     if (!id) throw new Error('Missing required parameter: id');
//     if (!Array.isArray(domains) || domains.some(d => typeof d !== 'string')) 
//         throw new Error('Domains must be an array of strings');

//     // Always store id inside the payload
//     const dataKey      = `${INFRASTRUCTURE_PREFIX}${id}`;
//     const referenceKey = referenceId ? `${REFERENCE_PREFIX}${referenceId}` : null;

//     const pipeline = sessionRedis.pipeline();

//     // Store payload only once
//     pipeline.setex(dataKey, TTL, JSON.stringify({ ...payload, domains, id, referenceId }));

//     // Map referenceId → id
//     if (referenceKey) pipeline.setex(referenceKey, TTL, id);

//     // Map each domain → id
//     domains.forEach(domain => pipeline.setex(`${HOST_PREFIX}${domain}`, TTL, id)); 

//     try {
//         await pipeline.exec();
//         return { success: true, id, referenceId, domains, message: 'Vendor data stored for all domains' };
//     } catch (error) {
//         console.error('Redis operation failed:', error);
//         return { success: false, message: 'Failed to cache data', error: error.message };
//     }
// }

// export async function getInfrastructure({ id, referenceId, domain }) {
//     if (!id && !referenceId && !domain) throw new Error('At least one of id, referenceId, or domain is required');
    
//     // Resolve the ID
//     const _id = id || (referenceId && await sessionRedis.get(`${REFERENCE_PREFIX}${referenceId}`)) || (domain && await sessionRedis.get(`${HOST_PREFIX}${domain}`));
//     if (!_id)  return { success: false, message: 'Infrastructure data not found' };
//     const dataKey = `${INFRASTRUCTURE_PREFIX}${_id}`;
//     const cachedData = await sessionRedis.get(dataKey);
//     if (!cachedData) return { success: false, message: 'Infrastructure data not found for resolved id' };
    
//     let data;
//     try { data = JSON.parse(cachedData); } 
//     catch (err) { return { success: false, message: 'Failed to parse cached data', error: err.message };}
    
//     const pipeline = sessionRedis.pipeline();
//     pipeline.expire(dataKey, TTL);
//     if (data.referenceId) pipeline.expire(`${REFERENCE_PREFIX}${data.referenceId}`, TTL);
//     if (data.domains?.length) data.domains.forEach(domain => pipeline.expire(`${HOST_PREFIX}${domain}`, TTL));
//     await pipeline.exec();
//     return { success: true, id: _id, payload };
// }

// export async function setVendor({ domain, referenceId, id, payload = {} }) {
//     if (!id) throw new Error('Missing required parameter: id');
//     if (domain && typeof domain !== 'string') throw new Error('Domain must be a string');

//     const dataKey      = `${VENDOR_PREFIX}${id}`;
//     const referenceKey = referenceId 
//                             ? `${REFERENCE_PREFIX}${referenceId}` 
//                             : null;

//     const hostKey = domain 
//                             ? `${HOST_PREFIX}${domain}` 
//                             : null;

//     let storeData;
//     try { storeData = JSON.stringify({ id, referenceId: referenceId || null, ...payload });} 
//     catch (err) { throw new Error('Failed to serialize vendor payload for Redis'); }

//     const pipeline = sessionRedis.pipeline();

//     // Main payload
//     pipeline.setex(dataKey, TTL, storeData);

//     // Aliases pointing to main key
//     if (referenceKey) pipeline.setex(referenceKey, TTL, id);
//     if (hostKey) pipeline.setex(hostKey, TTL, id);

//     try {
//         await pipeline.exec();
//         return {
//             success: true,
//             referenceId,
//             hostKey,
//             message: 'Vendor data stored'
//         };
//     } catch (error) {
//         console.error('Redis operation failed:', error);
//         throw new Error('Failed to update vendor data');
//     }
// }

// export async function getVendor({ id, referenceId, domain }) {
//     if (!id && !referenceId && !domain) {
//         return { success: false, message: 'At least one key (id, referenceId, domain) is required' };
//     }

//     let dataKey;

//     try {
//         let resolvedId;

//         if (id) {
//             resolvedId = id;
//         } else if (referenceId) {
//             const refKey = `${REFERENCE_PREFIX}${referenceId}`;
//             resolvedId = await sessionRedis.get(refKey);
//             if (!resolvedId) return { success: false };
//         } else if (domain) {
//             const hostKey = `${HOST_PREFIX}${domain}`;
//             resolvedId = await sessionRedis.get(hostKey);
//             if (!resolvedId) return { success: false };
//         }

//         dataKey = `${VENDOR_PREFIX}${resolvedId}`;

//         const payloadStr = await sessionRedis.get(dataKey);
//         if (!payloadStr) return { success: false };

//         const data = JSON.parse(payloadStr);
//         return { success: true, data };
//     } catch (err) {
//         console.error('Redis retrieval failed:', err);
//         return { success: false };
//     }
// }



