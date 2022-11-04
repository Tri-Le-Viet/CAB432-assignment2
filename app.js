const express = require("express");
const path = require("path");
const axios = require("axios");
const redis = require("redis");
const bodyParser = require("body-parser");
const ejs = require("ejs");
const bound = require("./functions/isInBounds.js")
require('dotenv').config();

const port = process.env.PORT || 8080;
const trafficCams = require("./trafficCams.json"); //TODO: in final we should recreate trafficCams.json each time

//TODO: remove these if not necessary
const redisPort = process.env.REDIS_PORT;
const redisHost = process.env.REDIS_HOST;
const redisPass = process.env.REDIS_PASS;

const google_api_key = process.env.GOOGLE_API_KEY;

const app = express();
app.set("view engine", "ejs");
app.set("views", path.resolve(__dirname + "/views"));
app.use(express.static(__dirname + "/public"));
app.use(bodyParser.urlencoded({
  extended: true
}));

//TODO: redis client

app.get("/", (req, res) => {
  res.render("index", {key:google_api_key, trafficCams:JSON.stringify(trafficCams)});
});

app.post("/search", async (req, res) => {
  // TODO: error handling
  request = {
    start: req.body.start.replace(/ /g, "+"),
    end: req.body.end.replace(/ /g, "+"),
    start_coords : req.body.start_coords,
    end_coords : req.body.end_coords
  };

  console.log(request);


  // TODO: check Redis cache for route here

  // if route does not exist
  let route_url = "https://maps.googleapis.com/maps/api/directions/json?origin=" + request.start
    + "&destination=" + request.end + "&key=" + google_api_key;


  try {
    let response = await axios.get(route_url);
  } catch (e) {
    res.status(503).send("Google maps route API not available. Try again later");
  }

//else request route from redis

  try {
    let top_route = response.data.routes[0];
  } catch(e) {
    let error_message = "No valid route found, please try different locations";
    //TODO: send error message and redirect back to index
  }

    let steps = top_route.legs[0].steps;
    let relevant_cameras = [];

    for (let i = 0; i < steps.length; i++) {
      for (let j = 0; j < trafficCams.length; j++) {
        // Find start and end location of each leg as well as camera location
        let start_location = [steps[i].start_location.lat, steps[i].start_location.lng];
        let end_location = [steps[i].end_location.lat, steps[i].end_location.lng];
        let point = trafficCams[j].geometry.coordinates;

        // check if camera in between start and end coordinates
        if (bound.isInBounds(start_location, end_location, point, 0.001)) {
          relevant_cameras.push(trafficCams[j]);
        }
      }
    }

    console.log("Found all cameras");

    // TODO: push route to redis, with expiry of 15 minutes
    // key is {start_location} - {end_location}

    // now we have the list of steps so we can plot or do what we want with them
});

app.listen(port, console.log("Server started on port " + port));
