// To run wihtin the repo:
const zotzenlib = require('../src/zotzen-lib')
// To run independently
// const zotzenlib = require('zotzen-lib')
async function main() {
    /* // Create a pair of records
    const result = await zotzenlib.create({
    group_id: 2259720,
    title: "Item title (via from)",
    authors: ["First Second Last; affiliation","First2 Last2; affiliation2"],
    reportNumber: "100-from-form",               
    reportType: "Some report type - from form",  
    date: "2021-01-01", 
    collections: ["9TXY6FAP"],  
    institution: "EdTech Hub",
    language: "en",           
    rights: "Creative Commons Attribution 4.0", 
    tags: ["_r:AddedByZotZen"],
    description: "An output of the EdTech Hub, https://edtechhub.org",
  })
  console.log("zotzen result=" + JSON.stringify(result, null, 2))
  const data = result.data */
    const data = {
        "zenodoRecordID": 717569,
        "zoteroItemKey": "NKX3RG5B",
        "zoteroGroup": 2259720,
        "zoteroSelectLink": "zotero://select/group/2259720/items/NKX3RG5B",
        "DOI": "10.5072/zenodo.717569",
    }
    let result
    //result = await zotzenlib.sync({ key: [data.zoteroItemKey], debug: false, show: false })
    //console.log("dry-run (much like 'link' =" + JSON.stringify(result, null, 2))
    // Now sync metadata
    result = await zotzenlib.sync({ key: [data.zoteroItemKey], metadata: true, show: true })
    console.log("result =" + JSON.stringify(result, null, 2))
    result = await zotzenlib.sync({ key: [data.zoteroItemKey], metadata: true, attachments: true, show: true })

}
main();
