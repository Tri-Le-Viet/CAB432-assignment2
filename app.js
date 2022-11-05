const express = require("express");
const path = require("path");
const axios = require("axios");
const bodyParser = require("body-parser");
const ejs = require("ejs");
const cors = require("cors");
const helmet = require("helmet");

const bound = require("./functions/isInBounds.js")
const checkObjects = require("./functions/checkObjects");
const getObject = require('./functions/getObject');
const { uploadImages } = require('./functions/uploadImages');
const { getCamList } = require('./functions/retrieveCameraList');
const { checkRedisAndMakeList, filterForUnfound, filterForFound } = require('./functions/RedisCheck');
const { getRoute } = require("./functions/getRoute");
// const cron = require('node-cron');

// * TensorFlow
const tf = require('@tensorflow/tfjs-node');
const coco_ssd = require("@tensorflow-models/coco-ssd");
// * Redis
const { createClient } = require('redis');

// Load environment variables
require('dotenv').config();

const port = process.env.PORT || 8080;
const traffic_cams = require("./traffic_cams.json"); //TODO: in final we should recreate traffic_cams.json each time

const google_api_key = process.env.GOOGLE_API_KEY;

const app = express();
app.use(express.json());
app.use(helmet());

app.use(cors({
  origin: '*',
  allowedHeaders: ['Content-Type', 'Authorization'],
  methods: ['GET', 'PUT', 'POST']
}));

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

  console.log(request); //TODO: remove once done testing

  let waypoints = [];
  let route = getRoute(request.start, request.end, redis_client);

  if (route === 503) {
    res.status(503).send("Google Maps Directions API not available. Try again later");
  } else if (route === 400){
    res.status(400).redirect("/?error=route");
  } else {
    let steps = route.legs[0].steps;
    let relevant_cameras = [];

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
        }
      }
    }

    console.log("Found all cameras");

    // TODO: add analysis here

    res.render("search", {
      key:google_api_key,
      traffic_cams:JSON.stringify(relevant_cameras),
      start_name: request.start,
      start_coords: request.start_coords,
      end_name: request.end,
      end_coords: request.end_coords,
      waypoints: JSON.stringify(waypoints)
    });
  }
});

// Route to retrieve list of traffic cameras
app.get("/api", async (req, res) => {
  getCamList(redisClient)
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

  const getImageAndPredict = async () => {
    checkRedisAndMakeList(cams, redisClient)
      .then(async (results) => {
        const found = await filterForFound(results)
        const unfound = await filterForUnfound(results)
        const imageBuff = await getObject.retrieveImagesArray(unfound);
        const buffersOfCamera = await Promise.all(imageBuff.map(async function (cameras) {
          const imagesOfcamera = await Promise.all(cameras.buffers.map(async function (image) {
            const decodedImage = await tf.node.decodeImage(image.imageBuffers);
            const predictions = await model.detect(decodedImage, 20, 0.15)
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
            images: imagesOfcamera
          }
        }))
        const joinedResults = await Promise.all(found.map(async function (camera, index) {
          camera.images.forEach(async element => {
            const redisKey = `${element.loggedImage}`.replaceAll(" ", "");
            const redisValue = element.results.toString();
            await redisClient.setEx(
              redisKey,
              300,
              redisValue
            );
          });
          buffersOfCamera[index].images.forEach(async element => {
            const redisKey2 = `${element.loggedImage}`.replaceAll(" ", "");
            const redisValue2 = element.results.toString();
            await redisClient.setEx(
              redisKey2,
              300,
              redisValue2
            );
          });
          let newArr = []
          const newResultsArray = newArr.concat(camera.images, buffersOfCamera[index].images);
          return {
            cameraName: camera.cameraName,
            images: newResultsArray
          }
        }))
        res.status(200).send(joinedResults)
      })
  }
  getImageAndPredict()
});

// cron.schedule('* * * * *', () => {
//   try {
//     console.log('running a task every minute');
//     uploadImages(redisClient);
//   }
//   catch (e) {
//     console.log(e)
//   }
// });

app.listen(port, console.log("Server started on port " + port));
