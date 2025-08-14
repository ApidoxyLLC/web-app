import crypto, { timingSafeEqual } from 'crypto';
export function hashTokenId(tokenId) { return crypto.createHash('sha256').update(tokenId).digest('hex');}
export default hashTokenId;