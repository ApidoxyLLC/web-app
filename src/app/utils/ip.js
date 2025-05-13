import { headers } from "next/headers";

export async function getClientIp() {
  const requestHeaders = headers();
  const xForwardedFor = requestHeaders.get("x-forwarded-for");
  const xRealIp = requestHeaders.get("x-real-ip");
  const cfConnectingIp = requestHeaders.get("cf-connecting-ip");

  if (xForwardedFor) {
    return xForwardedFor.split(",")[0].trim();
  } else if (xRealIp) {
    return xRealIp;
  } else if (cfConnectingIp) {
    return cfConnectingIp;
  } else {
    return null; // Fallback if no IP is found
  }
}