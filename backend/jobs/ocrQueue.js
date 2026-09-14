const Queue = require('bull');
const redis = require('redis');

const ocrQueue = new Queue('ocr processing', {
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: process.env.REDIS_PORT || 6379,
    password: process.env.REDIS_PASSWORD || undefined,
  },
  defaultJobOptions: {
    removeOnComplete: 10,
    removeOnFail: 5,
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 2000,
    },
  },
});

// Event listeners for monitoring
ocrQueue.on('completed', (job, result) => {
  console.log(`OCR Job ${job.id} completed successfully`);
});

ocrQueue.on('failed', (job, err) => {
  console.error(`OCR Job ${job.id} failed:`, err.message);
});

ocrQueue.on('stalled', (job) => {
  console.warn(`OCR Job ${job.id} stalled`);
});

module.exports = ocrQueue;
