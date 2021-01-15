const zotzenlib = require('./index')
async function run() {
    const result = await zotzenlib.create({
        title: "ABC"
    })
    console.log("zotzen result=" + JSON.stringify(result, null, 2))
}
run();