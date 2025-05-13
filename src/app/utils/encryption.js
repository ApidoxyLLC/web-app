import sodium from 'libsodium-wrappers';
import dotenv from 'dotenv';

dotenv.config(); // Load .env

await sodium.ready;

const getKey = () => {
  const base64Key = process.env.ENCRYPTION_KEY;
  if (!base64Key) throw new Error('ENCRYPTION_KEY is not defined in .env');
  const key = sodium.from_base64(base64Key);
  if (key.length !== sodium.crypto_secretbox_KEYBYTES) {
    throw new Error('ENCRYPTION_KEY must be 32 bytes (Base64 encoded)');
  }
  return key;
};

/**
 * Encrypt text using the key from environment
 */
export async function encrypt(plainText) {
  const key = getKey();
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
export async function decrypt(ciphertextBase64, nonceBase64) {
  const key = getKey();
  const ciphertext = sodium.from_base64(ciphertextBase64);
  const nonce = sodium.from_base64(nonceBase64);

  const decryptedBytes = sodium.crypto_secretbox_open_easy(ciphertext, nonce, key);
  if (!decryptedBytes) throw new Error('Decryption failed');
  return sodium.to_string(decryptedBytes);
}