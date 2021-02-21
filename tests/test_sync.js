const zotzenlib = require('../src/zotzen-lib')
const zenodo = require('zenodo-lib')
async function main() {
  const data = {
    "zoteroItemKey": "GTAMHC4B",
    "zoteroGroup": 2259720
  }
  let result
  const val = 2
  if (val == 0) {
    result = await zotzenlib.link({
      key: data.zoteroItemKey,
      group_id: data.zoteroGroup,
      link: true
    })
    console.log("result = " + JSON.stringify(result, null, 2))
  }
  if (val == 1) {
    result = await zotzenlib.sync({
      key: data.zoteroItemKey,
      group_id: data.zoteroGroup,
      metadata: true,
      attachments: true,
      strict: true,
      // publish: true
      //verbose: true,
      //debug: true,
      //show: true
    })
    console.log("result 1 = " + JSON.stringify(result, null, 2))
    // If you specify 'strict' above, you get the filenames back:
    // result[0].files[0].filename
    // result[0].files[0].checksum
    // Check that files are there:
    //record = await zenodo.record({ id: 733847, strict: true })
    //console.log("TEMPORARY=" + JSON.stringify(record, null, 2))
  }
  if (val == 2) {
    result = await zotzenlib.sync({
      key: data.zoteroItemKey,
      group_id: data.zoteroGroup,
      publish: true
      //verbose: true,
      //debug: true,
      //show: true
    })
    //console.log("result 2 = " + JSON.stringify(result, null, 2))
    console.log("state: "+result[0]["state"])
    console.log("submitted: "+result[0]["submitted"])
    // Unclear why the resulting record shows in-progress.
    // why can't intermediate depositions accessed?
    /*
    state string	One of the values:
* inprogress: Deposition metadata can be updated. If deposition is also unsubmitted (see submitted) files can be updated as well.
* done: Deposition has been published.
* error: Deposition is in an error state - contact our support.

submitted bool	True of deposition has been published, False otherwise.
    */
  }
}
main();
