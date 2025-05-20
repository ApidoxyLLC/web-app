import sodium from 'libsodium-wrappers';
import dotenv from 'dotenv';
const CRYPTO_KEY_BYTES = sodium.crypto_secretbox_KEYBYTES;


dotenv.config(); // Load .env

await sodium.ready;

const TOKEN_CONFIG = {
  access_token: {
    envVar: 'ACCESS_TOKEN_ENCRYPTION_KEY',
    keyBytes: CRYPTO_KEY_BYTES,
    purpose: 'Access Token Encryption'
  },
  refresh_token: {
    envVar: 'REFRESH_TOKEN_ENCRYPTION_KEY',
    keyBytes: CRYPTO_KEY_BYTES,
    purpose: 'Refresh Token Encryption'
  }
};

// const getKey = (tokenType) => {
//   if(tokenType == 'access_token'){
//     const base64Key = process.env.ACCESS_TOKEN_ENCRYPTION_KEY;
//     if (!base64Key) throw new Error('ENCRYPTION_KEY is not defined in .env');
//     const key = sodium.from_base64(base64Key);
//     if (key.length !== sodium.crypto_secretbox_KEYBYTES) {
//       throw new Error('ENCRYPTION_KEY must be 32 bytes (Base64 encoded)');
//     }
//     return key;
//   }
//   if(tokenType == 'refresh_token'){
//     const base64Key = process.env.REFRESH_TOKEN_ENCRYPTION_KEY;
//     if (!base64Key) throw new Error('ENCRYPTION_KEY is not defined in .env');
//     const key = sodium.from_base64(base64Key);
//     if (key.length !== sodium.crypto_secretbox_KEYBYTES) {
//       throw new Error('ENCRYPTION_KEY must be 32 bytes (Base64 encoded)');
//     }
//     return key;
//   }
// };





const getSecureKey = (tokenType) => {
  // const accessKey = getSecureKey('access_token');
  // const refreshKey = getSecureKey('refresh_token');
  // Validate token type
  const config = TOKEN_CONFIG[tokenType];
  if (!config) {
    throw new Error(`Invalid token type: ${tokenType}. 
      Supported types: ${Object.keys(TOKEN_CONFIG).join(', ')}`);
  }

  // Retrieve environment variable
  const base64Key = process.env[config.envVar];
  if (!base64Key) {
    throw new Error(`${config.envVar} environment variable not configured. 
      Required for: ${config.purpose}`);
  }

  // Convert and validate key
  try {
    const key = sodium.from_base64(base64Key);
    
    if (key.length !== config.keyBytes) {
      throw new Error(
        `Invalid key length for ${config.envVar}. 
        Expected ${config.keyBytes} bytes, got ${key.length} bytes. 
        Generate with: sodium.randombytes_buf(${config.keyBytes})`
      );
    }
    
    return key;
  } catch (error) {
    throw new Error(`Key processing failed for ${config.envVar}: ${error.message}`);
  }
};
/**
 * Encrypt text using the key from environment
 */
export async function encrypt(plainText, tokenType) {
  const key = getSecureKey(tokenType);
  const nonce = sodium.randombytes_buf(sodium.crypto_secretbox_NONCEBYTES);
  const messageBytes = sodium.from_string(plainText);
  const ciphertext = sodium.crypto_secretbox_easy(messageBytes, nonce, key);

  return {
    ciphertext: sodium.to_base64(ciphertext),
    nonce: sodium.to_base64(nonce),
  };
}

/**
 * Decrypt text using the key from environment
 */
export async function decrypt(ciphertextBase64, nonceBase64, tokenType) {
  const key = getSecureKey(tokenType);
  const ciphertext = sodium.from_base64(ciphertextBase64);
  const nonce = sodium.from_base64(nonceBase64);

  const decryptedBytes = sodium.crypto_secretbox_open_easy(ciphertext, nonce, key);
  if (!decryptedBytes) throw new Error('Decryption failed');
  return sodium.to_string(decryptedBytes);
}