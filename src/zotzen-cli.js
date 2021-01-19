#!/usr/bin/env node

const { ArgumentParser } = require('argparse');
const zotzenlib = require("./zotzen-lib");

const {
  zotzenInit,
} = require("./zotzen-cli-helper");

// https://stackoverflow.com/questions/9153571/is-there-a-way-to-get-version-from-package-json-in-nodejs-code
// This only works when running package from directory.
// const version = process.env.npm_package_version
// Read package.json, and extract version.
var pjson = require('../package.json')
if (pjson.version)
  console.log("zotzen version=" + pjson.version)

function getArguments() {
  const parser = new ArgumentParser({ "description": "Zotzen command line utility. Move data and files from Zotero to Zenodo." });

  /*
  // General options
 
  -h, --help            show this help message and exit
  --zoteroconfig ZOTEROCONFIG
                        Config file with API key. By default config.json then ~/.config/zotero-cli/zotero-cli.toml are used if no config is provided.
  --zenodoconfig ZENODOCONFIG
                        Config file with API key. By default config.json then ~/.config/zenodo-cli/config.json are used if no config is provided.
  --verbose             Run in verbose mode
  --debug               Enable debug logging
  --show                Show the Zotero and Zenodo item information
  --open                Open the Zotero and Zenodo link after creation (both on web).
  --oapp                Open the Zotero link (app) and the Zenodo link after creation (web).
  --dump                Show json for list and for depositions after executing the command.
 
  */
  parser.add_argument(
    "--zoteroconfig", {
    "action": "store",
    "default": "zotero-cli.toml",
    "help": "Config file with API key. By default config.json then ~/.config/zotero-cli/zotero-cli.toml are used if no config is provided."
  });
  parser.add_argument(
    "--zenodoconfig", {
    "action": "store",
    "default": "config.json",
    "help": "Config file with API key. By default config.json then ~/.config/zenodo-cli/config.json are used if no config is provided."
  });
  parser.add_argument(
    "--verbose", {
    "action": "store_true",
    "default": false,
    "help": "Run in verbose mode"
  });
  parser.add_argument(
    '--debug', {
    action: 'store_true',
    "default": false,
    help: 'Enable debug logging',
  });
  parser.add_argument(
    '--show', {
    action: 'store_true',
    help: 'Show the Zotero and Zenodo item information',
  });
  parser.add_argument(
    '--open', {
    action: 'store_true',
    help:
      'Open the Zotero and Zenodo link after creation (both on web).',
  });
  parser.add_argument(
    '--oapp', {
    action: 'store_true',
    help:
      'Open the Zotero link (app) and the Zenodo link after creation (web).',
  });
  parser.add_argument(
    "--dump", {
    "action": "store_true",
    "help": "Show json for list and for depositions after executing the command.",
    "default": false
  });
  parser.add_argument(
    "--dryrun", {
    "action": "store_true",
    "help": "Show what command would be run.",
    "default": false
  });

  /* help */
  const subparsers = parser.add_subparsers({ "help": "sub-command help" });

  /* Init */
  const parser_init = subparsers.add_parser(
    "init", {
    "help": "Set up config files for Zotero/Zenodo in the default location."
  });
  parser_init.set_defaults({ "func": zotzenInit });

  /* Create */
  zotzenlib.create({ getInterface: true }, subparsers)

  /* link */
  zotzenlib.link({ getInterface: true }, subparsers)
 
  /* sync */
  zotzenlib.sync({ getInterface: true }, subparsers)
  
  return parser.parse_args();
}


// -------------------------- main ---------------------------------------

async function main() {
  console.log('main: arguments');
  const args = getArguments();
  console.log('main: api calls');
  if (args.func) {
    console.log("Action: " + args.func.name)
    if (args.dryrun) {
      const fnname = args.func.name
      // delete args[func]
      const myargs = JSON.stringify(args, null, 2)
      console.log(`${fnname}(${myargs})`)
    } else {
      await args.func(args).then(res => {
        console.log("zotzen-cli result = " + JSON.stringify(res, null, 2))
        console.log("Done.")
      }).catch(e => {
        console.log(e);
      })
    }
  };
}
console.log("Start.")
main();
console.log("End.")
//process.exit(0)





