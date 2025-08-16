import crypto from 'crypto';
export default function hashTokenId(tokenId) { return crypto.createHash('sha256').update(tokenId).digest('hex');}