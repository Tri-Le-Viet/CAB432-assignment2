const express = require("express");
const app = express();
const axios = require('axios');
const trafficCams = require('./trafficCams.json');
const checkObjects = require("./functions/checkObjects");
const getObject = require('./functions/getObject')
require('dotenv').config();
const busboy = require("busboy");
// * TensorFlow Stuff
const tf = require('@tensorflow/tfjs-node');
const coco_ssd = require("@tensorflow-models/coco-ssd");
const fs = require("fs");

// * Init Model
let model = undefined;
(async () => {
  model = await coco_ssd.load({
    base: "mobilenet_v1",
  });
})();

const getImageAndPredict = async () => {
  await checkObjects.listAlbums()
    .then(async (results) => {
      const imageUrl = await checkObjects.viewAlbum(results[5]);
      console.log(imageUrl[10])
      return imageUrl
    })
    .then(async (imageUrl) => {
      //console.log(imageUrl[10])
      const imageBuff = await getObject.retrieveImage(imageUrl[10]);
      return imageBuff
    })
    .then(async (buffer) => {
      //console.log(buffer)
      const image = await tf.node.decodeImage(buffer);
      //console.log(image)
      theModel = await coco_ssd.load({
        base: "mobilenet_v1",
      });
      const predictions = await theModel.detect(image, 20, 0.15);
      console.log(predictions)
    })
}
getImageAndPredict()

const PORT = process.env.PORT || 5000;
app.use(express.json());

app.get("/predict", (req, res) => {
  if (!model) {
    res.status(500).send("Model is not loaded yet!");
    return;
  }
  const getImageAndPredict = async () => {
    await checkObjects.listAlbums()
      .then(async (results) => {
        const imageUrl = await checkObjects.viewAlbum(results[5]);
        console.log(imageUrl[10])
        return imageUrl
      })
      .then(async (imageUrl) => {
        //console.log(imageUrl[10])
        const imageBuff = await getObject.retrieveImage(imageUrl[10]);
        return imageBuff
      })
      .then(async (buffer) => {
        const image = await tf.node.decodeImage(buffer);
        const predictions = await model.detect(image, 20, 0.15);
        console.log(predictions)
        res.status(200).send(predictions)
      })
  }
  getImageAndPredict()
});

app.listen(PORT, () => {
  console.log(`Server started on port ${PORT}`);
});


