const express = require("express");
const path = require("path");
const axios = require("axios");
const bodyParser = require("body-parser");
const bound = require("./functions/isInBounds.js");
const cors = require("cors");
const helmet = require("helmet");
const checkObjects = require("./functions/checkObjects");
const getObject = require('./functions/getObject');
// const { uploadImages } = require('./functions/uploadImages');
const { getCamList } = require('./functions/retrieveCameraList');
const { checkRedisAndMakeList, filterForUnfound, filterForFound } = require('./functions/RedisCheck')
// const cron = require('node-cron');
require('dotenv').config();
// * TensorFlow
const tf = require('@tensorflow/tfjs-node');
const coco_ssd = require("@tensorflow-models/coco-ssd");
// * Redis 
const { createClient } = require('redis');

const port = process.env.PORT || 8080;
const trafficCams = require("./trafficCams.json"); //TODO: use the cached results instead

// * Init Model
let model = undefined;
(async () => {
  model = await coco_ssd.load({
    base: "mobilenet_v1",
  });
})();

// Redis init
const elasticache_config_endpoint = { url: "redis://@n11025875-trafficcache.km2jzi.ng.0001.apse2.cache.amazonaws.com:6379" }
const redisClient = createClient(elasticache_config_endpoint);
(async () => {
  try {
    await redisClient.connect();
    console.log(`Connected to ${elasticache_config_endpoint.url}`)
  } catch (err) {
    console.log(err);
  }
})();

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
