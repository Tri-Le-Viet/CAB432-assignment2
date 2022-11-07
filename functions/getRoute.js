const axios = require("axios");
require('dotenv').config();

const google_api_key = process.env.GOOGLE_API_KEY;

async function getRoute(start, end, redisClient) {
  let route;

  // If redis cache is unavailable
  if (!redisClient) {
    return await getRouteNoRedis(start, end);
  }
  let formattedStart = start.replaceAll(' ', '')
  let formattedEnd = end.replaceAll(' ', '')
  let redisKey = formattedStart + "-" + formattedEnd;
  const result = await redisClient.get(redisKey);
  if (result) {
    const resultJSON = JSON.parse(result);
    return(resultJSON);
  } else {
    route = await getRouteNoRedis(start, end);
    // Don't push to redis if an error has occurred
    if (route != 400 && route != 503) {
      redisClient.setEx(
        redisKey,
        900,
        JSON.stringify(route)
      );
    }
    return route;
  }

}

async function getRouteNoRedis(start, end) {
  let route_url = "https://maps.googleapis.com/maps/api/directions/json?origin=" +
    start.replace(/ /g, "+") + "&destination=" +
    end.replace(/ /g, "+") + "&key=" + google_api_key;

  try {
    let directions_response = await axios.get(route_url);
    if (directions_response.data.routes.length === 0) {
      return 400;
    }
    return directions_response.data.routes[0];
  } catch (e) {
    console.log(e);
    return 503;
  }
}

module.exports = { getRoute };
