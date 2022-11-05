const { uploadImages } = require('./functions/uploadImages');
const cron = require('node-cron');

cron.schedule('* * * * *', () => {
    try {
      console.log('running a task every minute');
      uploadImages(redisClient);
    }
    catch (e) {
      console.log(e)
    }
  });
  