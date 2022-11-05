async function getRoute(start, end, redis_client) {
  let route;

  // If redis cache is unavailable
  if (!redis_client) {
    getRouteNoRedis(start, end);
  }

  let redis_key = start + " - " + end;
  let result = await redisClient.get(redis_key);

  if (result) {
    route = JSON.parse(result);
  } else {
    route = getRouteNoRedis(request);
    // Don't push to redis if an error has occurred
    if (route != 400 && route != 503) {
      redisClient.setEx(
        redis_key,
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

  let directions_response;
  try {
    directions_response = await axios.get(route_url);
    if (directions_response.data.routes.length === 0) {
      return 400;
    }
    return directions_response.data.routes[0];
  } catch (e) {
    return 503;
  }
}

module.exports = { getRoute };
