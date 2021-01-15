const zotzenlib = require('./index')
async function run() {
    const result = await zotzenlib.create({
        "title": "ABC",
        "authors": "",
        "description": "",
        "reportNumber": "",
        "reportType": "",
        "date": "",
        "url": "",
        "tags": [],
        "collections": [],
        "team": ""
    })
    console.log("zotzen result=" + JSON.stringify(result, null, 2))
}
run();