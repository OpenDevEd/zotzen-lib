/*

*/
const Zotero = require('zotero-lib')
const fs = require('fs')
const zotzen = require('../src/zotzen-lib')

async function test() {
  const zotero = new Zotero({"group-id": 2259720})
  console.log("settings=" + JSON.stringify(zotero, null, 2))
  // Get the report template
  let template = {
    template: "report"
  }
  let report = await zotero.create_item(template)
  console.log("template=" + JSON.stringify(report, null, 2))
  report.title = "Zotzen: Zotero create_item"
  const res2 = await zotero.create_item({
    item: report
  })
  const s = JSON.stringify(res2, null, 2)
  console.log(s)   
  console.log("linking....")    
  const res3 = await zotzen.link({
    "group_id": 2259720,
    "key": res2.key,
    link: true
  })
  return 0
}

// 2259720

test()



// run the library