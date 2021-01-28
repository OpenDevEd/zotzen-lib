// To run wihtin the repo:
const zotzenlib = require('../src/zotzen-lib')
// To run independently
// const zotzenlib = require('zotzen-lib')
async function main() {
  const Zotero = require('zotero-lib')
  const fs = require('fs')

  var zotero = new Zotero({ verbose: true, "group-id": 2405685 })
  let items = await zotero.items({
    collection: "WH2PXB8P",
    top: true
  })
  items = items.map(element => {
    let doi = ""
    let id = 0
    const extra = element.data.extra.split("\n")
    extra.forEach(element => {
      let res = element.match(/^\s*doi:\s*(.*?(\d+))$/i)
      if (res) {
        doi = res[1]
        id = res[2]
      }
    });
    return {
      itemType: element.data.itemType,
      key: element.data.key,
      reportType: element.data.reportType,
      reportNumber: element.data.reportNumber,
      extra: element.data.extra,
      title: element.data.title,
      doi: doi,
      id: id
    }
  });
  // console.log("final=" + JSON.stringify(items, null, 2))
  let result = []
  items.sort((a,b) => (a.reportNumber > b.reportNumber) ? 1 : ((b.reportNumber > a.reportNumber) ? -1 : 0))
  for (i in items) {
    console.log(`----------****  ${i}      *****---------------`)
    const element = items[i]
    console.log("element=" + JSON.stringify(element, null, 2))
    if (element.id != "") {
      const r = await zotzenlib.zotzenSyncOne({
        group_id: 2405685,
        key: element.key,
        id: element.id
      })
      result.push(r)
    } else {

    }
  };
  console.log("--------------------------------")
  //console.log("final=" + JSON.stringify(result, null, 2))

  /*
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
  */
}
main();
