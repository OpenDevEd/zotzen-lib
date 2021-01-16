const zotzenlib = require('../index')
async function run() {
  const result = await zotzenlib.create({
    title: "zotzenlib.create",
    authors: "",
    description: "Description/abstract",
    reportNumber: "100",
    reportType: "Some report type",
    date: "2021-01-01",
    url: "https://example.comxs",
    tags: [],
    collections: [],
    team: "",
    group_id: 2259720
  })
  console.log("zotzen result=" + JSON.stringify(result, null, 2))
}
run();
