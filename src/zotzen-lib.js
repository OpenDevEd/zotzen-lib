module.exports.sync = zotzenSync;
module.exports.create = zotzenCreate;
module.exports.link = zotzenLink;
module.exports.zenodoCreate = zenodoCreate;
module.exports.zoteroCreate = zoteroCreate;
module.exports.zotzenSyncOne = zotzenSyncOne;

// TODO: At the moment, the links produces are not 'sandbox aware'. It's only a minor issue for production, but would be nice for testing.
// Similarly, check for string '......./zenodo.' where we need to enter missing parts of DOIs properly

const zenodoLibCreate_Args = {
    title: "string",
    date: "date string",
    description: "string",
    authors: ["First Second Last; affiliation", "First2 Last2; affiliation2"],
    communities: "file to communities",
    zotero_link: "string (zotero://...)",
    reportNumber: "Zotero only",
    reportType: "Zotero only",
    institution: "EdTech Hub",
    language: "en",
    rights: "Creative Commons Attribution 4.0",
    googledoc: "url to google doc - not working yet",
    kerko_url: "https://docs.edtechhub.org/lib/",
    tags: ["AddedByZotZen"],
    collections: ["IY4IS3FU"],
    team: "neither",
    group_id: 2259720,
    json: "Zenodo template file"
}

//const { delete } = require("request-promise-native");
// PRODUCTION: Load library
//const zotero = require("zotero-api-lib");
const zenodo = require("zenodo-lib");
const Zotero = require("zotero-lib");
var zotero = new Zotero({})

// TESTING: Load locally for testing
// const zotero = require("../zotero-api-lib/index"); ///??
// const zenodo = require("../zenodo-cli/build/functions")

//var fs = require('fs');
function dummycreate(args) {
    var create_data = require('./data.json');
    create_data["args"] = args;
    return create_data;
}

function debug(args, msg, data) {
    if (args &&
        (
            ("debug" in args && args.debug)
            ||
            ("verbose" in args && args.verbose)
        )
    ) {
        console.log('DEBUG: ' + msg);
        if (data) {
            console.log(JSON.stringify(data, null, 2))
        }
    }
}

function verbose(args, msg, data) {
    if (args && "verbose" in args && args.verbose) {
        console.log('VERBOSE: ' + msg);
        if (data) {
            console.log(JSON.stringify(data, null, 2))
        }
    }
}

//--
async function zenodoCreate(args) {
    // TODO: What if this is a user lib?
    if (!args.zotero_link && args.key && args.group_id) {
        console.log("Adding args.zotero_link from key/group_id provided")
        args.zotero_link = getZoteroSelectLink(args.key, args.group_id, true)
    }

    console.log("zenodoCreate, args=" + JSON.stringify(args, null, 2))

    try {
        console.log("zotzen-lib: calls zenodo.create")
        zenodoRecord = await zenodo.create(args)
        console.log("zotzen-lib: zenodo.create returns")
    } catch (e) {
        debug(args, "zotzenCreate: error=", e)
        console.log(e)
    }
    debug(args, "zotzenCreate: result:", zenodoRecord)
    // return result
    // let zoteroArgs = args
    // // remove some args/add some args
    // zoteroArgs["func"] = "create"
    // const zoteroRecord = zoteroAPI(zoteroArgs);
    if (!zenodoRecord || !zenodoRecord["metadata"] || !zenodoRecord["metadata"]["prereserve_doi"]) {
        console.log("ERROR in ZenodoRecord creation.")
        process.exit(1)
    }
    const DOI = zenodoRecord["metadata"]["prereserve_doi"]["doi"]
    const base = zenodoRecord["links"]["self"].search(/sandbox/) ? "sandbox" : ""
    console.log(base)
    return [zenodoRecord, DOI, base]
    // [zenodoRecord, DOI] = zenodoCreate(args)
}

