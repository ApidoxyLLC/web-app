import crypto from 'crypto';
import config from '../../../../../../config';
export function generateTokenId() {return crypto.randomBytes(config.accessTokenIdLength).toString("hex") }
export default generateTokenId;