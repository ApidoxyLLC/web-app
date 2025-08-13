import getRedisClient from '../getRedisClient';
import config from '../../../../config';

const sessionRedis = getRedisClient('vendor');
const VENDOR_PREFIX = 'vendor:';
const REFERENCE_PREFIX = 'ref:';
const HOST_PREFIX = 'host:';
const TTL = config.vendorDataCacheExpireMinutes *  60;
const ID_TTL = config.vendorIdCacheExpireMinutes *  60;


export async function setVendor({ domain, referenceId, id, payload = {} }) {
    if (!id) throw new Error('Missing required parameter: id');
    if (domain && typeof domain !== 'string') throw new Error('Domain must be a string');

    const dataKey      = `${VENDOR_PREFIX}${id}`;
    const referenceKey = referenceId 
                            ? `${REFERENCE_PREFIX}${referenceId}` 
                            : null;

    const hostKey = domain 
                            ? `${HOST_PREFIX}${domain}` 
                            : null;

    let storeData;
    try { storeData = JSON.stringify({ id, referenceId: referenceId || null, ...payload });} 
    catch (err) { throw new Error('Failed to serialize vendor payload for Redis'); }

    const pipeline = sessionRedis.pipeline();

    // Main payload
    pipeline.setex(dataKey, TTL, storeData);

    // Aliases pointing to main key
    if (referenceKey) pipeline.setex(referenceKey, TTL, id);
    if (hostKey) pipeline.setex(hostKey, TTL, id);

    try {
        await pipeline.exec();
        return {
            success: true,
            referenceId,
            hostKey,
            message: 'Vendor data stored'
        };
    } catch (error) {
        console.error('Redis operation failed:', error);
        throw new Error('Failed to update vendor data');
    }
}

export async function getVendor({ id, referenceId, domain }) {
    if (!id && !referenceId && !domain) {
        return { success: false, message: 'At least one key (id, referenceId, domain) is required' };
    }

    let dataKey;

    try {
        let resolvedId;

        if (id) {
            resolvedId = id;
        } else if (referenceId) {
            const refKey = `${REFERENCE_PREFIX}${referenceId}`;
            resolvedId = await sessionRedis.get(refKey);
            if (!resolvedId) return { success: false };
        } else if (domain) {
            const hostKey = `${HOST_PREFIX}${domain}`;
            resolvedId = await sessionRedis.get(hostKey);
            if (!resolvedId) return { success: false };
        }

        dataKey = `${VENDOR_PREFIX}${resolvedId}`;

        const payloadStr = await sessionRedis.get(dataKey);
        if (!payloadStr) return { success: false };

        const data = JSON.parse(payloadStr);
        return { success: true, data };
    } catch (err) {
        console.error('Redis retrieval failed:', err);
        return { success: false };
    }
}



