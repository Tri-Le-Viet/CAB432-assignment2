const express = require("express");
const path = require("path");
const axios = require("axios");
const redis = require("redis");
const ejs = require("ejs");
require('dotenv').config();


const port = process.env.PORT || 8080;
const trafficCams = require("./trafficCams.json"); //TODO: in final we should recreate trafficCams.json each time

const redisPort = process.env.REDIS_PORT;
const redisHost = process.env.REDIS_HOST;
const redisPass = process.env.REDIS_PASS;
const api_key = process.env.API_KEY;

const app = express();

app.set("view engine", "ejs");
app.set("views", path.resolve(__dirname + "/views"));
app.use(express.static(__dirname + "/public"));

//TODO: redis client


app.get("/", (req, res) => {
  res.render("index", {key:api_key, trafficCams:JSON.stringify(trafficCams)});
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
    + "&destination=" + request.end + "&key=" + api_key; //TODO: switch to env var

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
      if (isInBounds(start_location, end_location, point, 0.001)) {
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

app.listen(port, console.log("Server started on port " + port));
