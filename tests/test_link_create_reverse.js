// To run within the repo:
const zotzenlib = require('../src/zotzen-lib')
// To run after installing the library
// const zotzenlib = require('zotzen-lib')

// Unlink test_link.js, which demonstrates how to link, this file demonstrates how to create a record.
async function main() {
    // Rather than using zotzenlib.create to create a pair of linked records, let's create two records separately.
    // Create a Zenodo record. 
    [zenodoRecord, doi] = await zotzenlib.zenodoCreate({ title: "Testing Linking: Creating Zenodo, then autocreating zotero" });
    console.log(`zenodoID=${zenodoRecord.id} / ${doi}`)
    // now see whether this is linked to anything (which it is not, as we have just created it)    
    let linkrequest = {
        id: doi, // Can use either doi or id 
        debug: false,
        show: false,
        link: false
    }
    let result = await zotzenlib.link(linkrequest)
    // Now request linking, which will generate the zotero record
    linkrequest.link = true
    result = await zotzenlib.link(linkrequest)
    console.log("zotzen result=" + JSON.stringify(result, null, 2))
}
main();
