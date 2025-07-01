// import Redis from 'ioredis';

// let redis;

// export function getRedisClient() {
//   if (redis) return redis;

//   const mode = process.env.REDIS_MODE;

//   if (mode === 'cluster') {
//     const nodes = process.env.REDIS_CLUSTER_NODES.split(',').map((node) => {
//       const [host, port] = node.split(':');
//       return { host, port: parseInt(port) };
//     });

//     redis = new Redis.Cluster(nodes, {
//       scaleReads: 'slave', // optional for read scaling
//       redisOptions: {
//         password: process.env.REDIS_PASSWORD || undefined,
//       },
//     });

//   } else {
//     redis = new Redis({
//       host: process.env.REDIS_HOST,
//       port: parseInt(process.env.REDIS_PORT),
//       password: process.env.REDIS_PASSWORD || undefined,
//     });
//   }

//   redis.on('error', (err) => console.error('Redis Error:', err));
//   return redis;
// }