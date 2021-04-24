const fs = require('fs');
const os = require('os');
const prompt = require('prompt');
const logger = require('./logger');
const path = require('path');

// const childProcess = require('child_process');
// const opn = require('opn');

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
      'Zenodo Env': {
        pattern: /(sandbox|production)/,
        default: 'sandbox',
        message:
          'Please enter you Zenodo Environment (sandbox|production). (Enter to ignore)',
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
      const zenEnv = result['Zenodo Env'];

      const config = {
        accessToken: zenKey,
      };

      if (zenEnv === 'sandbox') {
        config.env = zenEnv;
      }

      if (zenKey) {
        const zenConfigDirPath = path.join(
          os.homedir(),
          '.config',
          'zenodo-cli'
        );
        if (!fs.existsSync(zenConfigDirPath)) {
          logger.info('config path not exists, creating...');
          fs.mkdirSync(zenConfigDirPath);
        }
        const zenConfigFilePath = path.join(zenConfigDirPath, 'config.json');
        fs.writeFileSync(zenConfigFilePath, JSON.stringify(config));

        logger.info(`Zenodo config wrote successfully to ${zenConfigFilePath}`);
      }

      const zotKey = result['Zotero API Key'];
      const zotUid = result['Zotero User ID'];
      const zotGid = result['Zotero Group ID'];
      if (zotKey || zotUid || zotGid) {
        const zotConfigDirPath = path.join(
          os.homedir(),
          '.config',
          'zotero-cli'
        );
        if (!fs.existsSync(zotConfigDirPath)) {
          logger.info('config path not exists, creating...');
          fs.mkdirSync(zotConfigDirPath);
        }

        let zotConfig = '';

        if (zotKey) {
          zotConfig += `api-key="${zotKey}"\n`;
        }

        if (zotUid) {
          zotConfig += `user-id="${zotUid}"\n`;
        }

        if (zotGid) {
          zotConfig += `group-id="${zotGid}"\n`;
        }

        const zotConfigFilePath = path.join(
          zotConfigDirPath,
          'zotero-cli.toml'
        );
        fs.writeFileSync(zotConfigFilePath, zotConfig);
        logger.info(`Zotero config wrote successfully to ${zotConfigFilePath}`);
      }
    }
  });
}
exports.zotzenInit = zotzenInit;
