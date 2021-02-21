// To run wihtin the repo:
const zotzenlib = require('../src/zotzen-lib')
// To run independently
// const zotzenlib = require('zotzen-lib')
const zenodo = require('zenodo-lib')

async function main() {
  const fs = require('fs')

  const groupid = 2259720
  const gtype = "group"
  const key = "GTAMHC4B"
  const result = await zotzenlib.newversion({group_id: groupid, key: key, group_type: gtype})   
  // Link Zotero item with Zenodo item.

}
main();

