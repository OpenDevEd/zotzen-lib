// To run wihtin the repo:
const zotzenlib = require('../src/zotzen-lib')
// To run independently
// const zotzenlib = require('zotzen-lib')
const zenodo = require('zenodo-lib')

async function main() {
  const Zotero = require('zotero-lib')
  const fs = require('fs')

  const groupid = 2259720
  const gtype = "group"
  const key = "GTAMHC4B"
  var zotero = new Zotero({ verbose: true, "group-id": groupid })
  let linkrequest = {
    key: key,
    group_id: groupid,
    library_type: gtype,
    debug: false,
    show: false,
    link: false
  }
  let result = await zotzenlib.link(linkrequest)
  // console.log("TEMPORARY=" + JSON.stringify(result, null, 2))
  if (result.status != 0) {
    console.log("The items provided are not linked")
    process.exit(1)
  }
  if (result.originaldata.zenodo.length != 1) {
    console.log("LIBRARY-ERROR: Zenodo item was not retrieved.")
    process.exit(1)
  }

  const zenodorecord = result.originaldata.zenodo[0]
  console.log("TEMPORARY=" + JSON.stringify(zenodorecord, null, 2))
  if (zenodorecord.state === "unsubmitted") {
    console.log("The Zenodo item had pending changes. Cannot create new version.")
    process.exit(1)
  }
  if (!zenodorecord.submitted) {
    console.log("The Zenodo item is unsubmitted. You do not have to create a new version.")
    process.exit(1)
  }
  console.log("Proceeding to create a new version.")
  const res = await zenodo.newversion({
    id: [ zenodorecord.id ]
  })
  console.log("TEMPORARY="+JSON.stringify(   res     ,null,2))   
  // Link Zotero item with Zenodo item.

}
main();
