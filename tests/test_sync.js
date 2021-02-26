const zotzenlib = require('../src/zotzen-lib')
const zenodo = require('zenodo-lib')
const Zotero = require('zotero-lib')

async function main() {
  const newrecord = process.argv[2] === "new"
  const result = newrecord ? await getNewItem() : {
    data: {
      zoteroItemKey: "F2VIUB84",
      zoteroGroup: 2259720,
      version: 5274
    }
  }
  console.log("ITem to be sync'd=" + JSON.stringify(result.data, null, 2))
  // ^^^ we now have an item we can operate on.
  data = result.data

  // We now do the sync:
  const syncresult = await zotzenlib.sync({
    key: data.zoteroItemKey,
    group_id: data.zoteroGroup,
    metadata: true,
    attachments: true,
    strict: true,
    publish: true
    //verbose: true,
    //debug: true,
    //show: true
  })
  // ^^^ This doesn't publish ... needs figuring out TODO
  // console.log("result 1 = " + JSON.stringify(syncresult, null, 2))
  // If you specify 'strict' above, you get the filenames back:
  // result[0].files[0].filename
  // result[0].files[0].checksum
  // Check that files are there:
  res = await zenodo.record({ id: syncresult[0].id, strict: true })
  // console.log("TEMPORARY=" + JSON.stringify(res, null, 2))
  console.log("state: " + res[0]["state"])
  console.log("submitted: " + res[0]["submitted"])
  console.log(`To create a new version:\nnode test_newversion.js ${data.zoteroItemKey}`)
  // We now publish:
  sresult = await zotzenlib.sync({
    key: data.zoteroItemKey,
    group_id: data.zoteroGroup,
    id: syncresult[0].id,
    metadata: true,
    attachment: true,
    tag: "publishPDF",
    publish: true
    //verbose: true,
    //debug: true,
    //show: true
  })
  // Note, the pubishing does not have to be done as a separate step.
  //console.log("result 2 = " + JSON.stringify(result, null, 2))
  console.log("state: " + sresult[0]["state"])
  console.log("submitted: " + sresult[0]["submitted"])
  console.log("or....")
  res = await zenodo.record({ id: syncresult[0].id, strict: true })
  // console.log("TEMPORARY=" + JSON.stringify(res, null, 2))
  console.log("state: " + res[0]["state"])
  console.log("submitted: " + res[0]["submitted"])

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


async function getNewItem() {
  // Set up an item-pair that can be synchronised.
  // 1. Create the pair
  const result = await zotzenlib.create({
    group_id: 2259720,
    title: "Item title (via from)",
    authors: ["First Second Last; affiliation", "First2 Last2; affiliation2"],
    reportNumber: "51",
    reportType: "Helpdesk Request",
    collections: ["HP6NALR4", "5MDH7SKC"],  // Will need to be adapted in deployment
    date: "2021-01-01",                          // NOTE: This has to be a valid date, otherwise Zenodo.create fails
    googledoc: "https://url_to_google_doc-from_form",
    team: "some team - will be added to note. Take this form form field for 'team'.",
    note: "Note content - will be added to note. Add additional information from form, e.g. user who submitted the form as well as date.",
    // Leave as defaults (for now)
    institution: "EdTech Hub",
    language: "en",
    rights: "Creative Commons Attribution 4.0",
    kerko_url: "https://docs.edtechhub.org/lib/",
    tags: ["_r:AddedByZotZen"],
    description: "An output of the EdTech Hub, https://edtechhub.org",
  })

  console.log("TEMPORARY=" + JSON.stringify(result, null, 2))

  const data = {
    "zoteroItemKey": result.data.zoteroItemKey,
    "zoteroGroup": result.data.zoteroGroup,
    // We ignore result.data.zenodoRecordID because we normally start from a zotero item.
  }

  checking: {
    // Check that they are linked (not normally necessary)
    const check = await zotzenlib.link({
      key: data.zoteroItemKey,
      group_id: data.zoteroGroup,
      link: false
    })
    if (check.status != 0) {
      console.log(check.message);
      process.exit(1)
    } else {
      console.log("records are linked - proceeding")
    }
    // console.log("result 0 = " + JSON.stringify(result, null, 2))
  }

  // 2. Let's now change the Zotero record, so that we need a sync later.
  const zotero = new Zotero({ group_id: result.data.zoteroGroup })
  change_metadata_on_zotero: {
    const args = {
      key: result.data.zoteroItemKey,
      version: result.data.version,
      update: { title: "new title" },
      fullresponse: false,
      show: true
    }
    const update = await zotero.update_item(args)
    if (update.statusCode == 204) {
      console.log("update successfull - getting record")
      const zoteroRecord = await zotero.item({ key: result.data.zoteroItemKey, show: true })
      console.log("Result=" + JSON.stringify(zoteroRecord, null, 2))
    } else {
      console.log("update failed")
      return 1
    }
  }
  // 3. Upload a file that can be sync'd
  upload_file: {
    console.log("uploading file")
    const result2 = await zotero.item({
      key: result.data.zoteroItemKey,
      addfiles: ["test.pdf"],
    })
    //console.log("TEMPORARY=" + JSON.stringify(result2, null, 2))
    let children = await zotero.item({
      key: result.data.zoteroItemKey,
      children: true
    })
    children = children.filter(item => item.data.itemType === 'attachment' && item.data.linkMode === "imported_file")
    console.log("FIles: " + JSON.stringify(children, null, 2))
    // attach tag
    const result3 = await zotero.item({
      key: children[0].data.key,
      addtags: ["publishPDF"]
    })
  }

  // Now we have a Zotero item with a file (and new title) and a Zenodo record that is out of date.
  return result
}






main();
