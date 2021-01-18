// To run within the repo:
const zotzenlib = require('../src/zotzen-lib')
// To run after installing the library
// const zotzenlib = require('zotzen-lib')
async function main() {
    const result = await zotzenlib.link({
        id: "10.5072/zenodo.717127",
        key: "D5MASQRH",
        group_id: 2259720,
        debug: false,
        show: false,
    })
    /*
    const result = await zotzenlib.link({        
        id: "10.5072/zenodo.717127",
        group_id: 2259720
        link: true
    })
    const result = await zotzenlib.link({        
        key: "D5MASQRH",
        group_id: 2259720,
    })
    */
    // If linked correct, then sync
    if (result.linkedCorrectly) {
        const result = await zotzenlib.sync({
            id: "10.5072/zenodo.717127",
            key: "D5MASQRH",
            group_id: 2259720,
            debug: false,
            show: false,
            attachments: true,
            metadata: true,
            publish: true
        })
    }
    /*
    Record [___ zotero://select/groups/2259720/items/D5MASQRH ____]
    [Sync] ...success...
    [Publish] ...success...
    */
    console.log("zotzen result=" + JSON.stringify(result, null, 2))
}
main();
