import getRedisClient from '../getRedisClient';
import config from '../../../../config';

const sessionRedis = getRedisClient('vendor');
const SHOP_PREFIX = 'shop:';
const REFERENCE_PREFIX = 'ref:';
const HOST_PREFIX = 'host:';
const TTL = config.vendorDataCacheExpireMinutes *  60;
const ID_TTL = config.vendorIdCacheExpireMinutes *  60;


export async function setVendor({ domain, referenceId, id, payload = {} }) {
    if (!referenceId || !id) throw new Error('Missing required reference');

    const dataKey = `${SHOP_PREFIX}${referenceId}`;
    const referenceKey = `${REFERENCE_PREFIX}${referenceId}`;
    const hostKey = `${HOST_PREFIX}${domain}`;

    // Store data with TTL
    let storeData;
    try {
        storeData = JSON.stringify({ id, referenceId, ...payload });
    } catch (err) {
        throw new Error('Failed to serialize vendor payload for Redis');
    }

    const pipeline = sessionRedis.pipeline();
    pipeline.setex(dataKey, TTL, storeData);
    pipeline.setex(referenceKey, ID_TTL, id);
    
    if(domain){
        pipeline.setex(hostKey, ID_TTL, id);
        // pipeline.zadd(hostKey, now, referenceId );
        // pipeline.expire(hostKey, ID_TTL);
        // pipeline.zcard(hostKey); 
    }

    try {
        await pipeline.exec();
        return {      success: true, 
                          key: dataKey,
                 referenceKey,
                      message: 'Vendor data stored'     };
    } catch (error) {
        console.error('Redis operation failed:', error);
        throw new Error('Failed to update vendor data');
    }
}

export async function getVendor(referenceId) {
    if (!referenceId) throw new Error('Identifier required');

    const dataKey = `${SHOP_PREFIX}${referenceId}`;
    const referenceKey = `${REFERENCE_PREFIX}${referenceId}`;

    try {
        // 1. Try direct lookup first
        const vendorData = await sessionRedis.get(dataKey);

        if (!vendorData) {
                const refPipeline = sessionRedis.pipeline();
                refPipeline.get(referenceKey);
                refPipeline.expire(referenceKey, ID_TTL);
                const [[, idReferenceResult]] = await refPipeline.exec();

                return {
                    success: false,
                    data: null,
                    existId: Boolean(idReferenceResult),
                    id: idReferenceResult || null,
                    message: 'Vendor data not found'
                };
            }
        // 3. Update TTLs since data is valid


        // 4. Parse safely
        let parsedData;
        try {
            parsedData = JSON.parse(vendorData);
        } catch {
            return {
                success: false,
                data: null,
                message: 'Invalid cached data format'
            };
        }
        await Promise.all([ sessionRedis.expire(dataKey, TTL),
                            sessionRedis.expire(referenceKey, ID_TTL) ]);

        return {
            success: true,
            data: parsedData,
            message: 'Data found successfully'
        };

    } catch (error) {
        console.error('Redis operation failed:', error);
        if (process.env.NODE_ENV === 'development') throw error;
        throw new Error('Failed to retrieve vendor data');
    }
}




