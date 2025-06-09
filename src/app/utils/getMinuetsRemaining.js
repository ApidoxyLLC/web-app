export function getMinutesRemaining(expiryTimestamp) {
  const now = Date.now();
  const diffMs = expiryTimestamp - now;
  const minutes = Math.floor(diffMs / (1000 * 60));
  return minutes > 0 ? minutes : 0;
}
export default getMinutesRemaining