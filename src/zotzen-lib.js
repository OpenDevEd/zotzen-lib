// TODO: At the moment, the links produces are not 'sandbox aware'.
// It's only a minor issue for production, but would be nice for testing.
// Similarly, check for string '......./zenodo.'
// where we need to enter missing parts of DOIs properly

function as_value(value) {
  if (Array.isArray(value)) {
    value = value[0];
  }
  return value;
}

// const { delete } = require("request-promise-native");
// PRODUCTION: Load library
const zenodo = require('zenodo-lib');
const Zotero = require('zotero-lib');
const logger = require('./logger');

// TODO - TESTING: Load locally for testing:
// const zenodo = require("../zenodo-lib/build/zenodo-lib.js")
// const Zotero = require("../zotero-lib/build/zotero-lib.js")
// ^^^ This requires for zotzen-lib, zenodo-lib and zotero-lib to be in the same directory.

const zotero = new Zotero({});

function debug(args, msg, data) {
  if (
    args &&
    (('debug' in args && args.debug) || ('verbose' in args && args.verbose))
  ) {
    logger.info('DEBUG: %s', msg);
    if (data) {
      logger.info('%s', JSON.stringify(data, null, 2));
    }
  }
}

function verbose(args, msg, data) {
  if (args && 'verbose' in args && args.verbose) {
    logger.info('VERBOSE: %s', msg);
    if (data) {
      logger.info('%s', JSON.stringify(data, null, 2));
    }
  }
}

//--
async function zenodoCreate(args) {
  // TODO: What if this is a user lib?
  if (!args.zotero_link && args.key && args.group_id) {
    console.log('Adding args.zotero_link from key/group_id provided');
    args.zotero_link = getZoteroSelectLink(args.key, args.group_id, true);
  }

  console.log('zenodoCreate, args=' + JSON.stringify(args, null, 2));

  let zenodoRecord;
  try {
    console.log('zotzen-lib: calls zenodo.create');
    zenodoRecord = await zenodo.create(args);
    console.log('zotzen-lib: zenodo.create returns');
  } catch (e) {
    debug(args, 'zotzenCreate: error=', e);
    console.log(e);
  }
  debug(args, 'zotzenCreate: result:', zenodoRecord);
  // return result
  // let zoteroArgs = args
  // // remove some args/add some args
  // zoteroArgs["func"] = "create"
  // const zoteroRecord = zoteroAPI(zoteroArgs);
  if (
    !zenodoRecord ||
    !zenodoRecord.metadata ||
    !zenodoRecord.metadata.prereserve_doi
  ) {
    console.log('ERROR in ZenodoRecord creation.');
    process.exit(1);
  }
  const DOI = zenodoRecord['metadata']['prereserve_doi']['doi'];
  const base = zenodoRecord['links']['self'].search(/sandbox/) ? 'sandbox' : '';
  console.log(base);
  return [zenodoRecord, DOI, base];
  // [zenodoRecord, DOI] = zenodoCreate(args)
}

