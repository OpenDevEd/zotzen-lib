// To run within the repo:
const zotzenlib = require('../src/zotzen-lib')
//const zenodo = require("zenodo-lib");
//const Zotero = require("zotero-lib");

// To run after installing the library
// const zotzenlib = require('zotzen-lib')
async function main() {
    // Rather than using zotzenlib.create to create a pair of linked records, let's create two records separately.
    // Create a Zenodo record. 
    [zenodoRecord, doi] = await zotzenlib.zenodoCreate({title: "Testing Linking"});
    [zoteroRecord,
        zoteroRecordGType,
        zoteroRecordGroup,
        zoteroRecordVersion
    ] = await zotzenlib.zoteroCreate({title: "Testing Linking"})
    console.log(`zenodoID=${zenodoRecord.id} / ${doi}; zoteroKey=${zoteroRecord.key}`)
    // now see whether these are linked (which they are not)    
    let linkrequest = {
        id: `${zenodoRecord.id}`,
        key: zoteroRecord.key,
        group_id: zoteroRecordGroup,
        library_type: zoteroRecordGType,
        debug: false,
        show: false,
        link: false
    }
    let result = await zotzenlib.link(linkrequest)
    /* linkrequest.link = true
    result = await zotzenlib.link(linkrequest)
    linkrequest.link = false
    result = await zotzenlib.link(linkrequest)
    */
    console.log("zotzen result=" + JSON.stringify(result, null, 2)) 
}
main();

    /* const result = await zotzenlib.link({
        id: "10.5072/zenodo.717127",
        key: "D5MASQRH",
        group_id: 2259720,
        debug: false,
        show: false,
    }) */
/*    const result = await zotzenlib.link({
        "key": "EFBVC7EC",
        "id": "717477",
        "group_id": 2259720,
        link: true
    }) */
