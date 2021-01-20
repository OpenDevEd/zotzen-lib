// -------------------------- main ---------------------------------------
function getVersion() {
  const pjson = require('../package.json');
  if (pjson.version)
    console.log(`zenodo-lib version=${pjson.version}`);
  return pjson.version;
}
exports.getVersion = getVersion;
