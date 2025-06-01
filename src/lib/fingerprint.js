import FingerprintJS from '@fingerprintjs/fingerprintjs';

export async function getFingerprint() {
  const fp = await FingerprintJS.load();
  return await fp.get();
}