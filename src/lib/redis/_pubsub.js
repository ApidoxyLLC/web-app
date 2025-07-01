// import Redis from 'ioredis';

// const redisUrl = process.env.REDIS_URL || 'redis://127.0.0.1:6379';

// // Create separate clients
// const pub = new Redis(redisUrl);
// const sub = new Redis(redisUrl);

// // Publish a message
// export function publish(channel, message) {
//   return pub.publish(channel, JSON.stringify(message));
// }

// // Subscribe to a channel with a callback
// export function subscribe(channel, handler) {
//   sub.subscribe(channel);
//   sub.on('message', (chan, msg) => {
//     if (chan === channel) {
//       try {
//         handler(JSON.parse(msg));
//       } catch {
//         handler(msg); // fallback if not JSON
//       }
//     }
//   });
// }