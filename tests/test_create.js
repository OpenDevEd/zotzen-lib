// To run wihtin the repo:
const zotzenlib = require('../src/zotzen-lib')
// To run independently
// const zotzenlib = require('zotzen-lib')
async function main() {
  // For how to retrieve collections, see example test_create_in_collections.js
  homedir = require('os').homedir()+"/"
  const result = await zotzenlib.create({
    zenodo_config: homedir+".config/zenodo-cli/config.sandbox.json",
    // Test-group (replace with Evi Lib group in deployment)
    group_id: 2259720,
    // FROM FORM
    title: "Item title (via from)",
    // For authors, split the form field on ; and then submit as array. affiliation is not filled in
    authors: ["First Second Last; affiliation","First2 Last2; affiliation2"],
    reportNumber: "51",               
    reportType: "Helpdesk Request",  
    collections: ["QANLXBUW","5MDH7SKC"],  // Will need to be adapted in deployment
    date: "2021-03-31",                          // NOTE: This has to be a valid date, otherwise Zenodo.create fails
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
    enclose: true
  })
  console.log("zotzen result=" + JSON.stringify(result, null, 2))
}
main();
