const axios = require('axios');
const { PutObjectCommand, ListObjectsCommand } = require("@aws-sdk/client-s3");
const { s3Client } = require("../libs/s3Client.js");
const { getCamList } = require('./retrieveCameraList');
const { viewAlbum } = require("./checkObjects");
require('dotenv').config();

async function s3Upload(url, key) {
  const resp = await axios.get(url, {
    decompress: false,
    responseType: 'arraybuffer',
  });

  const upload = async () => {
    const bucketParams = {
      Bucket: process.env.AWS_BUCKET,
      Key: key,
      Body: resp.data,
    };

    await s3Client.send(new PutObjectCommand(bucketParams));
  };
  upload();
};

async function uploadImages(redisClient) {
  try {
    const cameraList = await getCamList(redisClient);
    const trafficCams = cameraList.features;
    const data = await s3Client.send(
      new ListObjectsCommand({
        Bucket: process.env.AWS_BUCKET,
      })
    );
    const getLogs = async (data) => {
      if(typeof data.Contents != "undefined"){
        const logs = await Promise.all(data.Contents.map(async function (piece) {
          return piece.Key;
        }))
        return logs
      }
    }
    const logs = await getLogs(data);
    
    for (let i = 0; i < trafficCams.length; i++) {
      var currentDateTime = await new Date();
      await currentDateTime.setSeconds(00);
      const timestamp = (new Date(currentDateTime)).toLocaleString("en-GB", { timeZone: "Australia/Brisbane" }).replaceAll('/', '-');
      const key = trafficCams[i].properties.description + "/" + timestamp + ".jpg";
      if((typeof logs == "undefined") ||!logs.includes(key)) {
        s3Upload(trafficCams[i].properties.image_url, key);
      } else {}
    };
    console.log(
      "Successfully uploaded objects" + new Date()
    )
  } catch (err) {
    console.log(err)
  }

};

module.exports = { uploadImages };