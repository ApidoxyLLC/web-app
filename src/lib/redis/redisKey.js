export function makeRedisKey({ accountId, vendorId, scope, key }) {
  if (!accountId || !vendorId || !scope || !key) {
    throw new Error('Missing key parts');
  }
  return `${accountId}:${vendorId}:${scope}:${key}`;
}