import { createClient } from 'redis';

// 检查环境变量
if (!process.env.REDIS_URL) {
  console.error('REDIS_URL environment variable is not set');
}

// 创建 Redis 客户端
const redisClient = createClient({
  url: process.env.REDIS_URL
});

// 连接 Redis
redisClient.connect().then(() => {
  console.log('Redis connected successfully');
}).catch(error => {
  console.error('Redis connection error:', error);
  console.error('REDIS_URL:', process.env.REDIS_URL ? 'Set' : 'Not set');
});

export default async function handler(req, res) {
  const { method } = req;

  console.log(`API request received: ${method} ${req.url}`);
  console.log('REDIS_URL is set:', !!process.env.REDIS_URL);
  console.log('Redis client status:', redisClient.isReady ? 'Ready' : 'Not ready');

  if (method === 'GET') {
    try {
      console.log('Attempting to get data from Redis...');
      const data = await redisClient.get('stock_tracker_data');
      console.log('Data retrieved from Redis:', data ? `Found ${JSON.parse(data).length} stocks` : 'No data found');
      res.status(200).json({ success: true, data: data ? JSON.parse(data) : [] });
    } catch (error) {
      console.error('Error reading data:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  } else if (method === 'POST') {
    try {
      const { data } = req.body;
      console.log('Attempting to save data to Redis...', { stockCount: data?.length || 0 });
      await redisClient.set('stock_tracker_data', JSON.stringify(data));
      console.log('Data saved to Redis successfully');
      res.status(200).json({ success: true });
    } catch (error) {
      console.error('Error saving data:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  } else {
    res.setHeader('Allow', ['GET', 'POST']);
    res.status(405).json({ success: false, error: `Method ${method} Not Allowed` });
  }
}

export const config = {
  runtime: 'nodejs',
};