async function zoteroCreate(args) {
  // complement the set of args provided according to zenodoLibCreate_Args
  Object.keys(args).forEach((mykey) => {
    if (!args[mykey]) {
      if (mykey == 'collections') {
        // mykey == "tags" || authors
        args[mykey] = [];
      } else {
        args[mykey] = '';
      }
    }
  });
  if (!args.collections) {
    args.collections = [];
  } else {
    if (!Array.isArray(args.collections)) {
      args.collections = [args.collections];
    }
  }
  const doistr = args.doi ? 'DOI: ' + args.doi : '';
  const tagsarr = zotero.objectifyTags(args.tags);
  let authorsarr = [];
  if (args.authors) {
    args.authors.forEach((myauth) => {
      myauth = myauth.replace(/\;.*$/, '');
      const firstlast = myauth.split(/ +/);
      // console.log("X-- "+firstlast.slice(0, 1).join(" "))
      // console.log("X-- "+firstlast.slice(0, firstlast.length - 1).join(" "))
      const first =
        firstlast.length > 1
          ? firstlast.slice(0, firstlast.length - 1).join(' ')
          : '';
      const last = firstlast[firstlast.length - 1];
      authorsarr.push({
        creatorType: 'author',
        firstName: first,
        lastName: last,
      });
    });
  }
  // const extrastr = args.team ? doistr + "\n" + "EdTechHubTeam: " + args.team : doistr
  const extrastr = doistr;
  const report = {
    itemType: 'report',
    title: args.title,
    creators: authorsarr,
    abstractNote: args.description,
    reportNumber: args.reportNumber,
    reportType: args.reportType,
    seriesTitle: '',
    place: '',
    institution: args.institution,
    date: args.date,
    pages: '',
    language: args.language,
    shortTitle: '',
    url: '',
    accessDate: '',
    archive: '',
    archiveLocation: '',
    libraryCatalog: '',
    callNumber: '',
    rights: args.rights,
    extra: extrastr,
    tags: tagsarr,
    collections: args.collections,
  };

  // copy selected args to zarg
  let zarg = {
    item: report,
    // We need to get the full response
    fullresponse: true,
  };
  if (args.group_id) {
    zarg.group_id = args.group_id;
  }
  // Copy explicit config if it's been given:
  zarg.config = args.zotero_config ? args.zotero_config : null;
  zarg.config_json = args.zotero_config_json ? args.zotero_config_json : null;
  zarg.zotero_api_key = args.zotero_api_key ? args.zotero_api_key : null;
  zarg.api_key = args.api_key ? args.api_key : null;

  debug(args, 'zoteroCreate: call', null);
  const zoteroResult = await zotero.create_item(zarg);
  const zoteroRecord = zotero.pruneData(zoteroResult);
  debug(args, 'zotzenCreate: result:', zoteroResult);
  const zoteroRecordVersion = zoteroResult.successful['0'].version;
  const zoteroRecordGType = zoteroResult.successful['0'].library.type;
  const zoteroRecordGroup = zoteroResult.successful['0'].library.id;

  // TODO: The following two don't make sense - either ID or DOI should be ok! Need to get one from the other.
  // TODO: Move Zotero functions here? Or use Zotero functions... atm it's duplicated.
  // TODO: Visit both refs to zenodo.org and check for (a) sandbox, and (b) decodation.
  let decorations = [];
  // What if we are in the sandbox?
  console.log(args.base);
  const base = args.base == 'sandbox' ? 'sandbox.' : '';
  if (args.id === null) {
    console.log('TEMPORARY=' + JSON.stringify(args, null, 2));
    process.exit(1);
  }
  if (args.id) {
    // Zotero item - attach links ... to Zenodo
    const res = await zotero.attachLinkToItem(
      zoteroRecord.key,
      `https://${base}zenodo.org/deposit/${args.id}`,
      {
        title: '🔄View entry on Zenodo (deposit)',
        tags: ['_r:zenodoDeposit', '_r:zotzen'],
      }
    );
    decorations.push(res);
  }
  if (args.id) {
    // Zotero item - attach links ... to Zenodo
    const res = await zotero.attachLinkToItem(
      zoteroRecord.key,
      `https://${base}zenodo.org/record/${args.id}`,
      {
        title: '🔄View entry on Zenodo (record)',
        tags: ['_r:zenodoRecord', '_r:zotzen'],
      }
    );
    decorations.push(res);
  }
  if (args.doi) {
    // Zotero item - attach links ... to DOI
    const res = await zotero.attachLinkToItem(
      zoteroRecord.key,
      'https://doi.org/' + args.doi,
      {
        title: '🔄Look up this DOI (once activated)',
        tags: ['_r:doi', '_r:zotzen'],
      }
    );
    decorations.push(res);
  }

  for (const i in args.collections) {
    // Ⓩ🅩🆉
    // console.log(args.collections[i])
    // process.exit(1)
    const res = await zotero.attachLinkToItem(
      zoteroRecord.key,
      getZoteroSelectLink(args.collections[i], zoteroRecordGroup, true, false),
      {
        title:
          '🆉View primary collection for this item' +
          (args.collections.length > 0 ? ' [' + i + ']' : ''),
        tags: ['_r:collection', '_r:zotzen'],
      }
    );
    decorations.push(res);
  }

  console.log('[zotzenCreate] ' + zoteroRecord.key);
  // Zotero item - attach links ... to Google Doc
  if (args.googledoc) {
    // Attach link to google doc, if there is one:
    args.googledoc = as_value(args.googledoc);
    const res = await zotero.attachLinkToItem(
      zoteroRecord.key,
      args.googledoc,
      {
        title: '📝View Google Doc and download alternative formats',
        tags: ['_r:googleDoc', '_r:zotzen'],
      }
    );
    decorations.push(res);
  }

  // Zotero item - attach note
  console.log('[zotzenCreate] ' + zoteroRecord.key);
  const team = args.team ? `<p><b>Team (via form):</b> ${args.team}</p>` : '';
  const note = args.team ? `<p><b>Note (via form):</b> ${args.note}</p>` : '';
  const content = `${team} ${note}`;
  const res = await zotero.attachNoteToItem(zoteroRecord.key, {
    content,
    tags: ['_r:noteViaForm', '_r:zotzen'],
  });
  decorations.push(res);

  // Attach kerko url to Zotero record (as url)
  let newZoteroRecord = zoteroRecord;
  const kerko_url = args.kerko_url ? args.kerko_url + zoteroRecord.key : '';
  if (kerko_url != '') {
    console.log('[zotzen] updating... with kerko url');
    const zoteroUpdate = {
      key: zoteroRecord.key,
      version: zoteroRecordVersion,
      json: { url: kerko_url },
      fullresponse: false,
    };
    const status = await zotero.update_item(zoteroUpdate);
    console.log('[zotzen] status=' + JSON.stringify(status, null, 2));
    // update_item doesn't return the item, but only a status - we should check the status at this point.
    newZoteroRecord = await zotero.item({
      key: zoteroRecord.key,
      fullresponse: false,
    });
    console.log(
      '[zotzen] amended record=' + JSON.stringify(newZoteroRecord, null, 2)
    );
    // Attach link to kerko
    const res = await zotero.attachLinkToItem(zoteroRecord.key, kerko_url, {
      title: '👀View item in Evidence Library',
      tags: ['_r:kerko', '_r:zotzen'],
    });
    decorations.push(res);
  }
  // The following two don't make sense - either ID or DOI should be ok! Need to get one from the other.
  /* let decorations = Promise.all([
        async () => {
            if (args.id) {
                // Zotero item - attach links ... to Zenodo
                return await zotero.attachLinkToItem(zoteroRecord.key, "https://zenodo.org/deposit/" + args.id, { title: "🔄View entry on Zenodo (draft)", tags: ["_r:zenodoDeposit", "_r:zotzen"] });
            }
        },
        async () => {
            if (args.doi) {
                // Zotero item - attach links ... to DOI
                return await zotero.attachLinkToItem(zoteroRecord.key, "https://doi.org/" + args.doi, { title: "🔄Look up this DOI (once activated)", tags: ["_r:doi", "_r:zotzen"] });
            }
        },
        async () => {
            for (const i in args.collections) {
                // Ⓩ🅩🆉
                //console.log(args.collections[i])
                //process.exit(1)
                return await zotero.attachLinkToItem(
                    zoteroRecord.key,
                    getZoteroSelectLink(args.collections[i], zoteroRecordGroup, true, false),
                    {
                        title: "🆉View primary collection for this item" + (args.collections.length > 0 ? " [" + i + "]" : ""),
                        tags: ["_r:collection", "_r:zotzen"]
                    });
            }
        },
        async () => {
            // Zotero item - attach links ... to Google Doc
            if (args.googledoc) {
                // Attach link to google doc, if there is one:
                return await zotero.attachLinkToItem(zoteroRecord.key, args.googledoc, { title: "📝View Google Doc and download alternative formats", tags: ["_r:googleDoc", "_r:zotzen"] });
            }
        },
        async () => {
            // Zotero item - attach note
            const team = args.team ? `<p><b>Team (via form):</b> ${args.team}</p>` : "";
            const note = args.team ? `<p><b>Note (via form):</b> ${args.note}</p>` : "";
            const content = `${team} ${note}`;
            return await zotero.attachNoteToItem(zoteroRecord.key, { content: content, tags: ["_r:noteViaForm", "_r:zotzen"] });
        },
        async () => {
            // Attach kerko url to Zotero record (as url)
            const kerko_url = args.kerko_url ? args.kerko_url + zoteroRecord.key : "";
            if (kerko_url != "") {
                console.log("updating...");
                const zoteroUpdate = {
                    key: zoteroRecord.key,
                    version: zoteroRecordVersion,
                    update: { url: kerko_url },
                    fullresponse: false
                };
                const status = await zotero.update_item(zoteroUpdate);
                // update_item doesn't return the item, but only a status - we should check the status at this point.
                newZoteroRecord = await zotero.item({ key: zoteroRecord.key, fullresponse: false });
                // Attach link to kerko
                return await zotero.attachLinkToItem(zoteroRecord.key, kerko_url, { title: "👀View item in Evidence Library", tags: ["_r:kerko", "_r:zotzen"] });
            }
        }
    ]).then(
    ) */

  return [
    newZoteroRecord,
    zoteroRecordGType,
    zoteroRecordGroup,
    zoteroRecordVersion,
    decorations,
  ];
}

