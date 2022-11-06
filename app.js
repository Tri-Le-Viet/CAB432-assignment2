const express = require("express");
const path = require("path");
const axios = require("axios");
const bodyParser = require("body-parser");
const ejs = require("ejs");
const cors = require("cors");
const bound = require("./functions/isInBounds.js")
const checkObjects = require("./functions/checkObjects");
const getObject = require('./functions/getObject');
const { uploadImages } = require('./functions/uploadImages');
const { getCamList } = require('./functions/retrieveCameraList');
const { checkRedisAndMakeList, filterForUnfound, filterForFound } = require('./functions/RedisCheck');
const { getRoute } = require("./functions/getRoute");

// * TensorFlow
const tf = require('@tensorflow/tfjs-node');
const coco_ssd = require("@tensorflow-models/coco-ssd");
// * Redis
const { createClient } = require('redis');

// Load environment variables
require('dotenv').config();

const port = process.env.PORT || 8080;

const google_api_key = process.env.GOOGLE_API_KEY;

const app = express();
app.use(express.json());
app.use(cors({
  origin: '*',
  allowedHeaders: ['Content-Security-Policy', 'Content-Type', 'Authorization'],
  methods: ['GET', 'PUT', 'POST']
}));
app.set("view engine", "ejs");
app.set("views", path.resolve(__dirname + "/views"));
app.use(express.static(__dirname + "/public"));
app.use(bodyParser.urlencoded({
  extended: true
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
let redis_client = createClient(elasticache_config_endpoint);
(async () => {
  try {
    await redis_client.connect();
    console.log(`Connected to ${elasticache_config_endpoint.url}`)
  } catch (err) {
    console.log(err);
    redis_client = null;
  }
})();



app.get("/", async (req, res) => {
  let error = req.query.error;
  const cameraList = await getCamList(redis_client);
  const traffic_cams = cameraList.features;
  res.render("index", {
    key:google_api_key,
    traffic_cams:JSON.stringify(traffic_cams),
    error_type: error
  });
});

app.post("/search", async (req, res) => {
  // If user accesses page before model is loaded
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
    return;
  }

  let waypoints = [];
  let route = await getRoute(request.start, request.end, redis_client, google_api_key);
  if (route === 503) {
    res.status(503).send("Google Maps Directions API not available. Try again later");
  } else if (route === 400){
    res.status(400).redirect("/?error=route");
  } else {
    let steps = route.legs[0].steps;
    let relevant_cameras = [];
    let camera_names = [];

    const cameraList = await getCamList(redis_client);
    const traffic_cams = cameraList.features;
    for (let i = 0; i < steps.length; i++) {
      // Find start and end location of each leg
      let start_location = [steps[i].start_location.lat, steps[i].start_location.lng];
      let end_location = [steps[i].end_location.lat, steps[i].end_location.lng];

      if (i != steps.length - 1) {
        waypoints.push(end_location);
      }

      for (let j = 0; j < traffic_cams.length; j++) {
        // Find coordinates of each camera
        let point = traffic_cams[j].geometry.coordinates;
        // check if camera in between start and end coordinates
        if (bound.isInBounds(start_location, end_location, point, 0.001)) {
          relevant_cameras.push(traffic_cams[j]);
          camera_names.push(traffic_cams[j].properties.description);
        }
      }
    }

    console.log("Found all cameras");

    let traffic_data = getImageAndPredict(camera_names);

    res.render("search", {
      key:google_api_key,
      traffic_cams:JSON.stringify(relevant_cameras),
      start_name: request.start,
      start_coords: request.start_coords,
      end_name: request.end,
      end_coords: request.end_coords,
      waypoints: JSON.stringify(waypoints),
      data: JSON.stringify(traffic_data)
    });
  }
});

// Route to retrieve list of traffic cameras
app.get("/api", async (req, res) => {
  getCamList(redis_client)
    .then((result) => {
      res.json(result);
    })
});

// Route to return count of vehicles for every image of each camera in 60min window
app.post("/predict", (req, res) => {
  const cams = req.body.cameras
  if (!model) {
    res.status(500).send("Model is not loaded yet!");
    return;
  }


  getImageAndPredict(cams, redis_client)
});

const getImageAndPredict = async (cams, redis_client) => {
  checkRedisAndMakeList(cams, redis_client)
    .then(async (results) => {
      const found = await filterForFound(results)
      const unfound = await filterForUnfound(results)
      const image_buff = await getObject.retrieveImagesArray(unfound);
      const buffers_of_camera = await Promise.all(image_buff.map(async function (cameras) {
        const images_of_camera = await Promise.all(cameras.buffers.map(async function (image) {
          const decoded_image = await tf.node.decodeImage(image.imageBuffers);
          const predictions = await model.detect(decoded_image, 20, 0.15)
            .then((result) => {
              const types = ["truck", "bus", "motorcycle", "car"]
              let count = 0;
              result.forEach(element => {
                if (types.includes(element.class))
                  return count++
              });
              return count
            })
          const obj = {
            loggedImage: image.key,
            results: predictions
          }
          return obj
        }))
        return {
          cameraName: cameras.camera,
          images: images_of_camera
        }
      }))
      const joined_results = await Promise.all(found.map(async function (camera, index) {
        camera.images.forEach(async element => {
          const redis_key = `${element.loggedImage}`.replaceAll(" ", "");
          const redisValue = element.results.toString();
          await redis_client.setEx(
            redis_key,
            300,
            redisValue
          );
        });
        buffers_of_camera[index].images.forEach(async element => {
          const redis_key2 = `${element.loggedImage}`.replaceAll(" ", "");
          const redisValue2 = element.results.toString();
          await redis_client.setEx(
            redis_key2,
            300,
            redisValue2
          );
        });
        let new_arr = []
        const new_results_array = new_arr.concat(camera.images, buffers_of_camera[index].images);
        return {
          cameraName: camera.cameraName,
          images: new_results_array
        }
      }))
      res.status(200).send(joined_results)
    })
}

app.listen(port, console.log("Server started on port " + port));
