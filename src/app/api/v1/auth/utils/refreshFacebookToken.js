export async function refreshFacebookToken(refreshToken) {
  const params = new URLSearchParams({
    grant_type: "fb_exchange_token",
    client_id: process.env.FACEBOOK_CLIENT_ID,
    client_secret: process.env.FACEBOOK_CLIENT_SECRET,
    fb_exchange_token: refreshToken,
  });

  const res = await fetch(`https://graph.facebook.com/v18.0/oauth/access_token?${params}`);
  const data = await res.json();

  if (!res.ok) throw new Error(data.error?.message || "Failed to refresh Facebook token");

  return {
    accessToken: data.access_token,
    accessTokenExpires: Date.now() + data.expires_in * 1000,
    refreshToken, // Facebook doesn't return a new one
  };
}
export default refreshFacebookToken;