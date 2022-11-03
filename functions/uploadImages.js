const trafficCams = require('../trafficCams.json');
const axios = require('axios');
const { PutObjectCommand } = require("@aws-sdk/client-s3");
const { s3Client } = require("../libs/s3Client.js");
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
    console.log(
      "Successfully uploaded object: " +
      bucketParams.Bucket +
      "/" +
      bucketParams.Key + " "
    )
  };
  upload();
};

function uploadImages() {
  for (let i = 0; i < trafficCams.length; i++) {
    const timestamp = (new Date()).toLocaleString("en-US", { timeZone: "Australia/Brisbane" });
    const time = timestamp.replaceAll('/', '-');
    const key = trafficCams[i].properties.description + "/" + time + ".jpg";
    s3Upload(trafficCams[i].properties.image_url, key);
  };
};

module.exports = { uploadImages };


