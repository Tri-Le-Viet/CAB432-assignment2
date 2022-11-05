const express = require("express");
const path = require("path");
const axios = require("axios");
const redis = require("redis");
const bodyParser = require("body-parser");
const ejs = require("ejs");
const cors = require("cors");
const helmet = require("helmet");
const bound = require("./functions/isInBounds.js")
const checkObjects = require("./functions/checkObjects");
const getObject = require('./functions/getObject');
const { uploadImages } = require('./functions/uploadImages');
const { getCamList } = require('./functions/retrieveCameraList');
const { checkRedisAndMakeList, filterForUnfound, filterForFound } = require('./functions/RedisCheck')
const cron = require('node-cron');
/*
// * TensorFlow
const tf = require('@tensorflow/tfjs-node');
const coco_ssd = require("@tensorflow-models/coco-ssd");
// * Redis
const { createClient } = require('redis');
*/

// Load environment variables
require('dotenv').config();

const port = process.env.PORT || 8080;
const traffic_cams = require("./traffic_cams.json"); //TODO: in final we should recreate traffic_cams.json each time

const google_api_key = process.env.GOOGLE_API_KEY;

const app = express();
app.set("view engine", "ejs");
app.set("views", path.resolve(__dirname + "/views"));
app.use(express.static(__dirname + "/public"));
app.use(bodyParser.urlencoded({
  extended: true
}));

app.use(helmet());
app.use(cors({
  origin: '*',
  allowedHeaders: ['Content-Type', 'Authorization'],
  methods: ['GET', 'PUT', 'POST']
}));

// Init Model
let model;
(async () => {
  model = await coco_ssd.load({
    base: "mobilenet_v1",
  });
})();

// Redis init
const elasticache_config_endpoint = { url: "redis://@n11025875-trafficcache.km2jzi.ng.0001.apse2.cache.amazonaws.com:6379" }
let redisClient = createClient(elasticache_config_endpoint);
(async () => {
  try {
    await redisClient.connect();
    console.log(`Connected to ${elasticache_config_endpoint.url}`)
  } catch (err) {
    console.log(err);
    redisClient = null;
  }
})();


app.get("/", (req, res) => {
  let error = req.query.error;
  res.render("index", {
    key:google_api_key,
    traffic_cams:JSON.stringify(traffic_cams),
    error_type: error
  });
});

app.post("/search", async (req, res) => {
  if (!model) {
    res.status(500).send("Model is not loaded yet!");
    return;
  }

  try {
    request = {
      start: req.body.start,
      end: req.body.end,
      start_coords : req.body.start_coords,
      end_coords : req.body.end_coords
    };
  } catch(e) {
    // shouldn't be possible but just in case redirect user back to index
    res.status(400).redirect("/error=input");
  }

  console.log(request);

  let route = getRoute(request.start, request.end);
  if (route === 503) {
    res.status(503).send("Google Maps Directions API not available. Try again later");
  } else if (route === 400){
    res.status(400).redirect("/?error=route");
  } else {
    let steps = route.legs[0].steps;
    let relevant_cameras = [];

    for (let i = 0; i < steps.length; i++) {
      for (let j = 0; j < traffic_cams.length; j++) {
        // Find start and end location of each leg as well as camera location
        let start_location = [steps[i].start_location.lat, steps[i].start_location.lng];
        let end_location = [steps[i].end_location.lat, steps[i].end_location.lng];
        let point = traffic_cams[j].geometry.coordinates;

        // check if camera in between start and end coordinates
        if (bound.isInBounds(start_location, end_location, point, 0.001)) {
          relevant_cameras.push(traffic_cams[j]);
        }
      }
    }

    console.log("Found all cameras");

    // now we have the list of steps so we can plot or do what we want with them

    res.render("search", {
      key:google_api_key,
      traffic_cams:JSON.stringify(relevant_cameras),
      start_name: request.start,
      start_coords: request.start_coords,
      end_name: request.end,
      end_coords: request.end_coords
    });
  }
});

async function getRoute(start, end) {
  let redis_key = start + " - " + end;
  let result = await redisClient.get(redis_key);
  let route;
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

cron.schedule('* * * * *', () => {
  try {
    console.log('running a task every minute');
    uploadImages(redisClient);
  }
  catch (e) {
    console.log(e)
  }
});

app.listen(port, console.log("Server started on port " + port));
