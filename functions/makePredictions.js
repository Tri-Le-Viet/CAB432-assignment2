const { checkRedisAndMakeList, filterForUnfound, filterForFound } = require('./RedisCheck');
const checkObjects = require("./checkObjects");
const getObject = require('./getObject');

const tf = require('@tensorflow/tfjs-node');

require('dotenv').config();

const getImageAndPredict = async (cams, redis_client, model) => {
    const func = await checkRedisAndMakeList(cams, redis_client)
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
        return joined_results
      })
    return func
  }

  module.exports = { getImageAndPredict };