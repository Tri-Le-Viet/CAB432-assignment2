const express = require("express");
const path = require("path");
const bodyParser = require("body-parser");
const axios = require("axios");
const redis = require("redis");
require('dotenv').config();

const app = express();
const port = 8080; // TODO: replace port number process.env.PORT
const trafficCams = require("./trafficCams.json"); //TODO: in final we should recreate trafficCams.json each time
const redisPort = process.env.REDIS_PORT;
const redisHost = process.env.REDIS_HOST;
const redisPass = process.env.REDIS_PASS;

app.use(bodyParser.urlencoded({extended:false}));
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, "public")));

//TODO: redis client

app.get("/", (req, res) => {
  console.log("Hello, world!");
  res.sendFile(path.join(__dirname, "/index.html"));
});

app.post("/search", async (req, res) => {
  request = {
    start: req.body.start.replace(/ /g, "+"),
    end: req.body.end.replace(/ /g, "+"),
    start_coords : req.body.start_coords,
    end_coords : req.body.end_coords
  };

  console.log(request);


  // TODO: check Redis cache for route here

  let route_url = "https://maps.googleapis.com/maps/api/directions/json?origin=" + request.start
    + "&destination=" + request.end + "&key=" + process.env.API_KEY; //TODO: switch to env var

  let response = await axios.get(route_url);
  let top_route = response.data.routes[0];
  let steps = top_route.legs[0].steps;

  let relevant_cameras = [];

  for (let i = 0; i < steps.length; i++) {
    for (let j = 0; j < trafficCams.length; j++) {
      let start_location = [steps[i].start_location.lat, steps[i].start_location.lng];
      let end_location = [steps[i].end_location.lat, steps[i].end_location.lng];
      let point = trafficCams[j].geometry.coordinates;

      // check if camera in between start and end coordinates
      if (isInBoundsRough(start_location, end_location, point, 0.001)) {
        console.log(trafficCams[j].properties.description);
        console.log(start_location + " " + point + " " +end_location);
        relevant_cameras.push(trafficCams[j]);
      }
    }
  }

  console.log(steps.length + " " + trafficCams.length);
  console.log("All cameras found"); // TODO :remove once testing done

  // TODO: push route to redis, with expiry of 15 minutes
  // key is {start_location} - {end_location}

  // now we have the list of steps so we can plot or do what we want with them
});

// TODO: move out of this file when done testing
function isInBounds(start_location, end_location, point) {
  if (isNumBetween(start_location[0], end_location[0], point[1]) &&
    isNumBetween(start_location[1], end_location[1], point[0])) {

    return true;
  }

  return false;
}

function isNumBetween(bound1, bound2, num) {
  if ((bound1 < num && bound2 > num) || (bound1 > num && bound2 < num)) {
    return true;
  }

  return false;
}

function isInBoundsRough(start_location, end_location, point, radius) {
  if (isNumBetweenRough(start_location[0], end_location[0], point[1], radius) &&
    isNumBetweenRough(start_location[1], end_location[1], point[0], radius)) {

    return true;
  }

  return false;
}

function isNumBetweenRough(bound1, bound2, num, radius) {
  if ((((bound1 - radius) < num) && ((bound2 + radius) > num)) ||
    (((bound1 + radius) > num) && ((bound2 - radius) < num))) {

    return true;
  }

  if (isNumBetween(bound1, bound2, num)) {
    console.log(bound1 + " " + num + " " + bound2);
  }

  return false;
}

app.listen(port, console.log("Server started on port " + port));
