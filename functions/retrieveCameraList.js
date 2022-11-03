const axios = require('axios');
require('dotenv').config();

const getCamList = async (redisClient) => {
    // The QLD Traffic URL and redis key
    const apiUrl = `https://api.qldtraffic.qld.gov.au/v1/webcams?apikey=${process.env.QLD_TRAFFIC_KEY}`;
    const redisKey = `trafficCams:list`;
    const result = await redisClient.get(redisKey);
    if (result) {
      // Serve from redis
      const resultJSON = JSON.parse(result);
      return(resultJSON);
    } else {
      // Serve from QLD Traffic and store in redis
      const response = await axios.get(apiUrl);
      const responseJSON = response.data;
      redisClient.setEx(
        redisKey,
        3600,
        JSON.stringify({ source: "Redis Cache", ...responseJSON })
      );
      return { source: "QLD Traffic API", ...responseJSON };
    }
  };

  module.exports = { getCamList };