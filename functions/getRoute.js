const axios = require("axios");

async function getRoute(start, end, redis_client, google_api_key) {
  let route;

  // If redis cache is unavailable
  if (!redis_client) {
    return await getRouteNoRedis(start, end, google_api_key);
  }

  let redis_key = start + " - " + end;
  let result = await redis_client.get(redis_key);
  if (result) {
    route = JSON.parse(result);
  } else {
    route = await getRouteNoRedis(start, end, google_api_key);
    // Don't push to redis if an error has occurred
    if (route != 400 && route != 503) {
      redis_client.setEx(
        redis_key,
        900,
        JSON.stringify(route)
      );
    }
    return route;
  }

}

async function getRouteNoRedis(start, end, google_api_key) {
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
