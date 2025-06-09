import crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const SALT_LENGTH = 16;
const IV_LENGTH = 12;
const AUTH_TAG_LENGTH = 16;
const HEADER_LENGTH = SALT_LENGTH + IV_LENGTH + AUTH_TAG_LENGTH;

export async function encrypt({data, options }) {
    const { secret, algorithm=ALGORITHM } = options

    if (!secret) throw new Error('Secret is required');
    if (algorithm !== ALGORITHM) throw new Error('Unsupported algorithm');

    const salt = crypto.randomBytes(SALT_LENGTH);
    const iv = crypto.randomBytes(IV_LENGTH); 

    const key = await new Promise((resolve, reject) => {
        crypto.scrypt(secret, salt, 32, (err, derivedKey) => {
            if (err) reject(err);
            else resolve(derivedKey);
        });
    });

    const cipher = crypto.createCipheriv(algorithm, key, iv);
    const encrypted = Buffer.concat([cipher.update(data, 'utf8'), cipher.final()]);
    const authTag = cipher.getAuthTag();
    return Buffer.concat([salt, iv, authTag, encrypted]).toString('base64');
}

export async function decrypt({cipherText, options}) {
    const { secret, algorithm = ALGORITHM } = options    

    if (!secret) throw new Error('Secret is required');
    if (algorithm !== ALGORITHM) throw new Error('Unsupported algorithm');

let buffer;
    try {
        buffer = Buffer.from(cipherText, 'base64');
    } catch (error) {
        console.log(error)
        throw new Error('Invalid base64 encoding');
    }

    if (buffer.length < HEADER_LENGTH) {
        throw new Error('Invalid ciphertext length');
    }

    const salt = buffer.subarray(0, SALT_LENGTH);
    const iv = buffer.subarray(SALT_LENGTH, SALT_LENGTH + IV_LENGTH);
    const authTag = buffer.subarray(SALT_LENGTH + IV_LENGTH, HEADER_LENGTH);
    const encrypted = buffer.subarray(HEADER_LENGTH);

    if (authTag.length !== AUTH_TAG_LENGTH) {
        throw new Error('Invalid authentication tag length');
    }

    try {
        const key = await new Promise((resolve, reject) => {
            crypto.scrypt(secret, salt, 32, (err, derivedKey) => {
                if (err) reject(err);
                else resolve(derivedKey);
            });
        });

        const decipher = crypto.createDecipheriv(algorithm, key, iv);
        decipher.setAuthTag(authTag);

        return Buffer.concat([
            decipher.update(encrypted),
            decipher.final()
        ]).toString('utf8');
    } catch (error) {
        throw new Error(`Decryption failed: ${error.message}`);
    }
}