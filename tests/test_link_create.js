// To run within the repo:
const zotzenlib = require('../src/zotzen-lib')
// To run after installing the library
// const zotzenlib = require('zotzen-lib')

// Unlink test_link.js, which demonstrates how to link, this file demonstrates how to create a record.
async function main() {
    // Rather than using zotzenlib.create to create a pair of linked records, let's create two records separately.
    // Create a new Zotero record. 
    [zoteroRecord,
        zoteroRecordGType,
        zoteroRecordGroup,
        zoteroRecordVersion
    ] = await zotzenlib.zoteroCreate({ title: "Testing Linking plus create" })
    console.log(`zoteroKey=${zoteroRecord.key}`)
    // now see whether this is linked to anything (which it is not, as we have just created it)    
    let linkrequest = {
        key: zoteroRecord.key,
        group_id: zoteroRecordGroup,
        library_type: zoteroRecordGType,
        debug: false,
        show: false,
        link: false
    }
    let result = await zotzenlib.link(linkrequest)
    // Now request linking, which will generate the missing record
    linkrequest.link = true
    result = await zotzenlib.link(linkrequest)
    // result: records are linked:  
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