/*
TOP-LEVEL FUNCTION
*/
async function zotzenCreate(args, subparsers) {
  // TODO - we have to fix the communities for Zenodo.
  const testargs = {
    reportNumber: '100-from-form',
    reportType: 'Some report type - from form',
    note:
      'Note content - will be added to note. Add additional information from form, e.g. user who submitted the form as well as date.',
    institution: 'EdTech Hub',
    language: 'en',
    rights: 'Creative Commons Attribution 4.0',
    tags: ['_r:AddedByZotZen'],
  };
  if (args.getInterface && subparsers) {
    const parser_create = subparsers.add_parser('create', {
      help:
        "Create a new pair of Zotero/Zenodo entries. Note: If you already have a Zotero item, use 'link' instead. If you have a Zenodo item already, but not Zotero item, make a zotero item in the Zotero application and also use 'link'.",
    });
    parser_create.set_defaults({ func: zotzenCreate });
    parser_create.add_argument('--group-id', {
      nargs: 1,
      help:
        'Group ID for which the new item Zotero is to be created. (Can be provided via Zotero config file.)',
    });
    // This set of options should match zenodo-cli create
    parser_create.add_argument('--json', {
      action: 'store',
      help:
        'Path of the JSON file with the metadata for the zenodo record to be created. If this file is not provided, a template is used. The following options override settings from the JSON file / template.',
    });
    parser_create.add_argument('--title', {
      action: 'store',
      help:
        'The title of the record. Overrides data provided via --json. (Zotero/Zenodo)',
    });
    parser_create.add_argument('--authors', {
      nargs: '*',
      action: 'store',
      help:
        "List of authors, (provided on the command line, one by one). Separate institution and ORCID with semicolon, e.g. 'Lama Yunis;University of XYZ;0000-1234-...'. (You can also use --authordata.) Overrides data provided via --json. (Zotero/Zenodo)",
    });
    parser_create.add_argument('--authordata', {
      action: 'store',
      help:
        'A text file with a database of authors. Each line has author, institution, ORCID (tab-separated). The data is used to supplement insitution/ORCID to author names specified with --authors. Note that authors are only added to the record when specified with --authors, not because they appear in the specified authordate file. (Zotero/Zenodo)',
    });
    parser_create.add_argument('--date', {
      action: 'store',
      help:
        'The date of the record. Overrides data provided via --json. (Zotero/Zenodo)',
    });
    parser_create.add_argument('--description', {
      action: 'store',
      help:
        'The description (abstract) of the record. Overrides data provided via --json. (Zotero/Zenodo)',
    });
    parser_create.add_argument('--communities', {
      action: 'store',
      help:
        'Read list of communities for the record from a file. Overrides data provided via --json. (Zenodo only)',
    });
    parser_create.add_argument('--add-communities', {
      nargs: '*',
      action: 'store',
      help:
        'List of communities to be added to the record (provided on the command line, one by one). Overrides data provided via --json.  (Zenodo only)',
    });
    // Not needed as we're creating new records
    /* parser_create.add_argument("--remove-communities", {
          "nargs": "*",
          "action": "store",
          "help": "List of communities to be removed from the record (provided on the command line, one by one). Overrides data provided via --json."
        }); */
    parser_create.add_argument('--collections', {
      nargs: '*',
      action: 'store',
      help: 'List of collections for the Zotero item. (Zotero only)',
    });
    parser_create.add_argument('--kerko-url', {
      nargs: 1,
      help:
        'If you have a kerko instance, you can pass the base URL here. It will be used to add a URL to the Zotero record.) (Zotero only)',
    });
    parser_create.add_argument('--googledoc', {
      nargs: 1,
      help: 'Provide a google doc as a source for your document (Zotero only)',
    });
    parser_create.add_argument('--enclose', {
      action: 'store_true',
      help:
        'Enclose the new item in a collection and create sub-collections for references, etc. The sub-collections are created in the first collection provided under --collections.',
    });
    // Not needed, as we're creating this.
    /* parser_create.add_argument("--zotero-link", {
          "action": "store",
          "help": "Zotero link of the zotero record to be linked. Overrides data provided via --json."
        }); */
    return { status: 0, message: 'success' };
  }

  verbose(args, 'zotzenlib.zotzenCreate -> zenodo', args);
  // let result = dummycreate(args)
  // Create zenodo record
  const [zenodoRecord, DOI, base] = await zenodoCreate(args);
  // console.log("TEMPORARYXXX="+JSON.stringify(   base         ,null,2))
  args.id = zenodoRecord.id;
  args.doi = DOI;
  args.base = base;
  verbose(args, 'zotzenlib.zotzenCreate -> zotero', args);
  const [
    zoteroRecord,
    zoteroRecordGType,
    zoteroRecordGroup,
    zoteroRecordVersion,
    decorations,
  ] = await zoteroCreate(args);
  // const zoteroGroup = args.group_id
  // TODO: Replace this with 'getZoteroLink' functionb elow - otherwise this will not work for user libs
  // Actually - as we are about the attach this to the Zenodo item - it will not work for user libs in any case...
  if (zoteroRecordGType != 'group') {
    console.log('The zotero record is in a user library.');
    return this.message(1, 'ERROR: group-type=user not implemented');
  }
  console.log(`[zotzenCreate] key=${zoteroRecord.key}`);
  // process.exit(1)
  // Now update the zenodo record with the ZoteroId.
  let zenodoRecord2;
  const zoteroSelectLink = getZoteroSelectLink(
    zoteroRecord.key,
    zoteroRecordGroup,
    true
  );
  promiseall: {
    // The creation of the first Zotero/Zenodo record needs to be sequences.
    // However, the items below could be done through a 'Promise all' as they can run in parallel.

    // Attach idenfier to zenodo record.
    args.zotero_link = zoteroSelectLink;
    args.id = zenodoRecord.id;
    if (args.kerko_url) {
      args.description += `<p>Available from <a href="${
        args.kerko_url + DOI
      }">${args.kerko_url + DOI}</a></p>`; // (need to use DOI here, as the link to the zoteroRecord.key is not necc. permanent)
    }
    zenodoRecord2 = await zenodo.update(args);
    // console.log(JSON.stringify(zenodoRecord2, null, 2))
  }
  const kerko_url = args.kerko_url ? args.kerko_url + zoteroRecord.key : '';
  let enclose = null;
  if (args.enclose && args.collections) {
    console.log('[zotzenCreate] enclosing ${zoteroRecord.key}');
    enclose = await zotero.enclose_item_in_collection({
      key: zoteroRecord.key,
      group_id: zoteroRecordGroup,
      collection: args.collections[0],
    });
  }
  const record = {
    status: 0,
    message: 'success',
    data: {
      zenodoRecordID: zenodoRecord.id,
      zoteroItemKey: zoteroRecord.key,
      zoteroGroup: zoteroRecordGroup,
      zoteroSelectLink,
      zoteroRecordVersion,
      DOI,
      kerko_url,
    },
    zotero: {
      data: zoteroRecord,
      decorations,
    },
    zenodo: {
      data: zenodoRecord2.metadata,
    },
    enclose,
  };
  console.log('Zotero/Zenodo records successfully created.');
  return record;
}

