// lib/redis/keys.js
export const cacheKeys = {
  user: (id) => `user:{${id}}`,   // Ensures same slot in cluster
  session: (token) => `session:{${token}}`,
};