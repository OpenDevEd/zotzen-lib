// To run wihtin the repo:
const zotzenlib = require('../src/zotzen-lib')
// To run independently
// const zotzenlib = require('zotzen-lib')
async function main() {
  const result = await zotzenlib.create({
    // Test-group:
    group_id: 2259720,
    // ^^^ replace with Evi Lib group in deployment
    title: "Item title (via from)",
    // For authors, split the form field on ; and then submit as array. affiliation is not filled in
    authors: ["First Second Last; affiliation","First2 Last2; affiliation2"],
    reportNumber: "100-from-form",               // from form
    reportType: "Some report type - from form",  // from form
    date: "2021-01-01",                          // from form - this has to be a valid date
    googledoc: "https://url_to_google_doc-from_form", // from form
    collections: ["IY4IS3FU"],  // from form
    team: "some team - will be added to note. Take this form form field for 'team'.",
    note: "Note content - will be added to note. Add additional information from form, e.g. user who submitted the form as well as date.",
    institution: "EdTech Hub", // <- Leave as default:
    language: "en",            // <- Leave as default:
    rights: "Creative Commons Attribution 4.0",       // <- Leave as default:
    kerko_url: "https://docs.edtechhub.org/lib/",     // <- Leave as default:
    tags: ["_r:AddedByZotZen"], // <- Leave as default:
    // Leave as default:
    description: "An output of the EdTech Hub, https://edtechhub.org",
  })
  console.log("zotzen result=" + JSON.stringify(result, null, 2))
}
main();
