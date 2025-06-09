export default function minutesToExpiryTimestamp(minutes) {
  if (typeof minutes !== 'number' || minutes < 0) {
    throw new Error('minutes must be a non-negative number');
  }
  return Date.now() + minutes * 60 * 1000;
}