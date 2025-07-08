
const config = {
    maxDbConnections: parseInt(process.env.DB_MAX_CONNECTION || '40', 10),
    maxAuthDbConnections: parseInt(process.env.DB_MAX_AUTH_CONNECTIONS || '10', 10),
    // maxShopConnections: parseInt(process.env.DB_MAX_SHOP_CONNECTIONS || '5', 10),
    maxTenantConnections: parseInt(process.env.DB_MAX_TENANT_CONNECTIONS || '5', 10),
    connectionTtl: parseInt(process.env.DB_CONNECTION_TTL_MINUTES || '10', 10) * 60 * 1000,
    maxWait: parseInt(process.env.DB_MAX_WAIT_MS || '3000', 10),
    waitInterval: parseInt(process.env.DB_WAIT_INTERVAL_MS || '3000', 10),
    errCacheTtl: parseInt(process.env.DB_ERROR_CACHE_TTL_MS || '10000', 10),
    errRetryInterval: parseInt(process.env.DB_ERROR_RETRY_INTERVAL_MS || '60000', 10),
    connectionHealthCheckInterval: parseInt(process.env.DB_CONNECTION_HEALTH_CHECK_INTERVAL || '30000', 10),
    connectionLockTimeout: parseInt(process.env.DB_CONNECTION_LOCK_TIMEOUT || '50000', 10),
};
export default config
