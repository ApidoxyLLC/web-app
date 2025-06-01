export default function getRandomItemSafe(array) {
  if (array.length === 0) return null;
  return array[Math.floor(Math.random() * array.length)];
}