/*
async function zotzenLink(args) {
    verbose(args, "zotzenLink", args)
    const result = dummycreate(args)
    debug(args, "zotzenLink: result", result)
    return result

} */

/*
Top Level function
*/
async function zotzenSync(args, subparsers) {
  if (args.getInterface && subparsers) {
    const parser_sync = subparsers.add_parser('sync', {
      help:
        'Synchronise data from one or more Zotero items to their corresponding Zenodo items. Note that synching from Zenodo to Zotero is not implemented.',
    });
    parser_sync.set_defaults({ func: zotzenSync });
    parser_sync.add_argument('key', {
      nargs: '*',
      help: 'One or more Zotero keys for synchronisation.',
    });
    parser_sync.add_argument('--metadata', {
      action: 'store_true',
      help: 'Push metadata from zotero to zenodo.',
    });
    parser_sync.add_argument('--attachments', {
      action: 'store_true',
      help: 'Push Zotero attachments to Zenodo.',
    });
    parser_sync.add_argument('--type', {
      action: 'store',
      help: 'Type of the attachments to be pushed.',
      default: 'all',
    });
    parser_sync.add_argument('--tag', {
      nargs: 1,
      action: 'store',
      help: 'Only synchronise attachments with the tag given.',
    });
    parser_sync.add_argument('--publish', {
      action: 'store_true',
      help: 'Publish zenodo record.',
    });
    return { status: 0, message: 'success' };
  }
  if (!args.key) return null;
  const keys = Array.isArray(args.key) ? args.key : [args.key];
  delete args['key'];
  let output = [];

  // TODO: should check whether args.key is an array or not
  for (const key of keys) {
    let myargs = args;
    myargs.key = key;
    const rec = await zotzenSyncOne(myargs);
    output.push(rec);
  }
  return output;
}

function message(stat = 0, msg = 'None', data = null) {
  return {
    status: stat,
    message: msg,
    data,
  };
}

function zenodoParseID(str) {
  // What is str is an integer?
  if (typeof str === 'number') {
    return str;
  }
  if (Array.isArray(str)) {
    str = str[0];
  }
  const zenodoIDstr = str.match(/(\d+)$/s);
  let zenodoIDref = null;
  if (zenodoIDstr) {
    zenodoIDref = zenodoIDstr[1];
    console.log(`Got Zenodo ID = ${zenodoIDref}`);
  }
  return parseInt(zenodoIDref);
}

