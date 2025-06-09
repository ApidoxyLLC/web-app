export function addMinutesToISO(minutes) {
  const now = new Date();
  const futureTime = new Date(now.getTime() + minutes * 60 * 1000);
  return futureTime.toISOString();
}
export default addMinutesToISO;