const { uploadImages } = require('./functions/uploadImages');
const cron = require('node-cron');
const { createClient } = require('redis');

// Redis init
const elasticache_config_endpoint = { url: "redis://@n11025875-trafficcache.km2jzi.ng.0001.apse2.cache.amazonaws.com:6379" }
const redisClient = createClient(elasticache_config_endpoint);
(async () => {
  try {
    await redisClient.connect();
    console.log(`Connected to ${elasticache_config_endpoint.url}`)
  } catch (err) {
    console.log(err);
  }
})();

cron.schedule('* * * * *', () => {
    try {
      console.log('running a task every minute');
      uploadImages(redisClient);
    }
    catch (e) {
      console.log(e)
    }
  });
  