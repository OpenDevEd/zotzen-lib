const childProcess = require('child_process');
const fs = require('fs');
const opn = require('opn');
const path = require('path');
const prompt = require('prompt');

async function zotzenInit(args) {
  if (args.debug) {
    console.log('DEBUG: zotzenInit');
  }
  console.log(JSON.stringify(args, null, 2));
  const schema = {
    properties: {
      'Zenodo API Key': {
        message: 'Please enter you Zenodo API Key. (Enter to ignore)',
      },
      'Zotero API Key': {
        message: 'Please enter your Zotero API Key. (Enter to ignore)',
      },
      'Zotero User ID': {
        message: 'Please enter your Zotero User ID. (Enter to ignore)',
      },
      'Zotero Group ID': {
        message: 'Please enter your Zotero Group ID. (Enter to ignore)',
      },
    },
  };
  prompt.start();
  prompt.get(schema, (err, result) => {
    if (err) {
      console.err('Invalid input received');
    } else {
      const zenKey = result['Zenodo API Key'];
      if (zenKey) {
        fs.writeFileSync(
          'zenodo-cli/config.json',
          JSON.stringify({
            accessToken: zenKey,
          })
        );
        console.log(
          'Zenodo config wrote successfully to zenodo-cli/config.json.'
        );
      }

      const zotKey = result['Zotero API Key'];
      const zotUid = result['Zotero User ID'];
      const zotGid = result['Zotero Group ID'];
      if (zotKey || zotUid || zotGid) {
        fs.writeFileSync(
          'zotero-cli/zotero-cli.toml',
          `${zotKey ? 'api-key="' + zotKey + '"\n' : ''}` +
          `${zotUid ? 'user-id="' + zotUid + '"\n' : ''}` +
          `${zotGid ? 'group-id="' + zotGid + '"\n' : ''}`
        );
        console.log(
          'Zotero config wrote successfully to zotero-cli/zotero-cli.toml'
        );
      }
    }
  });
}
exports.zotzenInit = zotzenInit;

