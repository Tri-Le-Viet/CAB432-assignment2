
const makeRedisKeys = async (camera) => {
    var currentDateTime = await new Date();
    let keyarr = []
    await currentDateTime.setSeconds(00);
    for (let i = 0; i < 5; i++) {
        await currentDateTime.setMinutes(currentDateTime.getMinutes() - 1);
        let time = (new Date(currentDateTime)).toLocaleString("en-GB", { timeZone: "Australia/Brisbane" }).replaceAll('/', '-');
        const redisKey = `${camera}/${time}.jpg`;
        await keyarr.push(redisKey)
    }
    await currentDateTime.setMinutes(currentDateTime.getMinutes() + 60);
    return keyarr;
};

const checkResults = async (redisClient, keyList) => {
    const listedResults = await Promise.all(keyList.map(async key => {
        const formattedKey = key.replaceAll(" ", "")
        const result = await redisClient.get(formattedKey);
        if (result !== null) {
            const listedResult = await JSON.parse(result);
            return {
                loggedImage: key,
                results: listedResult
            }
        } else {
            return key
        }
    }))
    return listedResults
}

const checkRedisAndMakeList = async (cams, redisClient) => {
    const keyLists = Promise.all(cams.map(async function (camera) {
    const keys = await makeRedisKeys(camera)
    const results = await checkResults(redisClient, keys)
    return {
        name: camera,
        keys: results
    }
  }))
  return keyLists;
}

function isString(value) {
    if(typeof(value) === "string"){
        return true;
    }
  }

  function filterByString(item) {
    if(isString(item)) {
        return true
      }
      return false
  }

const filterForUnfound = async (results) => {
    const filteredList = await Promise.all(results.map(async function (result) {
        const eachValue = await Promise.all(result.keys.filter(filterByString))
        return {
          name: result.name,
          keys: eachValue
        }
      }))
      return filteredList
}

function isObject(obj) {
    return typeof(obj) === "object";
  }

  function filterByObject(item) {
    if(isObject(item)) {
        return true
      }
      return false
  }

const filterForFound = async (results) => {
    const filteredList = await Promise.all(results.map(async function (result) {
        const eachValue = await Promise.all(result.keys.filter(filterByObject))
        return {
            cameraName: result.name,
            images: eachValue
        }
      }))
      return filteredList
}

module.exports = { checkRedisAndMakeList, filterForUnfound, filterForFound };