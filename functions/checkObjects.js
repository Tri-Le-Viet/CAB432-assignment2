const { ListObjectsCommand } = require("@aws-sdk/client-s3");
const { s3Client } = require("../libs/s3Client.js");

const listAlbums = async () => {
  try {
    const data = await s3Client.send(
      new ListObjectsCommand({ Delimiter: "/", Bucket: process.env.AWS_BUCKET })
    );
    const albums = await Promise.all(data.CommonPrefixes.map(async (commonPrefix) => {
      const prefix = commonPrefix.Prefix;
      const albumName = await decodeURIComponent(prefix.replace("/", ""));
      return albumName;
    }));
    return albums;
  } catch (err) {
    return console.log("There was an error listing your albums: " + err.message);
  }
};

const viewAlbum = async (albumNames) => {
  try {
    const albums = await Promise.all(albumNames.map(async function (album) {
      const albumBucketName = process.env.AWS_BUCKET;
      const data = await s3Client.send(
        new ListObjectsCommand({
          Prefix: album,
          Bucket: albumBucketName,
        });
      );
      const photos = await Promise.all(data.Contents.map(function (photo) {
        const photoKey = photo.Key;
        return photoKey
      }));
      return {
        name: album,
        keys: photos
      };
    }));
    return albums;
  } catch (err) {
    return console.log("There was an error viewing your album: " + err.message);
  }
};

module.exports = { viewAlbum, listAlbums };
