import config from "../../../../../../config";

export async function refreshGoogleToken(refreshToken) {
  const params = new URLSearchParams({
    client_id: config.googleClientId,
    client_secret: config.googleClientSecret,
    grant_type: 'refresh_token',
    refresh_token: refreshToken,
  });

  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: params,
  });

  const data = await res.json();

  if (!res.ok) {
    console.error('Failed to refresh Google token:', data);
    throw new Error(data.error || 'Google token refresh failed');
  }

  return {
    accessToken: data.access_token,
    accessTokenExpires: Date.now() + data.expires_in * 1000,
    refreshToken: data.refresh_token || refreshToken, // May not return new one
  };
}
export default refreshGoogleToken;