async function zoteroCreate(args) {
    // complement the set of args provided according to zenodoLibCreate_Args
    Object.keys(args).forEach(mykey => {
        if (!args[mykey]) {
            if (mykey == "collections") { // mykey == "tags" || authors
                args[mykey] = []
            } else {
                args[mykey] = ""
            }
        }
    })
    if (!args.collections) {
        args.collections = []
    } else {
        if (!Array.isArray(args.collections)) {
            args.collections = [args.collections]
        }
    }
    const doistr = args.doi ? 'DOI: ' + args.doi : ""
    let tagsarr = zotero.objectifyTags(args.tags)
    let authorsarr = []
    if (args.authors) {
        args.authors.forEach(myauth => {
            myauth = myauth.replace(/\;.*$/, "")
            const firstlast = myauth.split(/ +/)
            //console.log("X-- "+firstlast.slice(0, 1).join(" "))
            //console.log("X-- "+firstlast.slice(0, firstlast.length - 1).join(" "))
            const first = firstlast.length > 1 ? firstlast.slice(0, firstlast.length - 1).join(" ") : ""
            const last = firstlast[firstlast.length - 1]
            authorsarr.push({
                "creatorType": "author",
                "firstName": first,
                "lastName": last
            })
        })
    }
    //const extrastr = args.team ? doistr + "\n" + "EdTechHubTeam: " + args.team : doistr    
    const extrastr = doistr
    const report = {
        "itemType": "report",
        "title": args.title,
        "creators": authorsarr,
        "abstractNote": args.description,
        "reportNumber": args.reportNumber,
        "reportType": args.reportType,
        "seriesTitle": "",
        "place": "",
        "institution": args.institution,
        "date": args.date,
        "pages": "",
        "language": args.language,
        "shortTitle": "",
        "url": "",
        "accessDate": "",
        "archive": "",
        "archiveLocation": "",
        "libraryCatalog": "",
        "callNumber": "",
        "rights": args.rights,
        "extra": extrastr,
        "tags": tagsarr,
        "collections": args.collections
    }

    //copy selected args to zarg
    let zarg = {
        item: report,
        // We need to get the full response
        fullresponse: true
    }
    if (args.group_id) {
        zarg.group_id = args.group_id
    }
    // Copy explicit config if it's been given:
    zarg.config = args.zotero_config ? args.zotero_config : null
    zarg.config_json = args.zotero_config_json ? args.zotero_config_json : null
    zarg.zotero_api_key = args.zotero_api_key ? args.zotero_api_key : null
    zarg.api_key = args.api_key ? args.api_key : null

    debug(args, "zoteroCreate: call", null)
    const zoteroResult = await zotero.create_item(zarg)
    const zoteroRecord = zotero.pruneData(zoteroResult)
    debug(args, "zotzenCreate: result:", zoteroResult)
    const zoteroRecordVersion = zoteroResult.successful["0"].version
    const zoteroRecordGType = zoteroResult.successful["0"].library.type
    const zoteroRecordGroup = zoteroResult.successful["0"].library.id

    // TODO: The following two don't make sense - either ID or DOI should be ok! Need to get one from the other.
    // TODO: Move Zotero functions here? Or use Zotero functions... atm it's duplicated.
    // TODO: Visit both refs to zenodo.org and check for (a) sandbox, and (b) decodation.
    let decorations = []
    // What if we are in the sandbox?
    console.log(args.base)
    const base = args.base == "sandbox" ? "sandbox." : ""
    if (args.id === null) {
        console.log("TEMPORARY=" + JSON.stringify(args, null, 2))
        process.exit(1)
    }
    if (args.id) {
        // Zotero item - attach links ... to Zenodo
        const res = await zotero.attachLinkToItem(zoteroRecord.key, `https://${base}zenodo.org/deposit/${args.id}`, { title: "🔄View entry on Zenodo (deposit)", tags: ["_r:zenodoDeposit", "_r:zotzen"] })
        decorations.push(res)
    }
    if (args.id) {
        // Zotero item - attach links ... to Zenodo
        const res = await zotero.attachLinkToItem(zoteroRecord.key, `https://${base}zenodo.org/record/${args.id}`, { title: "🔄View entry on Zenodo (record)", tags: ["_r:zenodoRecord", "_r:zotzen"] })
        decorations.push(res)
    }
    if (args.doi) {
        // Zotero item - attach links ... to DOI
        const res = await zotero.attachLinkToItem(zoteroRecord.key, "https://doi.org/" + args.doi, { title: "🔄Look up this DOI (once activated)", tags: ["_r:doi", "_r:zotzen"] })
        decorations.push(res)
    }

    for (const i in args.collections) {
        // Ⓩ🅩🆉
        //console.log(args.collections[i])
        //process.exit(1)
        const res = await zotero.attachLinkToItem(
            zoteroRecord.key,
            getZoteroSelectLink(args.collections[i], zoteroRecordGroup, true, false),
            {
                title: "🆉View primary collection for this item" + (args.collections.length > 0 ? " [" + i + "]" : ""),
                tags: ["_r:collection", "_r:zotzen"]
            })
        decorations.push(res)
    }

    // Zotero item - attach links ... to Google Doc
    if (args.googledoc) {
        // Attach link to google doc, if there is one:
        const res = await zotero.attachLinkToItem(zoteroRecord.key, args.googledoc, { title: "📝View Google Doc and download alternative formats", tags: ["_r:googleDoc", "_r:zotzen"] })
        decorations.push(res)
    }

    // Zotero item - attach note
    const team = args.team ? `<p><b>Team (via form):</b> ${args.team}</p>` : ""
    const note = args.team ? `<p><b>Note (via form):</b> ${args.note}</p>` : ""
    const content = `${team} ${note}`
    const res = await zotero.attachNoteToItem(zoteroRecord.key, { content: content, tags: ["_r:noteViaForm", "_r:zotzen"] })
    decorations.push(res)

    // Attach kerko url to Zotero record (as url)
    newZoteroRecord = zoteroRecord
    const kerko_url = args.kerko_url ? args.kerko_url + zoteroRecord.key : ""
    if (kerko_url != "") {
        console.log("updating...")
        const zoteroUpdate = {
            key: zoteroRecord.key,
            version: zoteroRecordVersion,
            update: { url: kerko_url },
            fullresponse: false
        }
        const status = await zotero.update_item(zoteroUpdate)
        // update_item doesn't return the item, but only a status - we should check the status at this point.
        newZoteroRecord = await zotero.item({ key: zoteroRecord.key, fullresponse: false })
        // Attach link to kerko
        const res = await zotero.attachLinkToItem(zoteroRecord.key, kerko_url, { title: "👀View item in Evidence Library", tags: ["_r:kerko", "_r:zotzen"] })
        decorations.push(res)
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

    return [newZoteroRecord,
        zoteroRecordGType,
        zoteroRecordGroup,
        zoteroRecordVersion,
        decorations
    ]
}

async function zoteroCreateCollections(itemKey, collectionKey = "", groupID, isgroup = true) {
}

/*
TOP-LEVEL FUNCTION 
*/
async function zotzenCreate(args, subparsers) {
    // TODO - we have to fix the communities for Zenodo.
    const testargs = {
        reportNumber: "100-from-form",
        reportType: "Some report type - from form",
        note: "Note content - will be added to note. Add additional information from form, e.g. user who submitted the form as well as date.",
        institution: "EdTech Hub",
        language: "en",
        rights: "Creative Commons Attribution 4.0",
        tags: ["_r:AddedByZotZen"],
    }
    if (args.getInterface && subparsers) {
        const parser_create = subparsers.add_parser(
            "create", {
            "help": "Create a new pair of Zotero/Zenodo entries. Note: If you already have a Zotero item, use 'link' instead. If you have a Zenodo item already, but not Zotero item, make a zotero item in the Zotero application and also use 'link'."
        })
        parser_create.set_defaults({ "func": zotzenCreate });
        parser_create.add_argument('--group-id', {
            "nargs": 1,
            help: 'Group ID for which the new item Zotero is to be created. (Can be provided via Zotero config file.)',
        })
        // This set of options should match zenodo-cli create
        parser_create.add_argument("--json", {
            "action": "store",
            "help": "Path of the JSON file with the metadata for the zenodo record to be created. If this file is not provided, a template is used. The following options override settings from the JSON file / template."
        })
        parser_create.add_argument("--title", {
            "action": "store",
            "help": "The title of the record. Overrides data provided via --json. (Zotero/Zenodo)"
        })
        parser_create.add_argument("--authors", {
            "nargs": "*",
            "action": "store",
            "help": "List of authors, (provided on the command line, one by one). Separate institution and ORCID with semicolon, e.g. 'Lama Yunis;University of XYZ;0000-1234-...'. (You can also use --authordata.) Overrides data provided via --json. (Zotero/Zenodo)"
        })
        parser_create.add_argument("--authordata", {
            "action": "store",
            "help": "A text file with a database of authors. Each line has author, institution, ORCID (tab-separated). The data is used to supplement insitution/ORCID to author names specified with --authors. Note that authors are only added to the record when specified with --authors, not because they appear in the specified authordate file. (Zotero/Zenodo)"
        })
        parser_create.add_argument("--date", {
            "action": "store",
            "help": "The date of the record. Overrides data provided via --json. (Zotero/Zenodo)"
        })
        parser_create.add_argument("--description", {
            "action": "store",
            "help": "The description (abstract) of the record. Overrides data provided via --json. (Zotero/Zenodo)"
        })
        parser_create.add_argument("--communities", {
            "action": "store",
            "help": "Read list of communities for the record from a file. Overrides data provided via --json. (Zenodo only)"
        })
        parser_create.add_argument("--add-communities", {
            "nargs": "*",
            "action": "store",
            "help": "List of communities to be added to the record (provided on the command line, one by one). Overrides data provided via --json.  (Zenodo only)"
        })
        // Not needed as we're creating new records
        /* parser_create.add_argument("--remove-communities", {
          "nargs": "*",
          "action": "store",
          "help": "List of communities to be removed from the record (provided on the command line, one by one). Overrides data provided via --json."
        }); */
        parser_create.add_argument("--collections", {
            "nargs": "*",
            "action": "store",
            "help": "List of collections for the Zotero item. (Zotero only)"
        })
        parser_create.add_argument('--kerko-url', {
            "nargs": 1,
            help: 'If you have a kerko instance, you can pass the base URL here. It will be used to add a URL to the Zotero record.) (Zotero only)',
        })
        parser_create.add_argument('--googledoc', {
            "nargs": 1,
            help: 'Provide a google doc as a source for your document (Zotero only)',
        })
        // Not needed, as we're creating this. 
        /* parser_create.add_argument("--zotero-link", {
          "action": "store",
          "help": "Zotero link of the zotero record to be linked. Overrides data provided via --json."
        }); */
        return { status: 0, message: "success" }
    }

    verbose(args, "zotzenlib.zotzenCreate -> zenodo", args)
    // let result = dummycreate(args)
    // Create zenodo record
    const [zenodoRecord, DOI, base] = await zenodoCreate(args)
    // console.log("TEMPORARYXXX="+JSON.stringify(   base         ,null,2))
    args.id = zenodoRecord.id
    args.doi = DOI
    args.base = base
    verbose(args, "zotzenlib.zotzenCreate -> zotero", args)
    const [zoteroRecord,
        zoteroRecordGType,
        zoteroRecordGroup,
        zoteroRecordVersion,
        decorations
    ] = await zoteroCreate(args)
    // const zoteroGroup = args.group_id
    // TODO: Replace this with 'getZoteroLink' functionb elow - otherwise this will not work for user libs
    // Actually - as we are about the attach this to the Zenodo item - it will not work for user libs in any case...
    if (zoteroRecordGType != "group") {
        console.log("The zotero record is in a user library.")
        return this.message(1, "ERROR: group-type=user not implemented")
    }
    // console.log(`key=${zoteroRecord.key}`)
    // process.exit(1)
    // Now update the zenodo record with the ZoteroId.
    let zenodoRecord2
    const zoteroSelectLink = getZoteroSelectLink(zoteroRecord.key, zoteroRecordGroup, true)
    promiseall: {
        // The creation of the first Zotero/Zenodo record needs to be sequences.
        // However, the items below could be done through a 'Promise all' as they can run in parallel.

        // Attach idenfier to zenodo record.
        args.zotero_link = zoteroSelectLink
        args.id = zenodoRecord.id
        if (args.kerko_url) {
            args.description += `<p>Available from <a href="${args.kerko_url + DOI}">${args.kerko_url + DOI}</a></p>` // (need to use DOI here, as the link to the zoteroRecord.key is not necc. permanent)
        }
        zenodoRecord2 = await zenodo.update(args)
        //console.log(JSON.stringify(zenodoRecord2, null, 2))
    }
    const kerko_url = args.kerko_url ? args.kerko_url + zoteroRecord.key : ""
    const record = {
        status: 0,
        message: "success",
        data: {
            zenodoRecordID: zenodoRecord.id,
            zoteroItemKey: zoteroRecord.key,
            zoteroGroup: zoteroRecordGroup,
            zoteroSelectLink: zoteroSelectLink,
            zoteroRecordVersion: zoteroRecordVersion,
            DOI: DOI,
            kerko_url: kerko_url
        },
        zotero: {
            data: zoteroRecord,
            decorations: decorations
        },
        zenodo: {
            data: zenodoRecord2.metadata
        }
    }
    console.log('Zotero/Zenodo records successfully created.');
    return record
}



/*
async function zotzenLink(args) {
    verbose(args, "zotzenLink", args)
    const result = dummycreate(args)
    debug(args, "zotzenLink: result", result)
    return result

}*/

/*
Top Level function
*/
async function zotzenSync(args, subparsers) {
    if (args.getInterface && subparsers) {
        const parser_sync = subparsers.add_parser(
            "sync", {
            "help": "Synchronise data from one or more Zotero items to their corresponding Zenodo items. Note that synching from Zenodo to Zotero is not implemented."
        });
        parser_sync.set_defaults({ "func": zotzenSync });
        parser_sync.add_argument(
            "key", {
            "nargs": "*",
            "help": "One or more Zotero keys for synchronisation."
        });
        parser_sync.add_argument(
            '--metadata', {
            action: 'store_true',
            help: 'Push metadata from zotero to zenodo.'
        });
        parser_sync.add_argument(
            '--attachments', {
            action: 'store_true',
            help: 'Push Zotero attachments to Zenodo.'
        });
        parser_sync.add_argument(
            '--type', {
            action: 'store',
            help: 'Type of the attachments to be pushed.',
            default: 'all'
        });
        parser_sync.add_argument('--publish', {
            action: 'store_true',
            help: 'Publish zenodo record.'
        });
        return { status: 0, message: "success" }
    }
    if (!args.key) return null
    const keys = Array.isArray(args.key) ? args.key : [args.key]
    delete args["key"]
    let output = []
    // TODO: Shoudl check whether args.key is an array or not
    for (const key of keys) {
        let myargs = args
        myargs.key = key
        const rec = await zotzenSyncOne(myargs)
        output.push(rec)
    }
    return output
}

function message(stat = 0, msg = "None", data = null) {
    return {
        "status": stat,
        "message": msg,
        "data": data
    }
}

function zenodoParseID(str) {
    // What is str is an integer?
    if (typeof (str) === "number") {
        return str
    }
    if (Array.isArray(str)) {
        str = str[0]
    }
    const zenodoIDstr = str.match(/(\d+)$/s)
    let zenodoIDref = null;
    if (zenodoIDstr) {
        zenodoIDref = zenodoIDstr[1]
        console.log(`Got Zenodo ID = ${zenodoIDref}`)
    }
    return parseInt(zenodoIDref)
}

// TODO - these shoudl be replaced by the native zotero-lib functions
function zoteroParseKey(str) {
    //const arr = zotlink.split("/")
    //arr[arr.length - 1]       
    console.log(`zoteroParseKey = ${str}`)
    if (Array.isArray(str))
        str = str[0]
    let zoteroKey = str;
    const a = str.match(/([\d\w]+)\/?$/s)
    if (a) {
        zoteroKey = a[1]
        console.log(`Got Zotero Key = ${zoteroKey}`)
    }
    return zoteroKey
}
function zoteroParseGroup(str) {
    //const arr = zotlink.split("/")
    //arr[arr.length - 1]        
    let zoteroGroup = null
    str = str.toString()
    const a = str.match(/\/(\d+)\//s)
    if (a) {
        zoteroGroup = a[1]
        console.log(`Got Zotero Group (/) = ${zoteroGroup}`)
    } else {
        const a = str.match(/^(\d+)\:/s)
        if (a) {
            zoteroGroup = a[1]
            console.log(`Got Zotero Group (:) = ${zoteroGroup}`)
        }
    }
    return zoteroGroup
}

// TODO: complete
function zenodoParseIDFromZoteroRecord(item) {
    const extra = item.extra.split("\n")
    let doi = ""
    let id = ""
    extra.forEach(element => {
        let res = element.match(/^\s*doi:\s*(.*?(\d+))$/i)
        if (res) {
            doi = res[1]
            id = res[2]
        }
    });
    return id
}

// This function can be called recursively - it's not efficient...
async function zotzenLink(args, subparsers) {
    // This functions gets whatever items possible, which can then be checked.
    if (args.getInterface && subparsers) {
        const parser_link = subparsers.add_parser(
            "link", {
            "help": "Link Zotero item with a Zenodo item, or generate a missing item."
        });
        parser_link.set_defaults({ "func": zotzenLink });
        parser_link.add_argument(
            "--id", {
            "nargs": 1,
            "help": "Provide one/no Zenodo item."
        });
        parser_link.add_argument(
            "--key", {
            "nargs": 1,
            "help": "Provide one/no Zotero item."
        });
        parser_link.add_argument(
            '--link', {
            action: 'store_true',
            help: 'Perform links/item creation as needed.'
        });
        parser_link.add_argument(
            '--group_id', {
            nargs: 1,
            help: 'Zotero group.'
        });
        return { status: 0, message: "success" }
    }
    debug(args, "zotzenLink", args)
    //-- Get the Zotero item [if one was specified]
    let zenodoIDFromZotero = null
    const zoteroKey = args.key ? zoteroParseKey(args.key) : null
    // TODO: Parse zoteroGroup from key if poss.
    const zoteroGroup = args.group_id ? args.group_id :
        args.key ? zoteroParseGroup(args.key) : null
    if (!zoteroGroup) {
        console.log("unable to extract group")
        return null
    } else {
        args.group_id = zoteroGroup
    }
    let zoteroItem = null
    args.key = zoteroKey
    if (zoteroKey) {
        // There's a key, so we can get the item.    
        debug(args, "zoteroItem: call", args)
        zoteroItem = await zotero.item(args);
        debug(args, "zotzenCreate: result:", zoteroItem)
        // zoteroRecord.extras -> DOI -> zenodo
        // return zoteroRecord
        // "extra": "DOI: 10.5072/zenodo.716876",
        // TODO - this will not work for Zotero recordTypes other the 'record'
        zenodoIDFromZotero = zenodoParseIDFromZoteroRecord(zoteroItem)
    } else {
        console.log("You did not provided a 'key' (for a zotero item)", args)
    }
    //-- Zenodo Record [if one was specified]
    let zoteroKeyFromZenodo = null
    let zoteroGroupFromZenodo = null
    const zenodoID = args.id ? zenodoParseID(args.id) : null
    let zenodoRecord = null
    args.id = zenodoID
    if (zenodoID) {
        //-- Get the zenodo record
        console.log("Get the zenodo record, TEMPORARY=" + JSON.stringify(args, null, 2))

        const zenodoID = args.id ? zenodoParseID(args.id) : null
        try {
            console.log("zotzen-lib: calls zenodo.getRecord")
            zenodoRecord = await zenodo.getRecord(args)
            console.log("zotzen-lib: zenodo.getRecord returns")
        } catch (e) {
            debug(args, "zotzenCreate: error=", e)
            console.log(e)
            return null
        }
        debug(args, "zotzenCreate: result:", zenodoRecord)
        //console.log(JSON.stringify(zenodoRecord[0].metadata["related_identifiers"],null,2))
        let zotlink = null
        if (zenodoRecord && zenodoRecord[0]) {
            if (zenodoRecord[0].metadata["related_identifiers"]) {
                const ri = zenodoRecord[0]["metadata"]["related_identifiers"]
                // We should iterate through these TODO
                zotlink = ri[0].identifier
                zoteroKeyFromZenodo = zoteroParseKey(zotlink)
                zoteroGroupFromZenodo = zoteroParseGroup(zotlink)
            } else {
                console.log("The Zenodo item is not linked to a Zoteroitem")
                // ask prompt or check tags and proceed to link TODO
            }
        } else {
            console.log("Request completed successfully, but no data was retrieved. Do you have access to the record?")
        }
        //if (!zotlink) {
        //    console.log("The zenodo record does not link back to the zotero item - use 'link'")
        //}
    } else {
        console.log("You did not provided an 'id' (for a zenodo item)", args)
    }
    // We now have all potential keys and links:
    const zenodoState = zenodoRecord && zenodoRecord[0] && zenodoRecord[0].state ? zenodoRecord[0].state : null
    const zenodoSubmitted = zenodoRecord && zenodoRecord[0] && zenodoRecord[0].submitted ? zenodoRecord[0].submitted : null
    const keySet = {
        zoteroKey: zoteroKey,
        zenodoID: zenodoID,
        zoteroGroup: zoteroGroup,
        zenodoIDFromZotero: zenodoIDFromZotero,
        zoteroKeyFromZenodo: zoteroKeyFromZenodo,
        zoteroGroupFromZenodo: zoteroGroupFromZenodo,
        doi: "......../zenodo." + zenodoID,
        zenodoState: zenodoState,
        zenodoSubmitted: zenodoSubmitted
    }
    const data = {
        zotero: zoteroItem,
        zenodo: zenodoRecord
    } // We'll have to pass the data as well - otherwise we have to look it up again below
    // TODO: Fix the DOI above - either take it from the actual DOI or the pre-reserved DOI.
    let result = await checkZotZenLink(args, keySet, data)
    //console.log("TEMPORARY=" + JSON.stringify(result, null, 2))
    // Need to allow for one iteration
    if (result.originaldata)
        result.originaldata2 = data
    else
        result.originaldata = data
    if (result.originalkeyset)
        result.originalkeyset2 = keySet
    else
        result.originalkeyset = keySet
    return result
}

async function checkZotZenLink(args, k, data) {
    if (k.zenodoID) {
        k.zenodoID = k.zenodoID.toString()
    }
    if (k.zenodoIDFromZotero) {
        k.zenodoIDFromZotero = k.zenodoIDFromZotero.toString()
    }
    if (k.zoteroKey) {
        // Zotero key provided
        if (k.zenodoID) {
            // zenodo id provided
            if (k.zenodoIDFromZotero && k.zoteroKeyFromZenodo) {
                // the zenodo record links to zotero
                if (k.zenodoIDFromZotero === k.zenodoID && k.zoteroKeyFromZenodo === k.zoteroKey) { // TODO: && zoteroGroup === zoteroGroupFromZenodo (we need to check groups as well, just to be sure)
                    // Great!
                    return message(0, "You provided both a Zotero Key and a Zenodo ID - and they are linked.", k)
                } else if (k.zenodoIDFromZotero === k.zenodoID && k.zoteroKeyFromZenodo != k.zoteroKey) {
                    return message(1, "You provided both a Zotero Key and a Zenodo ID - but they are partially linked to different items. Please fix this by editing the records directly.", k)
                } else if (k.zenodoIDFromZotero != k.zenodoID && k.zoteroKeyFromZenodo === k.zoteroKey) {
                    return message(1, "You provided both a Zotero Key and a Zenodo ID - but they are partially linked to different items. Please fix this by editing the records directly.", k)
                } else {
                    // Linked to different items.
                    return message(1, "You provided both a Zotero Key and a Zenodo ID - but they are both linked to different items. Please fix this by editing the records directly.", k)
                }
            } else if (k.zenodoIDFromZotero && !k.zoteroKeyFromZenodo) {
                if (k.zenodoIDFromZotero === k.zenodoID) {
                    if (args.link) {
                        console.log("Proceeding to linking")
                        return await linkZotZen(args, k, data)
                    } else {
                        return message(1, "You provided both a Zotero Key and a Zenodo ID. The Zotero links to Zenodo, but Zenodo does not link back. You can link the items by providing the option 'link'", k)
                    }
                } else {
                    // Linked to different items.
                    return message(1, "You provided both a Zotero Key and a Zenodo ID. The Zotero links to a different Zenodo item. Please fix this manually.", k)
                }
            } else if (!k.zenodoIDFromZotero && k.zoteroKeyFromZenodo) {
                if (k.zoteroKeyFromZenodo === k.zoteroKey) {
                    if (args.link) {
                        return await linkZotZen(args, k, data)
                    } else {
                        return message(1, "You provided both a Zotero Key and a Zenodo ID. The Zenodo record links to the Zotero item, but Zotero does not link back. You can link the items by providing the option 'link'. This will use the DOI from the Zenodo record as DOI for the Zotero item.", k)
                    }
                } else {
                    // Linked to different items.
                    return message(1, "You provided both a Zotero Key and a Zenodo ID. The Zenodo links to a different Zotero item. Please fix this manually.", k)
                }
            } else {
                // Neither are defined
                if (args.link) {
                    return await linkZotZen(args, k, data)
                } else {
                    return message(1, "You provided both a Zotero Key and a Zenodo ID. The records are not linked. You can link the items by providing the option 'link'. Zenodo record links to the Zotero item, but Zotero does not link back. You can link the items by providing the option 'link'. This will use the DOI from the Zenodo record as DOI for the Zotero item.", k)
                }
            }
        } else {
            // We have Zotero, but no Zenodo
            if (k.zenodoIDFromZotero) {
                // However, we have a reference to a zenodo id.
                console.log("Zotero key provided, and it links to Zenodo ID, but no Zenodo ID provided. Going to check this pair.")
                args.id = k.zenodoIDFromZotero
                return await zotzenLink(args)
            } else {
                if (args.link) {
                    return await linkZotZen(args, k, data)
                } else {
                    return message(1, "You provided both a Zotero Key but no Zenodo ID. You can generate a Zenodo by providing the option 'link'. Zenodo record links to the Zotero item, but Zotero does not link back. You can link the items by providing the option 'link'. This will provided a DOI for the Zotero item.", k)
                }
            }
        }
    } else {
        // We dont have Zotero
        if (k.zenodoID) {
            if (k.zoteroKeyFromZenodo) {
                // However, we have a reference to a zotero id.
                console.log("Zenodo ID provided, and it links to Zotero key, but no Zotero key provided initially. Going to check this pair.")
                args.key = k.zoteroKeyFromZenodo
                args.group_id = k.zoteroGroupFromZenodo
                return await zotzenLink(args)
            } else {
                if (args.link) {
                    return await linkZotZen(args, k, data)
                } else {
                    return message(1, "You provided a Zenodo ID but no Zotero. At the moment it's not possible to generate a corresponding Zotero element, but this is planned. If the item has been published on Zenodo, please use e.g. the DOI to import to Zotero.", args)
                }
            }
        } else {
            return message(1, "You provided neither a Zotero Key nor Zenodo ID - nothing to do. You can create pairs of records with 'create'", args)
        }
    }
}

async function update_doi_and_link(k) {
    // TODO: Visit all refs to zenodo.org and check for (a) sandbox, and (b) decodation.
    const status = await zotero.update_doi({ key: k.zoteroKey, group: k.zoteroGroup, doi: k.doi })
    // Zotero item - attach links ... to Zenodo
    await zotero.attachLinkToItem(k.zoteroKey, "https://zenodo.org/deposit/" + k.zenodoID, { title: "🔄View entry on Zenodo (deposit)", tags: ["_r:zenodoDeposit", "_r:zotzen"] })
    await zotero.attachLinkToItem(k.zoteroKey, "https://zenodo.org/record/" + k.zenodoID, { title: "🔄View entry on Zenodo (record)", tags: ["_r:zenodoRecord", "_r:zotzen"] })
    // Zotero item - attach links ... to DOI
    if (k.doi) {
        await zotero.attachLinkToItem(k.zoteroKey, "https://doi.org/" + k.doi, { title: "🔄Look up this DOI (once activated)", tags: ["_r:doi", "_r:zotzen"] })
    } else {
        await zotero.attachLinkToItem(k.zoteroKey, "https://doi.org/10.5281/zenodo." + k.zenodoID, { title: "🔄Look up this DOI (once activated)", tags: ["_r:doi", "_r:zotzen"] })
    }
    return status
}

async function linkZotZen(args, k, data) {
    // TODO: The keySet should have zoteroGroup as well, adn this shoudl be checked...
    /*const keySet = {
        zoteroKey: zoteroKey,
        zenodoID: zenodoID,
        zoteroGroup: zoteroGroup,
        zenodoIDFromZotero: zenodoIDFromZotero,
        zoteroKeyFromZenodo: zoteroKeyFromZenodo,
        zoteroGroupFromZenodo: zoteroGroupFromZenodo,
        DOI: DOI
    }*/
    // We have verified existence of items and linking status above. This function just links.
    let data_out = {}
    if (k.zenodoID && k.zoteroKey) {
        if (k.zoteroKeyFromZenodo && k.zenodoIDFromZotero) {
            // Nothing to do - items are linked
            console.log("Items are linked.")
        } else {
            // There's two items, but at least one of them is not linked to the other.
            if (!k.zoteroKeyFromZenodo) {
                // TODO: Testing
                console.log("Linking from Zenodo to Zotero (alters Zenodo record)")
                args.zotero_link = getZoteroSelectLink(k.zoteroKey, k.zoteroGroup, true)
                args.id = k.zenodoID
                zenodoRecord = await zenodo.update(args)
            }
            if (!k.zenodoIDFromZotero) {
                // TODO: Testing
                console.log("Linking from Zotero to Zenodo (alters Zotero record)")
                const status = await update_doi_and_link(k)
            }
        }
    } else if (k.zoteroKey) {
        // We don't have both keys, so let's see whcih one there is. Is there a zoteroKey?
        // If yes, create a new zenodo record - that's the standard scenario.
        console.log("Using the zotero item to create a new zenodo record.")
        // TODO: testing
        args.zotero_link = getZoteroSelectLink(k.zoteroKey, k.zoteroGroup, true)
        args.title = data.zotero.title
        args.description = data.zotero.description
        args.date = data.date
        // authors are a problem
        const [zenodoRecord, doi] = await zenodoCreate(args)
        data_out["zenodo"] = zenodoRecord
        k.doi = doi
        k.zenodoID = zenodoRecord.id
        await update_doi_and_link(k)
        // TODO: To copy the data as comprehensively as possible, we should now run a sync.
        // synchronise(args)
    } else if (k.zenodoID) {
        // We don't have both keys and we don't have zotero key, so lets see whether we ahve a zenodo id
        // If yes, create a new zotero record
        // TODO: complete
        console.log("Using Zenodo record to creating a new zotero record. Only title/desc/date/doi is copied.")
        args.id = k.zenodoID // <-- this ensures linking.
        // TODO - needs fixing
        args.doi = `............../zenodo.${k.zenodoID}`
        // authors .... <-- TODO - need to copy authors
        // TODO - need to figure out why we have an array here: [0]
        args.title = data.zenodo[0].title
        args.date = data.zenodo[0].date
        args.description = data.zenodo[0].description
        const [zoteroRecord,
            zoteroRecordGType,
            zoteroRecordGroup,
            zoteroRecordVersion
        ] = await zoteroCreate(args)
        data_out["zotero"] = {
            data: zoteroRecord, metadata: [zoteroRecordGType,
                zoteroRecordGroup,
                zoteroRecordVersion]
        }
    } else {
        return message(1, "linkZotZen: You have to provide a zenodo id or zotero key.")
    }
    return {
        args: args,
        keySet: k,
        data_in: data,
        data_out: data_out
    }
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
}*/

async function zotzenSyncOne(args) {
    verbose(args, "zotzenSync", args)
    //debug(qargs, "zotzenPush: result", result)
    // return result
    // let zoteroArgs = args
    // // remove some args/add some args
    // zoteroArgs["func"] = "create"
    // const zoteroRecord = zoteroAPI(zoteroArgs);
    const zz = await zotzenLink(args)
    // Records are correctly linked - we can now proceed to sync/push
    // const DOI = zenodoRecord["metadata"]["prereserve_doi"]["doi"]
    // const doistr = 'DOI: ' + DOI
    /* --- */
    // if (!syncErrors(doi, zenodoRawItem, zoteroSelectLink)) {
    if (!zz.status == 0)
        return message(1, "sorry, but the records concerned are not properly linked. Aborting.", args)
    verbose(args, "zz=", zz)
    console.log("TEMPORARY syncone=" + JSON.stringify(zz.data, null, 2))
    /* TODO:
   Need to check whether the zenodo record is editable - otehrwise either abort or (with option 'newversion' given)
   produce a new version
    */
    const zenodoID = zz.data.zenodoID
    let updateDoc = {
        id: zenodoID
    }
    if (args.metadata) {
        console.log("metadata")
        if (zz.originaldata && zz.originaldata.zotero) {
            const zoteroItem = zz.originaldata.zotero
            // Sync metadata
            updateDoc = {
                ...updateDoc,
                title: zoteroItem.title,
                description: zoteroItem.abstractNote,
                // TODO title and description works, but creators doesn't... new authors in zotero dont make it to zenodo
                creators: zoteroItem.creators.map((c) => {
                    return {
                        name: `${c.name ? c.name : c.lastName + ', ' + c.firstName}`,
                    };
                }),
            };
            if (zoteroItem.date) {
                updateDoc.publication_date = zoteroItem.date;
            }
            // console.log("TEMPORARY="+JSON.stringify( updateDoc           ,null,2))             
            // TODO: capture this output
            console.log("metadata done")
            //console.log("TEMPORARY updated="+JSON.stringify(  updated          ,null,2))
        } else {
            return message(1, "sorry, did not find sync data", args)
        }
    } else {
        console.log("metadata sync was not requested")
    }
    console.log("Attachments")
    if (args.attachments) {
        // get information about attachments
        let myargs = { ...args, children: true, savefiles: true }
        //console.log("TEMPORARY="+JSON.stringify(myargs            ,null,2))          
        const children = await zotero.item(myargs)
        // Select file attachments
        let attachments = children.filter(
            (c) => c.data.itemType === 'attachment' &&
                c.data.linkMode === 'imported_file'
        )
        if ('type' in args && args.type) {
            const attachmentType = args.type.toLowerCase();
            if (attachmentType !== 'all') {
                attachments = attachments.filter(
                    (a) => a.data.filename.endsWith(attachmentType)
                );
            }
         }
        //    console.log("TEMPORARY="+JSON.stringify(   attachments         ,null,2))
        // TODO: We should remove existing draft attachments in the Zenodo record
        if (!attachments.length) {
            console.log('No attachments found.');
        } else {
            updateDoc.files = attachments.map((attachment) => {
               return attachment.data.filename
            });
        }
        // }
        // return dummycreate(args) */
    } else {
        console.log("attachment sync was not requested")
    }
    //console.log("TEMPORARY="+JSON.stringify(   updateDoc     ,null,2))
    const updated = await zenodo.update(updateDoc)
    // TODO: updated has the md5 sums for the files. They should be compared the md5 sums from Zotero.
    // TODO - this should report on what was done: List the metadata and the files.
    return updated //message(0, "Sync complete")
    // TODO? Final actions?
}

async function newVersion() {
    // TODO: What about concept DOIs? When we add a DOI to a Zeotero record, we should add ConceptDOI as well.
    console.log('Creating new version on Zenodo.')
    const newVersionResponse = runCommand(`newversion ${doi}`, false);
    doi = doi.replace(
        /zenodo.*/,
        `zenodo.${parseFromZenodoResponse(newVersionResponse, 'latest_draft')
            .split('/')
            .slice(-1)[0]}`
    );
    console.log('Linking new version to Zotero.')
    linkZotZen(
        itemKey,
        doi,
        groupId,
        getZoteroSelectLinkV1(userId || groupId, itemKey, !!groupId)
    );

}

/*
// TODO: test attachments function
// Copy attachment from Zotero to Zenodo
async function pushAttachment(itemKey, attachmentkey, fileName, doi, groupId, userId) {
    if (args.debug) {
        console.log('DEBUG: pushAttachment');
    }
    console.log(`Pushing from Zotero to Zenodo: ${fileName}`);
    await zotero.attachment({
        dummy: `${groupId ? '--group-id ' + groupId : ''} attachment --key ${attachmentkey} --save "../${fileName}"`
    });
    // TODO: What is the above command fails?
    // TODO: Also, I've inserted "..." in case the filename contains spaces. However, really the filename should be made shell-proof.
    // In perl, you would say:
    // All the command failures  need throw an exception which will be caught on the top-level / message printed.
    const pushResult = await zenodo.upload({
        dummy: `upload ${doi} "../${fileName}"`,
        with: false
    })
    // Rather than looking at this, we should first check the status of the Zenodo item.
    // TODO: use this above!
    if (pushResult.status === 403) {
        console.log(pushResult.message);
        // should not get here
        return message(1, "Error - record is locked. We should not get here.")
    }
    // What does this do?
    const newLocal = fs.unlinkSync(fileName);
    // TODO: How does the user know this was successful?
    console.log('Upload successfull.'); //This shoukd be good enough. User can always use --show or --open to see/open the record.
    return message(0, "Upload successful")
}
*/

function getZoteroSelectLinkV1(group_id, key, group = false) {
    return `zotero://select/${group ? 'groups' : 'users'}/${group_id}/items/${key}`;
}
function getZoteroSelectLink(item_key, group_id, isgroup = true, isitem = true) {
    return `zotero://select/${isgroup ? 'groups' : 'users'}/${group_id}/${isitem ? 'items' : 'collections'}/${item_key}`;
}
//zotero://select/groups/2259720/collections/HP6NALR4
//zotero://select/groups/2259720/items/Q6FADQE3
/*
// TODO
Replace runCommand with two functions:
- zenodoAPI
- zoteroAPI

*/
/*
function runCommandWithJsonFileInput(command, json, zotero = true) {
    if (args.debug) {
        console.log('DEBUG: runCommandWithJsonFileInput');
    }
    fs.writeFileSync(
        zotero ? zoteroTmpFile : zenodoTmpFile,
        JSON.stringify(json)
    );
    const response = runCommand(`${command} tmp`, zotero);
    fs.unlinkSync(zotero ? zoteroTmpFile : zenodoTmpFile);
    return response;
}*/
/*
function runCommand(command, zotero = true) {
    if (args.debug) {
        console.log('DEBUG: runCommand; ' + command);
    }
    try {
        return childProcess
            .execSync(`${zotero ? zoteroPrefix : zenodoPrefix} ${command}`, {
                cwd: `${zotero ? 'zotero' : 'zenodo'}-cli`,
                stdio: [],
            })
            .toString();
    } catch (ex) {
        try {
            return JSON.parse(ex.stderr.toString());
        } catch (_) { }
        throw new Error(`${zotero ? 'Zotero' : 'Zenodo'}: ${ex.output.toString()}`);
    }
}
*/
/*
// This function should be removed.
function parseFromZenodoResponse(content, key) {
    if (args.debug) {
        console.log('DEBUG: parseFromZenodoResponse');
    }
    return content
        .substr(content.indexOf(`${key}:`))
        .split('\n')[0]
        .split(':')
        .slice(1)
        .join(':')
        .trim();
}
*/
/*
function zoteroCreate(args) {
    // This could call the zoteroAPI with a subset of args
    // title, group, jsonFile = null) {
    console.log(JSON.stringify(args));
    process.exit(1);
    if (args.debug) {
        console.log('DEBUG: zoteroCreate');
    }
    if (jsonFile) {
        return JSON.parse(
            runCommand(
                `${group ? '--group-id ' + group : ''} create-item ${path.join(
                    __dirname,
                    jsonFile
                )}`,
                true
            )
        );
    }

    const zoteroCreateItemTemplate = runCommand(
        'create-item --template report',
        true
    );
    const templateJson = JSON.parse(zoteroCreateItemTemplate);
    templateJson.title = title;
    return JSON.parse(
        runCommandWithJsonFileInput(
            `${group ? '--group-id ' + group : ''} create-item`,
            templateJson,
            true
        )
    );
}
function zenodoCreate(title, creators, zoteroSelectLink, template) {
    // This could call the zenodoAPI with a subset of args
    if (args.debug) {
        console.log('DEBUG: zenodoCreate');
    }
    template = template || zenodoCreateRecordTemplatePath;
    const zenodoTemplate = JSON.parse(fs.readFileSync(template).toString());
    zenodoTemplate.related_identifiers[0].identifier = zoteroSelectLink;
    if (!zenodoTemplate.title)
        zenodoTemplate.title = title;
    if (!zenodoTemplate.description)
        zenodoTemplate.description = title;
    if (creators)
        zenodoTemplate.creators = creators;
    return runCommandWithJsonFileInput('create --show', zenodoTemplate, false);
}*/
/*
function zoteroGet(groupId, userId, itemKey) {
    if (args.debug) {
        console.log('DEBUG: zoteroGet');
    }
    return JSON.parse(
        runCommand(
            `${groupId ? '--group-id ' + groupId : ''} ${userId ? '--user-id ' + userId : ''} item --key ${itemKey}`,
            true
        )
    );
}*/
/*
function zenodoGet(doi) {
    if (args.debug) {
        console.log('DEBUG: zenodoGet');
    }
    const zenodoResponse = runCommand(`get ${doi} --show`, false);
    return {
        title: parseFromZenodoResponse(zenodoResponse, 'Title'),
        status: parseFromZenodoResponse(zenodoResponse, 'State'),
        writable: parseFromZenodoResponse(zenodoResponse, 'Published') == 'yes'
            ? 'not'
            : '',
        url: parseFromZenodoResponse(zenodoResponse, 'URL'),
        doi: parseFromZenodoResponse(zenodoResponse, 'DOI'),
    };
}
function zenodoGetRaw(doi) {
    if (args.debug) {
        console.log('DEBUG: zenodoGetRaw');
    }
    runCommand(`get ${doi}`, false);
    const fileName = doi.split('.').pop();
    return JSON.parse(fs.readFileSync(`zenodo-cli/${fileName}.json`).toString());
}*/
/*
function syncErrors(doi, zenodoRawItem, zoteroSelectLink) {
    if (args.debug) {
        console.log('DEBUG: syncErrors');
    }
    let error = false;
    if (!doi) {
        console.log(
            'This item has no Zenodo DOI. You need to generate or link one first with --newdoi.'
        );
        error = true;
    } else if (!zenodoRawItem) {
        console.log(`Zenodo item with id ${doi} does not exist.`);
        error = true;
    } else if (zenodoRawItem.related_identifiers &&
        zenodoRawItem.related_identifiers.length >= 1 &&
        zenodoRawItem.related_identifiers[0].identifier !== zoteroSelectLink) {
        console.log(zoteroSelectLink);
        console.log(
            `The Zenodo item exists, but is not linked. You need to link the items with --zen ${doi} first.`
        );
        error = true;
    }
    return error;
}*/
/*
function linked(zenodoItem, zoteroLink) {
    if (args.debug) {
        console.log('DEBUG: linked');
    }
    return (
        zenodoItem.related_identifiers &&
        zenodoItem.related_identifiers.length >= 1 &&
        zenodoItem.related_identifiers[0].identifier === zoteroLink
    );
}*/
/*
// This function is obsolete:
async function zotzenGet(args) {
    if (args.debug) {
        console.log('DEBUG: zotzenGet');
    }

    await Promise.all(
        args.zot.map(async (zot) => {
            let groupId = null;
            let itemKey = null;
            let userId = null;
            if (zot.includes('zotero')) {
                const selectLink = zot.split('/');
                if (selectLink.length < 7) {
                    throw new Error('Invalid zotero select link specified');
                }
                if (selectLink[3] == 'users') {
                    userId = selectLink[4];
                } else {
                    groupId = selectLink[4];
                }
                itemKey = selectLink[6];
            } else if (zot.includes(':')) {
                groupId = zot.split(':')[0];
                itemKey = zot.split(':')[1];
            } else {
                itemKey = zot;
            }

            const zoteroItem = zoteroGet(groupId, userId, itemKey);
            let doi = null;
            if (zoteroItem.data.DOI) {
                doi = zoteroItem.data.DOI;
            } else {
                const doiRegex = new RegExp(/10\.5281\/zenodo\.[0-9]+/);
                if (zoteroItem.data.extra) {
                    const match = zoteroItem.data.extra.match(doiRegex);
                    if (match) {
                        doi = match[0];
                    }
                }
            }

            const zoteroSelectLink = getZoteroSelectLinkV1(
                groupId || userId,
                itemKey,
                !!groupId
            );

            let zenodoRawItem = doi && zenodoGetRaw(doi);
            if (args.newdoi) {
                if (args.debug) {
                    console.log('DEBUG: zotzenGet, newdoi');
                }
                if (doi) {
                    console.log(`Item has DOI already: ${doi}`);
                    console.log(
                        `Linked zotero record: `,
                        zenodoRawItem.related_identifiers[0].identifier
                    );
                } else {
                    const zenodoRecord = zenodoCreate(
                        zoteroItem.data.title,
                        zoteroItem.data.creators &&
                        zoteroItem.data.creators.map((c) => {
                            return {
                                name: `${c.name ? c.name : c.lastName + ', ' + c.firstName}`,
                            };
                        }),
                        zoteroSelectLink,
                        args.template
                    );
                    doi = parseFromZenodoResponse(zenodoRecord, 'DOI');
                    linkZotZen(itemKey, doi, groupId);
                    console.log(`DOI allocated: ${doi}`);
                }
            } else if (args.zen) {
                if (args.debug) {
                    console.log('DEBUG: zotzenGet, zen');
                }
                try {
                    zenodoZenItem = zenodoGetRaw(args.zen);
                } catch (ex) {
                    if (args.debug) {
                        console.log('DEBUG: zotzenGet, exception zenodoGetRaw');
                    }
                }
                if (doi) {
                    console.log(`Item has DOI already: ${doi}`);
                    console.log(
                        `Linked zotero record: `,
                        zenodoRawItem.related_identifiers[0].identifier
                    );
                } else if (!zenodoZenItem) {
                    console.log(`Zenodo item with id ${args.zen} does not exist.`);
                } else if (!linked(zenodoZenItem, zoteroSelectLink)) {
                    console.log(
                        'Zenodo item is linked to a different Zotero item: ',
                        zenodoZenItem.related_identifiers[0].identifier
                    );
                } else {
                    const zenodoLinked = zenodoGet(args.zen);
                    doi = zenodoLinked.doi;
                    linkZotZen(itemKey, doi, groupId, zoteroSelectLink);
                    console.log(`DOI allocated: ${doi}`);
                }
            } else if (args.sync || args.push || args.publish || args.link) {
                if (!doi) {
                    console.log('No doi present in the zotero item.');
                } else if (linked(zenodoRawItem, zoteroSelectLink)) {
                    console.log('Item is already linked.');
                } else if (zenodoRawItem.related_identifiers &&
                    zenodoRawItem.related_identifiers.length >= 1 &&
                    args.link) {
                    linkZotZen(itemKey, doi, groupId, zoteroSelectLink);
                } else {
                    console.log(
                        `Found doi: ${doi} not linked to zotero. Zotero: ${zoteroItem.data.title} Zenodo: ${zenodoRawItem.title} `
                    );
                    const result = await getPrompt({
                        properties: {
                            Link: {
                                message: `Found doi: ${doi} not linked to zotero. Proceed? (y/N)`,
                                default: 'y',
                            },
                        },
                    });
                    if (result && (result.Link == 'y' || result.Link == 'Y')) {
                        console.log('Proceeding to link...');
                        linkZotZen(itemKey, doi, groupId, zoteroSelectLink);
                    }
                }
            }

            let zenodoItem = null;
            if (doi) {
                zenodoItem = zenodoGet(doi);
                zenodoRawItem = zenodoGetRaw(doi);
            }

            if (!zoteroItem.data.title) {
                console.log('Zotero item does not have title. Exiting...');
                return;
            }
            // This is useful is you just want the bare abstract.
            var abstract = '';
            if (!zoteroItem.data.abstractNote ||
                zoteroItem.data.abstractNote.length < 3) {
                //console.log('Zotero item abstract is less than 3 characters. Exiting...');
                //return;
                console.log(
                    'Zotero item abstract is less than 3 characters - using "No description available."'
                );
                abstract = 'No description available.';
            } else {
                abstract = zoteroItem.data.abstractNote;
            }
            if (!zoteroItem.data.creators || !zoteroItem.data.creators.length) {
                console.log('Zotero item does not have creators. Exiting...');
                return;
            }
            abstract += zoteroItem.data.url
                ? `\n\nAlso see: ${zoteroItem.data.url}`
                : '';
            if (args.sync) {
                if (!syncErrors(doi, zenodoRawItem, zoteroSelectLink)) {
                    let updateDoc = {
                        title: zoteroItem.data.title,
                        description: abstract,
                        creators: zoteroItem.data.creators.map((c) => {
                            return {
                                name: `${c.name ? c.name : c.lastName + ', ' + c.firstName}`,
                            };
                        }),
                    };
                    if (zoteroItem.data.date) {
                        updateDoc.publication_date = zoteroItem.data.date;
                    }
                    runCommandWithJsonFileInput(
                        `update ${doi} --json `,
                        updateDoc,
                        false
                    );
                }
            }
        }

        )
    );
}
*/
// This should not be needed as we're passing things through to the API.
async function finalActions(zoteroItem, zenodoResponse) {
    const zenodoRecord = zenodolib.pruneData(zenodoResponse)
    // Should final actions also include setting the _publish tag on the Zotero attachments?
    if (args.publish) {
        // TODO runCommand(`get ${doi} --publish`, false);
    }
    if (args.show) {
        console.log('Zotero:');
        console.log(`- Item key: ${zoteroItem.key}`);
        zoteroItem.data.creators.forEach((c) => {
            console.log(
                '-',
                `${c.creatorType}:`,
                c.name || c.firstName + ' ' + c.lastName
            );
        });
        console.log(`- Date: ${zoteroItem.data.date}`);
        console.log(`- Title: ${zoteroItem.data.title}`);
        console.log(`- DOI: ${doi}`);
        console.log('');

        console.log('Zenodo:');
        console.log('* Item available.');
        console.log(`* Item status: ${zenodoResponse.status}`);
        console.log(`* Item is ${zenodoResponse.writable} writable`);
        console.log(`- Title: ${zenodoRecord.title}`);
        zenodoRawItem.creators &&
            zenodoRecord.creators.forEach((c) => {
                console.log(`- Author: ${c.name}`);
            });
        console.log(`- Publication date: ${zenodoRecord.publication_date}`);
        console.log('');

    }

    // TODO needs fixing.
    if (args.open) {
        opn(zoteroSelectLink);
        if (zenodoRecord) {
            opn(zenodoRecord.url);
        }
    }
}

