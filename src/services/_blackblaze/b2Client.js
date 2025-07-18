// lib/backblaze/b2Client.js
import B2 from 'backblaze-b2';

const b2 = new B2({
  applicationKeyId: process.env.B2_APPLICATION_KEY_ID,
  applicationKey: process.env.B2_APPLICATION_KEY,
});

let lastAuth = 0;

export async function authorizeB2() {
  const now = Date.now();
  if (now - lastAuth > 23 * 60 * 60 * 1000) {
    await b2.authorize();
    lastAuth = now;
  }
  return b2;
}