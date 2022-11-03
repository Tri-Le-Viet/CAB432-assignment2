const express = require("express");
const app = express();
const axios = require('axios');
const cors = require("cors");
const helmet = require("helmet");
const checkObjects = require("./functions/checkObjects");
const getObject = require('./functions/getObject');
const { uploadImages } = require('./functions/uploadImages');
const { getCamList } = require('./functions/retrieveCameraList');
const { checkRedisAndMakeList, filterForUnfound, filterForFound } = require('./functions/RedisCheck')
const cron = require('node-cron');
require('dotenv').config();
// * TensorFlow
const tf = require('@tensorflow/tfjs-node');
const coco_ssd = require("@tensorflow-models/coco-ssd");
// * Redis 
const { createClient } = require('redis');

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

app.use(helmet());

app.use(cors({
  origin: '*',
  allowedHeaders: ['Content-Type', 'Authorization'],
  methods: ['GET', 'PUT', 'POST']
}));

const PORT = process.env.PORT || 5000;
app.use(express.json());

app.disable('query parser');

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

cron.schedule('* * * * *', () => {
  try {
    console.log('running a task every minute');
    uploadImages(redisClient);
  }
  catch (e) {
    console.log(e)
  }
});

app.listen(PORT, () => {
  console.log(`Server started on port ${PORT}`);
});


