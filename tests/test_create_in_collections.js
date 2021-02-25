// To run wihtin the repo:
const zotzenlib = require('../src/zotzen-lib')
// To run independently
// const zotzenlib = require('zotzen-lib')
async function main() {
  // Retrieve collections
  const Zotero = require('zotero-lib')
  var zotero = new Zotero({ verbose: true, "group-id": 2259720 })
  let collections = await zotero.collections({
      key: "HP6NALR4",
      terse: true
  })
  /*
  // The above returns the following structure: 
  let collections = [
    {
      "key": "5MDH7SKC",
      "name": "A"
    },
    {
      "key": "EEV72PK2",
      "name": "B"
    },
    {
      "key": "KDAFJBYM",
      "name": "C"
    }
  ]
  */
  collections = collections.map(item => item.key)
  const result = await zotzenlib.create({
    // Test-group (replace with Evi Lib group in deployment)
    group_id: 2259720,
    // FROM FORM
    title: "Item title (via from)",
    // For authors, split the form field on ; and then submit as array. affiliation is not filled in
    authors: ["First Second Last; affiliation","First2 Last2; affiliation2"],
    reportNumber: "100-from-form",               
    reportType: "Some report type - from form",  
    date: "2021-01-01",                          // NOTE: This has to be a valid date, otherwise Zenodo.create fails
    googledoc: "https://url_to_google_doc-from_form",
    collections: collections, // We're adding the item to all three collections, but could also do e.g. 
    // collections: [ collections[0] ],
    team: "some team - will be added to note. Take this form form field for 'team'.",
    note: "Note content - will be added to note. Add additional information from form, e.g. user who submitted the form as well as date.",
    // Leave as defaults (for now)
    institution: "EdTech Hub",
    language: "en",           
    rights: "Creative Commons Attribution 4.0", 
    kerko_url: "https://docs.edtechhub.org/lib/",
    tags: ["_r:AddedByZotZen"],
    description: "An output of the EdTech Hub, https://edtechhub.org",
    enclose: true
  })
 }
main();
