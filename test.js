const camera = "Albany Creek - Southpine Rd & Eatons Crossing Rd - South"
const makeRedisKeys = async (camera) => {
    var currentDateTime = await new Date();
    let keyarr = []
    await currentDateTime.setSeconds(00);
    for (let i = 0; i < 60; i++) {
        await currentDateTime.setMinutes(currentDateTime.getMinutes() - 1);
        let time = (new Date(currentDateTime)).toLocaleString("en-GB", { timeZone: "Australia/Brisbane" }).replaceAll('/', '-');
        const redisKey = `${camera}/${time}.jpg`;
        await keyarr.push(redisKey)
    }
    await currentDateTime.setSeconds(currentDateTime.getSeconds() - 60);
    return keyarr;
};

makeRedisKeys(camera)
.then((result) => console.log(result))