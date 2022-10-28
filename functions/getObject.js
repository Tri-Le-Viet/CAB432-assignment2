const { GetObjectCommand } = require("@aws-sdk/client-s3");
const { s3Client } = require("../libs/s3Client.js");
const fs = require("fs");

const retrieveImage = async (imageKey) => {
  try {
    const params = {
      Bucket: process.env.AWS_BUCKET,
      Key: imageKey
    };
    // Create a helper function to convert a ReadableStream to a buffer.
    const streamToBuffer = (stream) =>
      new Promise((resolve, reject) => {
        const chunks = [];
        stream.on("data", (chunk) => chunks.push(chunk));
        stream.on("error", reject);
        stream.on("end", async () => resolve(Buffer.concat(chunks)));
      });

    // Get the object} from the Amazon S3 bucket. It is returned as a ReadableStream.
    const data = await s3Client.send(new GetObjectCommand(params));
    // Convert the ReadableStream to a buffer.
    const bodyContents = await streamToBuffer(data.Body);
    await fs.writeFileSync("new-path.jpg", bodyContents);
      return bodyContents;
  } catch (err) {
    console.log("Error", err);
  }
};



module.exports = { retrieveImage };


