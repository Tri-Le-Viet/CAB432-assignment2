const express = require("express");
const app = express();
const axios = require('axios');
const cors = require("cors");
const helmet = require("helmet");
const checkObjects = require("./functions/checkObjects");
const getObject = require('./functions/getObject');
const { uploadImages } = require('./functions/uploadImages');
const cron = require('node-cron');
require('dotenv').config();
const { writeFile } = require("fs");
// * TensorFlow
const tf = require('@tensorflow/tfjs-node');
const coco_ssd = require("@tensorflow-models/coco-ssd");

// * Init Model
let model = undefined;
(async () => {
  model = await coco_ssd.load({
    base: "mobilenet_v1",
  });
})();

app.use(helmet());

app.use(cors({
  origin: '*',
  allowedHeaders: ['Content-Type', 'Authorization'],
  methods: ['GET', 'PUT', 'POST']
}));

const PORT = process.env.PORT || 5000;
app.use(express.json());

app.disable('query parser')

app.post("/predict", (req, res) => {
  const cams = req.body.cameras
  if (!model) {
    res.status(500).send("Model is not loaded yet!");
    return;
  }
  const getImageAndPredict = async () => {
    await checkObjects.viewAlbum(cams)
      .then(async (results) => {
        return results
      })
      .then(async (imageUrls) => {
        const imageBuff = await getObject.retrieveImagesArray(imageUrls);
        return imageBuff
      })
      .then(async (buffers) => {
        const buffersOfCamera = await Promise.all(buffers.map(async function (cameras) {
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
        // const path = 'results.json';
        // await writeFile(path, JSON.stringify(buffersOfCamera), (error) => {
        //   if (error) {
        //     console.log('An error has occurred ', error);
        //     return;
        //   }
        //   console.log('Data written successfully to disk');
        // });
        res.status(200).send(buffersOfCamera)
      })
  }
  getImageAndPredict()
});

cron.schedule('* * * * *', () => {
  console.log('running a task every minute');
  uploadImages();
});

app.listen(PORT, () => {
  console.log(`Server started on port ${PORT}`);
});


