export async function getBkashToken() {
  const app_key = process.env.BKASH_APP_KEY;
  const app_secret = process.env.BKASH_APP_SECRET;
  const username = process.env.BKASH_USERNAME;
  const password = process.env.BKASH_PASSWORD;
  console.log("app_key:", app_key);
  console.log("app_secret:", app_secret);
  console.log("username:", username);
  console.log("password:", password);

  const bkashBaseURL = 'https://tokenized.pay.bka.sh/v1.2.0-beta';

  try {
    const res = await fetch(`${bkashBaseURL}/tokenized/checkout/token/grant`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'username': username,
        'password': password,
        'x-app-key': app_key,
      },
      body: JSON.stringify({
        app_key,
        app_secret,
      }),
    });

    const responseData = await res.json();

    console.log("bKash Token API Response:", responseData);

    if (responseData.statusCode !== '0000') {
      const message = responseData.statusMessage || responseData.message || responseData.error || "Unknown error";
      throw new Error(`bKash token error: ${message}`);
    }

    return `Bearer ${responseData.id_token}`;
  } catch (err) {
    console.error("Failed to get bKash token:", err.message || err);
    throw err;
  }
}
