// To run wihtin the repo:
const zotzenlib = require('../src/zotzen-lib')
// To run independently
// const zotzenlib = require('zotzen-lib')
async function main() {
  const result = await zotzenlib.create({
    title: "zotzenlib.create",
    authors: ["First Second Last; affiliation","First2 Last2; affiliation2"],
    description: "Description/abstract",
    reportNumber: "100",
    reportType: "Some report type",
    date: "2021-01-01",
    institution: "EdTech Hub",
    language: "en",
    rights: "Creative Commons Attribution 4.0",
    googledoc: "url to google doc - not working yet",
    kerko_url: "https://docs.edtechhub.org/lib/",
    tags: ["AddedByZotZen"],
    collections: ["IY4IS3FU"],
    team: "some team",
    group_id: 2259720
  })
  console.log("zotzen result=" + JSON.stringify(result, null, 2))
}
main();