// TODO - these shoudl be replaced by the native zotero-lib functions
function zoteroParseKey(str) {
  // const arr = zotlink.split("/")
  // arr[arr.length - 1]
  console.log(`zoteroParseKey = ${str}`);
  if (Array.isArray(str)) str = str[0];
  let zoteroKey = str;
  const a = str.match(/([\d\w]+)\/?$/s);
  if (a) {
    zoteroKey = a[1];
    console.log(`Got Zotero Key = ${zoteroKey}`);
  }
  return zoteroKey;
}
function zoteroParseGroup(str) {
  // const arr = zotlink.split("/")
  // arr[arr.length - 1]
  let zoteroGroup = null;
  str = str.toString();
  const a = str.match(/\/(\d+)\//s);
  if (a) {
    zoteroGroup = a[1];
    console.log(`Got Zotero Group (/) = ${zoteroGroup}`);
  } else {
    const a = str.match(/^(\d+)\:/s);
    if (a) {
      zoteroGroup = a[1];
      console.log(`Got Zotero Group (:) = ${zoteroGroup}`);
    }
  }
  return zoteroGroup;
}

// TODO: complete
function zenodoParseIDFromZoteroRecord(item) {
  logger.info('item = %O', item);
  const extra = item.extra.split('\n');
  let doi = '';
  let id = '';
  extra.forEach((element) => {
    let res = element.match(/^\s*doi:\s*(.*?(\d+))$/i);
    if (res) {
      doi = res[1];
      id = res[2];
    }
  });
  return id;
}

// This function can be called recursively - it's not efficient...
async function zotzenLink(args, subparsers) {
  // This functions gets whatever items possible, which can then be checked.
  if (args.getInterface && subparsers) {
    const parser_link = subparsers.add_parser('link', {
      help: 'Link Zotero item with a Zenodo item, or generate a missing item.',
    });
    parser_link.set_defaults({ func: zotzenLink });
    parser_link.add_argument('--id', {
      nargs: 1,
      help: 'Provide one/no Zenodo item.',
    });
    parser_link.add_argument('--key', {
      nargs: 1,
      help: 'Provide one/no Zotero item.',
    });
    parser_link.add_argument('--link', {
      action: 'store_true',
      help: 'Perform links/item creation as needed.',
    });
    parser_link.add_argument('--group_id', {
      nargs: 1,
      help: 'Zotero group.',
    });
    return { status: 0, message: 'success' };
  }
  debug(args, 'zotzenLink', args);

  // Get the Zotero item [if one was specified]
  let zenodoIDFromZotero = null;
  const zoteroKey = args.key ? zoteroParseKey(args.key) : null;

  /*
  if command accepts only one zotero key (via --key):
  zotzen --group-id 123 command --key ABC
  zotzen command --key zotero://select/groups/123/items/ABC

  if command can accept several keys (no --key):
  zotzen --group-id 123 sync ABC
  zotzen sync zotero://select/groups/123/items/ABC
  */

  // Check whether a zoteroGroup has been provided via arguments
  logger.info('going to check for group id args = %O', { ...args });
  let zoteroGroup = null;
  if (args.group_id) {
    // Group has been provided directly
    logger.info('getting group_id from args');
    zoteroGroup = args.group_id;
  } else if (args.key) {
    // Group may have been provided via zotero://select-style link
    // zotero://select/groups/2259720/items/KWVWM288
    const parsedGroup = zoteroParseGroup(args.key);
    logger.info(`parsed group: ${parsedGroup} from key: ${args.key}`);
    if (parsedGroup) {
      zoteroGroup = parsedGroup;
    }
  }

  if (zoteroGroup) {
    // If a group has been provided, we place the information into the standard location:
    args.group_id = zoteroGroup;
  } else {
    args.group_id = zotero.config.group_id;
    logger.info(
      'No group provided via arguments - falling back to config group id = %s',
      args.group_id
    );
  }

  // Now that we have extract the group (if possibe), we now set the zotero key
  if (zoteroKey) {
    args.key = zoteroKey;
  } else {
    logger.error('No key provided in call to zotzenLink');
    return {
      status: 1,
      message: 'No key provided in call to zotzenLink',
      data: args,
    };
  }

  let zoteroItem = null;
  if (zoteroKey) {
    // There's a key, so we can get the item.
    debug(args, 'zoteroItem: call', args);
    zoteroItem = await zotero.item(args);
    // TODO: What is the zoteroItem==null ? Exit with error.
    debug(args, 'zotzenCreate: result:', zoteroItem);
    // zoteroRecord.extras -> DOI -> zenodo
    // return zoteroRecord
    // "extra": "DOI: 10.5072/zenodo.716876",
    // TODO - this will not work for Zotero recordTypes other the 'record'
    zenodoIDFromZotero = zenodoParseIDFromZoteroRecord(zoteroItem);
  } else {
    logger.warn("You did not provided a 'key' (for a zotero item):\n%O", {
      ...args,
    });
  }
  // -- Zenodo Record [if one was specified]
  let zoteroKeyFromZenodo = null;
  let zoteroGroupFromZenodo = null;
  const zenodoID = args.id ? zenodoParseID(args.id) : null;
  let zenodoRecord = null;
  args.id = zenodoID;
  if (zenodoID) {
    // -- Get the zenodo record
    console.log(
      'Get the zenodo record, TEMPORARY=' + JSON.stringify(args, null, 2)
    );

    const zenodoID = args.id ? zenodoParseID(args.id) : null;
    try {
      // FIXME: this is probably making unwanted publish request
      // which is causing record state in progress

      // TODO: discuss we'd' follow CQS (command query separation) pattern
      console.log('zotzen-lib: calls zenodo.getRecord');

      logger.info(`publish = ${args.publish}`);
      logger.info(`allArgs = ${JSON.stringify({ ...args }, null, 2)}`);

      zenodoRecord = await zenodo.getRecord({ ...args });
      console.log('zotzen-lib: zenodo.getRecord returns');
    } catch (e) {
      debug(args, 'zotzenCreate: error=', e);
      console.log(e);
      return null;
    }
    if (Array.isArray(zenodoRecord)) zenodoRecord = zenodoRecord[0];
    debug(args, 'zotzenLink: result:', zenodoRecord);
    // console.log(JSON.stringify(zenodoRecord[0].metadata["related_identifiers"],null,2))
    let zotlink = null;
    if (zenodoRecord) {
      if (zenodoRecord.metadata['related_identifiers']) {
        const ri = zenodoRecord['metadata']['related_identifiers'];
        // We should iterate through these TODO
        zotlink = ri[0].identifier;
        zoteroKeyFromZenodo = zoteroParseKey(zotlink);
        zoteroGroupFromZenodo = zoteroParseGroup(zotlink);
      } else {
        console.log('The Zenodo item is not linked to a Zoteroitem');
        // ask prompt or check tags and proceed to link TODO
      }
    } else {
      console.log(
        'Request completed successfully, but no data was retrieved. Do you have access to the record?'
      );
    }
    // if (!zotlink) {
    //    console.log("The zenodo record does not link back to the zotero item - use 'link'")
    // }
  } else {
    logger.warn("You did not provided an 'id' (for a zenodo item) = %O", {
      ...args,
    });
  }
  // We now have all potential keys and links:
  // TODO - these values are not set correctly...
  const zenodoState =
    zenodoRecord && 'state' in zenodoRecord ? zenodoRecord.state : null;
  const zenodoSubmitted =
    zenodoRecord && 'submitted' in zenodoRecord ? zenodoRecord.submitted : null;
  if (zenodoRecord && 'state' in zenodoRecord)
    console.log(
      `zotzenLink:: state: ${zenodoState} = ${zenodoRecord.state}; submitted: ${zenodoSubmitted}=${zenodoRecord.submitted}`
    );
  const keySet = {
    zoteroKey,
    zenodoID,
    zoteroGroup,
    zenodoIDFromZotero,
    zoteroKeyFromZenodo,
    zoteroGroupFromZenodo,
    doi: '[...]/zenodo.' + zenodoID,
    zenodoState,
    zenodoSubmitted,
  };
  const data = {
    zotero: zoteroItem,
    zenodo: zenodoRecord,
  }; // We'll have to pass the data as well - otherwise we have to look it up again below
  // TODO: Fix the DOI above - either take it from the actual DOI or the pre-reserved DOI.
  let result = await checkZotZenLink(args, keySet, data);
  // console.log("TEMPORARY=" + JSON.stringify(result, null, 2))
  // Need to allow for one iteration
  if (result.originaldata) result.originaldata2 = data;
  else result.originaldata = data;
  if (result.originalkeyset) result.originalkeyset2 = keySet;
  else result.originalkeyset = keySet;
  return result;
}

async function checkZotZenLink(args, k, data) {
  if (k.zenodoID) {
    k.zenodoID = k.zenodoID.toString();
  }
  if (k.zenodoIDFromZotero) {
    k.zenodoIDFromZotero = k.zenodoIDFromZotero.toString();
  }
  if (k.zoteroKey) {
    // Zotero key provided
    if (k.zenodoID) {
      // zenodo id provided
      if (k.zenodoIDFromZotero && k.zoteroKeyFromZenodo) {
        // the zenodo record links to zotero
        if (
          k.zenodoIDFromZotero === k.zenodoID &&
          k.zoteroKeyFromZenodo === k.zoteroKey
        ) {
          // TODO: && zoteroGroup === zoteroGroupFromZenodo (we need to check groups as well, just to be sure)
          // Great!
          return message(
            0,
            'You provided both a Zotero Key and a Zenodo ID - and they are linked.',
            k
          );
        } else if (
          k.zenodoIDFromZotero === k.zenodoID &&
          k.zoteroKeyFromZenodo != k.zoteroKey
        ) {
          return message(
            1,
            'You provided both a Zotero Key and a Zenodo ID - but they are partially linked to different items. Please fix this by editing the records directly.',
            k
          );
        } else if (
          k.zenodoIDFromZotero != k.zenodoID &&
          k.zoteroKeyFromZenodo === k.zoteroKey
        ) {
          return message(
            1,
            'You provided both a Zotero Key and a Zenodo ID - but they are partially linked to different items. Please fix this by editing the records directly.',
            k
          );
        } else {
          // Linked to different items.
          return message(
            1,
            'You provided both a Zotero Key and a Zenodo ID - but they are both linked to different items. Please fix this by editing the records directly.',
            k
          );
        }
      } else if (k.zenodoIDFromZotero && !k.zoteroKeyFromZenodo) {
        if (k.zenodoIDFromZotero === k.zenodoID) {
          if (args.link) {
            console.log('Proceeding to linking');
            return await linkZotZen(args, k, data);
          } else {
            return message(
              1,
              "You provided both a Zotero Key and a Zenodo ID. The Zotero links to Zenodo, but Zenodo does not link back. You can link the items by providing the option 'link'",
              k
            );
          }
        } else {
          // Linked to different items.
          return message(
            1,
            'You provided both a Zotero Key and a Zenodo ID. The Zotero links to a different Zenodo item. Please fix this manually.',
            k
          );
        }
      } else if (!k.zenodoIDFromZotero && k.zoteroKeyFromZenodo) {
        if (k.zoteroKeyFromZenodo === k.zoteroKey) {
          if (args.link) {
            return await linkZotZen(args, k, data);
          } else {
            return message(
              1,
              "You provided both a Zotero Key and a Zenodo ID. The Zenodo record links to the Zotero item, but Zotero does not link back. You can link the items by providing the option 'link'. This will use the DOI from the Zenodo record as DOI for the Zotero item.",
              k
            );
          }
        } else {
          // Linked to different items.
          return message(
            1,
            'You provided both a Zotero Key and a Zenodo ID. The Zenodo links to a different Zotero item. Please fix this manually.',
            k
          );
        }
      } else {
        // Neither are defined
        if (args.link) {
          return await linkZotZen(args, k, data);
        } else {
          return message(
            1,
            "You provided both a Zotero Key and a Zenodo ID. The records are not linked. You can link the items by providing the option 'link'. Zenodo record links to the Zotero item, but Zotero does not link back. You can link the items by providing the option 'link'. This will use the DOI from the Zenodo record as DOI for the Zotero item.",
            k
          );
        }
      }
    } else {
      // We have Zotero, but no Zenodo
      if (k.zenodoIDFromZotero) {
        // However, we have a reference to a zenodo id.
        console.log(
          'Zotero key provided, and it links to Zenodo ID, but no Zenodo ID provided. Going to check this pair.'
        );
        args.id = k.zenodoIDFromZotero;

        return await zotzenLink(args);
      } else {
        if (args.link) {
          return await linkZotZen(args, k, data);
        } else {
          return message(
            1,
            "You provided a Zotero Key but no Zenodo ID. You can generate a Zenodo by providing the option 'link'. Zenodo record links to the Zotero item, but Zotero does not link back. You can link the items by providing the option 'link'. This will provided a DOI for the Zotero item.",
            k
          );
        }
      }
    }
  } else {
    // We dont have Zotero
    if (k.zenodoID) {
      if (k.zoteroKeyFromZenodo) {
        // However, we have a reference to a zotero id.
        console.log(
          'Zenodo ID provided, and it links to Zotero key, but no Zotero key provided initially. Going to check this pair.'
        );
        args.key = k.zoteroKeyFromZenodo;
        args.group_id = k.zoteroGroupFromZenodo;
        return await zotzenLink(args);
      } else {
        if (args.link) {
          return await linkZotZen(args, k, data);
        } else {
          return message(
            1,
            "You provided a Zenodo ID but no Zotero. At the moment it's not possible to generate a corresponding Zotero element, but this is planned. If the item has been published on Zenodo, please use e.g. the DOI to import to Zotero.",
            args
          );
        }
      }
    } else {
      return message(
        1,
        "You provided neither a Zotero Key nor Zenodo ID - nothing to do. You can create pairs of records with 'create'",
        args
      );
    }
  }
}

async function update_doi_and_link(k) {
  // TODO: Visit all refs to zenodo.org and check for (a) sandbox, and (b) decodation.
  const status = await zotero.update_doi({
    key: k.zoteroKey,
    group: k.zoteroGroup,
    doi: k.doi,
  });
  // Zotero item - attach links ... to Zenodo
  await zotero.attachLinkToItem(
    k.zoteroKey,
    'https://zenodo.org/deposit/' + k.zenodoID,
    {
      title: '🔄View entry on Zenodo (deposit)',
      tags: ['_r:zenodoDeposit', '_r:zotzen'],
    }
  );
  await zotero.attachLinkToItem(
    k.zoteroKey,
    'https://zenodo.org/record/' + k.zenodoID,
    {
      title: '🔄View entry on Zenodo (record)',
      tags: ['_r:zenodoRecord', '_r:zotzen'],
    }
  );
  // Zotero item - attach links ... to DOI
  if (k.doi) {
    await zotero.attachLinkToItem(k.zoteroKey, 'https://doi.org/' + k.doi, {
      title: '🔄Look up this DOI (once activated)',
      tags: ['_r:doi', '_r:zotzen'],
    });
  } else {
    await zotero.attachLinkToItem(
      k.zoteroKey,
      'https://doi.org/10.5281/zenodo.' + k.zenodoID,
      {
        title: '🔄Look up this DOI (once activated)',
        tags: ['_r:doi', '_r:zotzen'],
      }
    );
  }
  return status;
}

async function linkZotZen(args, k, data) {
  // TODO: The keySet should have zoteroGroup as well, adn this shoudl be checked...
  /* const keySet = {
        zoteroKey: zoteroKey,
        zenodoID: zenodoID,
        zoteroGroup: zoteroGroup,
        zenodoIDFromZotero: zenodoIDFromZotero,
        zoteroKeyFromZenodo: zoteroKeyFromZenodo,
        zoteroGroupFromZenodo: zoteroGroupFromZenodo,
        DOI: DOI
    } */
  // We have verified existence of items and linking status above. This function just links.
  let data_out = {};
  if (k.zenodoID && k.zoteroKey) {
    if (k.zoteroKeyFromZenodo && k.zenodoIDFromZotero) {
      // Nothing to do - items are linked
      console.log('Items are linked.');
    } else {
      // There's two items, but at least one of them is not linked to the other.
      if (!k.zoteroKeyFromZenodo) {
        // TODO: Testing
        console.log('Linking from Zenodo to Zotero (alters Zenodo record)');
        args.zotero_link = getZoteroSelectLink(
          k.zoteroKey,
          k.zoteroGroup,
          true
        );
        args.id = k.zenodoID;
        zenodoRecord = await zenodo.update(args);
      }
      if (!k.zenodoIDFromZotero) {
        // TODO: Testing
        console.log('Linking from Zotero to Zenodo (alters Zotero record)');
        const status = await update_doi_and_link(k);
      }
    }
  } else if (k.zoteroKey) {
    // We don't have both keys, so let's see whcih one there is. Is there a zoteroKey?
    // If yes, create a new zenodo record - that's the standard scenario.
    console.log('Using the zotero item to create a new zenodo record.');
    // TODO: testing
    args.zotero_link = getZoteroSelectLink(k.zoteroKey, k.zoteroGroup, true);
    args.title = data.zotero.title;
    args.description = data.zotero.description;
    args.date = data.date;
    // authors are a problem
    const [zenodoRecord, doi] = await zenodoCreate(args);
    data_out['zenodo'] = zenodoRecord;
    k.doi = doi;
    k.zenodoID = zenodoRecord.id;
    await update_doi_and_link(k);
    // TODO: To copy the data as comprehensively as possible, we should now run a sync.
    // synchronise(args)
  } else if (k.zenodoID) {
    // We don't have both keys and we don't have zotero key, so lets see whether we ahve a zenodo id
    // If yes, create a new zotero record
    // TODO: complete
    console.log(
      'Using Zenodo record to creating a new zotero record. Only title/desc/date/doi is copied.'
    );
    args.id = k.zenodoID; // <-- this ensures linking.
    // TODO - needs fixing
    args.doi = `............../zenodo.${k.zenodoID}`;
    // authors .... <-- TODO - need to copy authors
    // TODO - need to figure out why we have an array here: [0]
    args.title = data.zenodo[0].title;
    args.date = data.zenodo[0].date;
    args.description = data.zenodo[0].description;
    const [
      zoteroRecord,
      zoteroRecordGType,
      zoteroRecordGroup,
      zoteroRecordVersion,
    ] = await zoteroCreate(args);
    data_out['zotero'] = {
      data: zoteroRecord,
      metadata: [zoteroRecordGType, zoteroRecordGroup, zoteroRecordVersion],
    };
  } else {
    return message(
      1,
      'linkZotZen: You have to provide a zenodo id or zotero key.'
    );
  }
  return {
    args,
    keySet: k,
    data_in: data,
    data_out,
  };
}
/*
function linkZotZen(zoteroKey, zenodoDoi, group, zoteroLink = null) {
    if (args.debug) {
        console.log('DEBUG: linkZotZen');
    }
    runCommandWithJsonFileInput(
        `${group ? '--group-id ' + group : ''} update-item --key ${zoteroKey}`,
        {
            extra: `DOI: ${zenodoDoi}`,
        }
    );

    if (zoteroLink) {
        runCommand(`update ${zenodoDoi} --zotero-link ${zoteroLink}`, false);
    }
} */

async function zotzenSyncOne(args) {
  verbose(args, 'zotzenSync', args);
  // debug(args, "zotzenPush: result", result)
  // return result
  // let zoteroArgs = args
  // remove some args/add some args
  // zoteroArgs["func"] = "create"
  // const zoteroRecord = zoteroAPI(zoteroArgs);
  const zz = await zotzenLink(args);
  // Records are correctly linked - we can now proceed to sync/push
  // const DOI = zenodoRecord["metadata"]["prereserve_doi"]["doi"]
  // const doistr = 'DOI: ' + DOI
  /* --- */
  // if (!syncErrors(doi, zenodoRawItem, zoteroSelectLink)) {
  if (!zz || zz.status !== 0) {
    return message(
      1,
      'sorry, but the record(s) concerned is/are not properly linked (or there is only one record). Aborting.',
      args
    );
  }
  verbose(args, 'zz=', zz);
  console.log(`TEMPORARY syncone=${JSON.stringify(zz.data, null, 2)}`);
  /* TODO: Need to check whether the zenodo record is editable - otehrwise either abort or
   (with option 'newversion' given)
   produce a new version
    */
  const zenodoID = zz.data.zenodoID;
  let updateDoc = {
    id: zenodoID,
  };
  if (args.metadata) {
    console.log('metadata');
    if (zz.originaldata && zz.originaldata.zotero) {
      const zoteroItem = zz.originaldata.zotero;
      logger.info(`zoteroItem = ${JSON.stringify(zoteroItem, null, 2)}`, {
        func: 'zotzenSyncOne',
      });
      // Sync metadata
      updateDoc = {
        ...updateDoc,
        title: zoteroItem.title,
        description: zoteroItem.abstractNote,
      };

      if (Array.isArray(zoteroItem.creators) && zoteroItem.creators.length) {
        logger.info('adding name from zotero');
        updateDoc.authors = zoteroItem.creators.map((c) => ({
          name: c.name ? c.name : `${c.firstName} ${c.lastName}`,
        }));
      }

      if (zoteroItem.date) {
        updateDoc.publication_date = zoteroItem.date;
      }

      // console.log("TEMPORARY="+JSON.stringify( updateDoc           ,null,2))
      // TODO: capture this output
      console.log('metadata done');
      // console.log("TEMPORARY updated="+JSON.stringify(  updated          ,null,2))
    } else {
      return message(1, 'sorry, did not find sync data', args);
    }
  } else {
    console.log('metadata sync was not requested');
  }
  logger.info('checking Attachments.');
  //noattachmentsfound
  /*
  The following code requests download of attachments from Zotero and upload to Zenodo.
  It may or may not run. If it does not run, attachments is null.
  */
  let attachments;
  if (args.attachments) {
    logger.info('Attachments arg provided via cli...');
    // get information about attachments
    const myargs = { ...args, children: true };
    // console.log("TEMPORARY="+JSON.stringify(myargs            ,null,2))
    const children = await zotero.item(myargs);
    logger.info('children %O', children);
    // Select file attachments
    attachments = children.filter(
      (c) =>
        c.data.itemType === 'attachment' &&
        (c.data.linkMode === 'imported_file' ||
          c.data.linkMode === 'imported_url')
    );

    logger.info('selected file attachment count: %s', attachments.length);

    if ('type' in args && args.type) {
      logger.info('filtering attachments by type');
      const attachmentType = args.type.toLowerCase();
      if (attachmentType !== 'all') {
        attachments = attachments.filter((a) =>
          a.data.filename.endsWith(attachmentType)
        );
      }
      logger.info(
        'attachment count after filter by arg: %s',
        attachments.length
      );
    }

    if ('tag' in args && args.tag) {
      const tag = as_value(args.tag);

      logger.info(
        'count before filtering attachments by tag: %s',
        attachments.length
      );
      attachments = attachments.filter((a) => {
        // .log(">>>" + a.data.filename)
        // console.log("TEMPORARY=" + JSON.stringify(a.data.tags.map(element => { return element.tag }), null, 2))
        // console.log(args.tag)
        // const arr = a.data.tags.map(element => { return element.tag })
        // console.log(arr.includes(tag))
        return a.data.tags
          .map((element) => {
            return element.tag;
          })
          .includes(tag);
      });
      logger.info(
        'count after filtering attachments by tag: %s',
        attachments.length
      );
    }
    // console.log("ATTACHMENTS_TEMPORARY="+JSON.stringify(   attachments         ,null,2))
    // TODO: We should remove existing draft attachments in the Zenodo record
    if (attachments.length === 0) {
      // TODO: If the Zotern item has too many attachments (>25?) they don't all get picked up. Need to fix that above.
      console.log('No attachments found.');
    } else {
      for (const element of attachments) {
        logger.info(
          `${element.data.key}->${element.data.filename}, %O`,
          element.data.tags
        );
        const file = await zotero.attachment({
          key: element.data.key,
          save: element.data.filename,
        });
        // console.log("TEMPORARY=" + JSON.stringify(file, null, 2))
      }
      updateDoc.files = attachments.map((attachment) => {
        return attachment.data.filename;
      });
    }
    // }
    // return dummycreate(args) */
  } else {
    console.log('attachment sync was not requested');
  }
  // console.log("updateDoc=" + JSON.stringify(updateDoc, null, 2))
  // make sure we get the file links:
  updateDoc.strict = true;
  updateDoc.publish = args.publish;
  logger.info(
    `updating zenodo record, data = ${JSON.stringify(updateDoc, null, 2)}`
  );
  const updated = await zenodo.update(updateDoc);
  // handle error if the update wasn't successful. Requires changing zenodo.update to return the status.
  // if (updated.status != 0) {
  if (1 != 1) {
    // error handling
  } else {
    logger.info('updated zenodo record = %O', updated);
    // The update was successful -- If attachments sync was requested, now mark the same files on zotero
    if (args.attachments) {
      if (attachments.length === 0) {
      } else {
        // Attach a tag to the attachments
        for (const element of attachments) {
          logger.info(
            `${element.data.key}->${element.data.filename}, %O`,
            element.data.tags
          );
          //noattachmentsfound
          /*
          The intention here is that anything that has been transferred from Zotero to Zenodo is now tagged.
          This may be where the error occurs?
          TypeError: attachments is not iterable
    at zotzenSyncOne (/usr/local/lib/node_modules/zotzen-lib/src/zotzen-lib.js:1136:35)
    at process._tickCallback (internal/process/next_tick.js:68:7)
          */
          const file = await zotero.item({
            key: element.data.key,
            addtags: ['_zenodoETH', '_zenodoETH:uploaded'],
          });
          console.log('ATTACHMENT TAG=' + JSON.stringify(file, null, 2));
        }
      }
    }
    // Attach outgoing tag:
    if (args.publish) {
      logger.info('Publishing...');
      if (updated.submitted) {
        const x = await zotero.item({
          key: args.key,
          addtags: ['_zenodoETH', '_zenodoETH:submitted'],
        });
        console.log('TEMPORARY=' + JSON.stringify(x, null, 2));
      } else {
        console.log('Record unsubmitted');
      }
    }
  }
  // process.exit(1);
  // TODOMD5
  // TODO: updated has the md5 sums for the files. They should be compared the md5 sums from Zotero.
  // TODO - this should report on what was done: List the metadata and the files.
  return updated; // message(0, "Sync complete")
  // TODO? Final actions?
}

async function newversion(args, subparsers) {
  if (args.getInterface && subparsers) {
    const parser_newversion = subparsers.add_parser('newversion', {
      help:
        'Generate a new version of the Zenodo record linked to the same Zotero item.',
    });
    parser_newversion.set_defaults({ func: newversion });
    parser_newversion.add_argument('--key', {
      nargs: 1,
      help: 'One Zotero key for updating.',
    });
    parser_newversion.add_argument('--deletefiles', {
      action: 'store_true',
      help: 'Remove files from the newly created version.',
    });
    return { status: 0, message: 'success' };
  }
  if (!args.key) return null;
  // TODO: What about concept DOIs? When we add a DOI to a Zeotero record, we should add ConceptDOI as well.
  console.log('Creating new version on Zenodo.');
  // const newVersionResponse = runCommand(`newversion ${doi}`, false);
  let linkrequest = {
    key: args.key,
    group_id: args.group_id,
    library_type: args.group_type,
    debug: false,
    show: false,
    link: false,
  };
  let result = await zotzenLink(linkrequest);
  // console.log("TEMPORARY=" + JSON.stringify(result, null, 2))
  if (result.status != 0) {
    console.log('The items provided are not linked');
    process.exit(1);
  }
  if (!result.originaldata.zenodo) {
    console.log('TEMPORARY=' + JSON.stringify(result, null, 2));
    console.log('LIBRARY-ERROR: Zenodo item was not retrieved.');
    process.exit(1);
  }
  const zenodorecord = result.originaldata.zenodo;
  // console.log("TEMPORARY=" + JSON.stringify(zenodorecord, null, 2))
  /* if (zenodorecord.state === "unsubmitted") {
        console.log("The Zenodo item had pending changes. Cannot create new version.")
        process.exit(1)
    }  */
  if (!zenodorecord.submitted) {
    console.log(
      'The Zenodo item is unsubmitted. You do not have to create a new version.'
    );
    process.exit(1);
  }
  // Let's make a new version of the Zenodo record.
  console.log('Proceeding to create a new version.');
  const res = await zenodo.newversion({
    id: [zenodorecord.id],
    deletefiles: true,
  });
  console.log('TEMPORARY=' + JSON.stringify(res, null, 2));
  // ^^^ The new record is automatically linked to the Zotero item.
  // However, for the Zotero item, we need to update the DOI.
  const res2 = await zotero.update_doi({
    key: args.key,
    group: args.group_id,
    doi: res.response.doi,
  });
  return {
    status: 0,
    zenodo: res,
    zotero: res2,
  };
}

function getZoteroSelectLink(
  item_key,
  group_id,
  isgroup = true,
  isitem = true
) {
  return `zotero://select/${isgroup ? 'groups' : 'users'}/${group_id}/${
    isitem ? 'items' : 'collections'
  }/${item_key}`;
}

module.exports.sync = zotzenSync;
module.exports.create = zotzenCreate;
module.exports.link = zotzenLink;
module.exports.zenodoCreate = zenodoCreate;
module.exports.zoteroCreate = zoteroCreate;
module.exports.zotzenSyncOne = zotzenSyncOne;
module.exports.newversion = newversion;
