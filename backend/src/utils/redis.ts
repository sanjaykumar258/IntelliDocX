import { createClient } from 'redis';
import dotenv from 'dotenv';

dotenv.config();

console.log('Redis Configuration:', {
  REDIS_URL: process.env.REDIS_URL,
  NODE_ENV: process.env.NODE_ENV
});

const redisClient = createClient({
  url: process.env.REDIS_URL || 'redis://redis:6379',
  socket: {
    reconnectStrategy: (retries) => {
      if (retries > 10) {
        console.error('Redis connection retries exhausted');
        return new Error('Redis connection retries exhausted');
      }
      const delay = Math.min(retries * 100, 3000);
      console.log(`Redis connection lost. Retrying in ${delay}ms...`);
      return delay;
    }
  }
});

redisClient.on('error', (err) => console.log('Redis Client Error', err));

(async () => {
  if (!redisClient.isOpen) {
    try {
      await redisClient.connect();
      console.log('Connected to Redis');
    } catch (error) {
      console.error('Failed to connect to Redis. Running without Redis cache.');
    }
  }
})();

export default redisClient;

export const clearDocumentCache = async (organizationId: string) => {
  if (redisClient.isOpen) {
    try {
      const pattern = `docs:list:${organizationId}:*`;
      const keys = await redisClient.keys(pattern);
      if (keys.length > 0) {
        await redisClient.del(keys);
        console.log(`[Cache] Cleared ${keys.length} keys for org ${organizationId}`);
      }
    } catch (err) {
      console.warn('[Cache] Failed to clear document cache', err);
    }
  }
};
