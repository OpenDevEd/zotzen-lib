// To run within the repo:
const zotzenlib = require('../src/zotzen-lib')
// To run after installing the library
// const zotzenlib = require('zotzen-lib')
async function main() {
    const result = await zotzenlib.link({        
        id: "10.5072/zenodo.717127",
        debug: false,
        show: false
    })
    console.log("zotzen result=" + JSON.stringify(result, null, 2))
}
main();
