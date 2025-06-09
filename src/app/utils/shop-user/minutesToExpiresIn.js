export default function minutesToExpiresIn(minutes) {
  if (typeof minutes !== 'number' || minutes < 0) {
    throw new Error('minutes must be a non-negative number');
  }

  const MINUTES_IN_HOUR = 60;
  const MINUTES_IN_DAY = 1440; // 24 * 60

  // If it cleanly fits into days
  if (minutes >= MINUTES_IN_DAY && minutes % MINUTES_IN_DAY === 0) {
    const days = minutes / MINUTES_IN_DAY;
    return `${days}d`;
  }

  // If it cleanly fits into hours
  if (minutes >= MINUTES_IN_HOUR && minutes % MINUTES_IN_HOUR === 0) {
    const hours = minutes / MINUTES_IN_HOUR;
    return `${hours}h`;
  }

  // Otherwise, express in minutes
  return `${minutes}m`;
}