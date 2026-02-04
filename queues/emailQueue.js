// emailQueue.js
const Bull = require('bull');
const Redis = require('ioredis');
console.log('process.env.REDIS_URL',process.env.REDIS_URL);

// Create Redis connection for monitoring only
const redisMonitor = new Redis(process.env.REDIS_URL || 'redis://127.0.0.1:6379');

redisMonitor.on('error', (err) => {
  console.error('❌ Redis connection error:', err);
});

redisMonitor.on('connect', () => {
  console.log('✅ Email queue Redis connected');
});

// Bull works with older Redis versions
const emailQueue = new Bull('send-salary-slip', process.env.REDIS_URL || 'redis://127.0.0.1:6379');

module.exports = { emailQueue };