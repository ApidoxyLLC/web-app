import  _sodium from 'libsodium-wrappers';

const TOKEN_CONFIG = {
  access_token: {
    envVar: 'ACCESS_TOKEN_ENCRYPTION_KEY',
    purpose: 'Access Token Encryption',
  },
  refresh_token: {
    envVar: 'REFRESH_TOKEN_ENCRYPTION_KEY',
    purpose: 'Refresh Token Encryption',
  },
};

async function ensureSodiumReady() {
    return await _sodium.ready;
}

// const sodium = await _sodium.ready


async function getSecureKey(tokenType, sodium) {
  // const sodium = await ensureSodiumReady();

  const config = TOKEN_CONFIG[tokenType];
  if (!config) {
    throw new Error(
      `Invalid token type: ${tokenType}. Supported types: ${Object.keys(TOKEN_CONFIG).join(', ')}`
    );
  }

  const base64Key = process.env[config.envVar];
  if (!base64Key) {
    throw new Error(`${config.envVar} environment variable not configured. Required for: ${config.purpose}`);
  }
  // if (!/^[\w-]+={0,2}$/.test(base64Key)) {
  //     throw new Error('Invalid base64 format');
  //   }

  let key;
  try {
    console.log(base64Key)
    key = sodium.from_base64(base64Key, sodium.base64_variants.URLSAFE);
    console.log(key)
  } catch (error) {
    throw new Error(`Failed to decode base64 key for ${config.envVar}: ${error.message}`);
  }

  const keyBytes = sodium.crypto_secretbox_KEYBYTES;
  if (key.length !== keyBytes) {
    throw new Error(
      `Invalid key length for ${config.envVar}. Expected ${keyBytes} bytes, got ${key.length} bytes.`
    );
  }
  return key;
}

export async function encrypt(plainText, tokenType) {
  const readysodium = await _sodium.ready;
  
  const sodium = _sodium;
  console.log(sodium)
  // console.log(_sodium)
  const key = await getSecureKey(tokenType, sodium);
  const nonce = sodium.randombytes_buf(sodium.crypto_secretbox_NONCEBYTES);
  const messageBytes = sodium.from_string(plainText);
  const ciphertext = sodium.crypto_secretbox_easy(messageBytes, nonce, key);

  return {
    ciphertext: sodium.to_base64(ciphertext),
    nonce: sodium.to_base64(nonce),
  };
}

export async function decrypt(ciphertextBase64, nonceBase64, tokenType) {
  // const sodium  = await ensureSodiumReady();
  const sodium = await _sodium.ready
  const key = await getSecureKey(tokenType);
  const ciphertext = sodium.from_base64(ciphertextBase64);
  const nonce = sodium.from_base64(nonceBase64);

  const decryptedBytes = sodium.crypto_secretbox_open_easy(ciphertext, nonce, key);
  if (decryptedBytes === null) {
    throw new Error('Decryption failed: invalid key or corrupted data');
  }

  return sodium.to_string(decryptedBytes);
}