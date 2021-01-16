module.exports.sync = zotzenSync;
module.exports.create = zotzenCreate;
module.exports.link = zotzenLinkCheck;

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

/*
TOP-LEVEL FUNCTION 
*/
async function zotzenCreate(args) {
    const zenodoLibCreate_Args = {
        title: "string",
        date: "date string",
        description: "string",
        authordata: "file with authordata",
        authors: "first last; first last; first last",
        communities: "file to communities",
        zotero_link: "string (zotero://...)",
        reportNumber: "Zotero only",
        reportType: "Zotero only",
        url: "Zotero only",
        tags: ["Zotero only"],
        collections: ["Zotero only"],
        team: "neither",
        group_id: 2259720,
        json: "Zenodo template file"
    }
    verbose(args, "zotzenlib.zotzenCreate", args)
    // let result = dummycreate(args)
    let zenodoRecord = {}
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
    }
    const DOI = zenodoRecord["metadata"]["prereserve_doi"]["doi"]
    const doistr = 'DOI: ' + DOI
    Object.keys(zenodoLibCreate_Args).forEach(mykey => {
        if (!args[mykey]) {
            if (mykey == "collections") { // mykey == "tags" || 
                args[mykey] = []
            } else {
                args[mykey] = ""
            }
        }
    })
    let tagsarr = []
    if (args.tags) {
        args.tags.forEach(mytag => {
            tagsarr.push({ tag: mytag })
        })
    }
    const report = {
        "itemType": "report",
        "title": args.title,
        "creators": [],
        "abstractNote": args.description,
        "reportNumber": args.reportNumber,
        "reportType": args.reportType,
        "seriesTitle": "",
        "place": "",
        "institution": "",
        "date": args.date,
        "pages": "",
        "language": "",
        "shortTitle": "",
        "url": "",
        "accessDate": "",
        "archive": "",
        "archiveLocation": "",
        "libraryCatalog": "",
        "callNumber": "",
        "rights": "",
        "extra": doistr,
        "tags": tagsarr,
        "collections": args.collections
    }
    let zarg = {
        item: report
    }
    if (args.group_id) {
        zarg.group_id = args.group_id
    }
    debug(args, "zoteroCreate: call", null)
    const zoteroRecord = await zotero.create_item(zarg);
    debug(args, "zotzenCreate: result:", zoteroRecord)
    // Now update the zenodo record with the ZoteroId.
    // TODO, this  will fail if args.group_id not given explicitly
    const zoteroGroup = args.group_id
    // TODO: Replace this with 'getZoteroLink' functionb elow - otherwise this will not work for user libs
    const zoteroSelectLink = `zotero://select/groups/${zoteroGroup}/items/${zoteroRecord.key}`
    args.zotero_link = zoteroSelectLink
    args.id = zenodoRecord.id
    //console.log(JSON.stringify(args, null, 2))
    const zenodoRecord2 = await zenodo.update(args)
    //console.log(JSON.stringify(zenodoRecord2, null, 2))
    const kerko_url = args.kerko_url ? args.kerko_url + zoteroRecord.key : ""
    const record = {
        status: 0,
        message: "success",
        data: {
            zenodoRecordID: zenodoRecord.id,
            zoteroItemKey: zoteroRecord.key,
            zoteroGroup: zoteroGroup,
            zoteroSelectLink: zoteroSelectLink,
            DOI: DOI,
            kerko_url: kerko_url
        },
        zotero: {
            data: zoteroRecord
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
async function zotzenSync(args) {
    if (!args.id) return null
    const ids = args.id
    delete args["id"]
    let output = []
    for (id of ids) {
        let myargs = args
        myargs.key = id
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

async function zotzenLinkCheck(args) {
    /*
    input
    args = { key: "", id: ""}

    Possible outcomes:
    zotero.key exists (error if not)
    if (zotero.extra.zenodo exists) {
        if (zenodo.id is provided)
            if (zenodo.id exists) {
                -> items are linked and are teh same or not.
                -> if they are not, then we can relink.
            } else {
                error
            }
        } else {
            -> we can generate
        }
    } else {
        if (zenodo.id provided) {       
            if (zenodo.id exists) {
                -> we can link.
            }
        } else {
            -> we can generate
        }
    }
    */
    if (!args.key) {
        console.log("ERROR zotzenLink")
        return message(1, "You must provide 'key' (for a zotero item)", args)
    }
    // There's a key, so we can get the item.    
    debug(args, "zoteroItem: call", args)
    const zoteroItem = await zotero.item(args);
    debug(args, "zotzenCreate: result:", zoteroItem)
    // zoteroRecord.extras -> DOI -> zenodo
    // return zoteroRecord
    // "extra": "DOI: 10.5072/zenodo.716876",
    const zenodoIDstr = zoteroItem.extra.match(/zenodo\.(\d+)/)
    let zenodoID = 0;
    if (zenodoIDstr) {
        zenodoID = zenodoIDstr[1]
    } else {
        // So the item doesn't have a DOI - let's see whether we should get one.
        if (args.getdoi) {
            // TODO - get a DOI
            // async getDOI(zoteroItem)
            // or async getDOI(args)
            return message(1, "Not implemented. Data attached. ",
            {
                "zoteroItem": "updated zoteroItem",
                "zenodoItem": "new zenodo item"
            })
        } else {
            console.log("zotzen-lib: Zotero Item is lnot linked to Zenodo record. Use 'link' with getdoi ")
            return message(1, "zotzen-lib: Zotero Item is lnot linked to Zenodo record. Use 'link' with getdoi. Data attached. ",
                {
                    "zoteroItem": zoteroItem
                })
        }
        // unlinked... link first
    }
    // args.id = zenodo.
    let zenodoRecord = {}
    if (args.id) {
        if (args.id !== zenodoID) {
            console.log("args.id !== zenodoID, ${args.id} !== ${zenodoID}")
            return null
        } else {
            console.log("Zotero/Zenodo IDs are matching - now checking reverse link.")
        }
    } else {
        console.log("Indentified zenodoID=" + zenodoID)
        args.id = zenodoID
    }
    try {
        console.log("zotzen-lib: calls zenodo.getRecord")
        zenodoRecord = await zenodo.getrecord(args)
        console.log("zotzen-lib: zenodo.getRecord returns")
    } catch (e) {
        debug(args, "zotzenCreate: error=", e)
        console.log(e)
        return null
    }
    debug(args, "zotzenCreate: result:", zenodoRecord)
    //console.log(JSON.stringify(zenodoRecord[0].metadata["related_identifiers"],null,2))
    let zotlink = null
    if (zenodoRecord[0].metadata["related_identifiers"]) {
        const ri = zenodoRecord[0]["metadata"]["related_identifiers"]
        // We should iterate through these TODO
        zotlink = ri[0].identifier
    } else {
        console.log("The Zenodo item is not linked to a Zoteroitem")
        // ask prompt or check rags and proceed to link TODO
        return null
    }
    if (!zotlink) {
        console.log("The zenodo record does not link back to the zotero item - use 'link'")
        return null
    }
    const arr = zotlink.split("/")
    if (zoteroItem.key == arr[arr.length - 1]) {
        console.log("Records are linked.")
    } else {
        console.log(`Problem: ${zoteroItem.key} vs. ${zotlink}`)
        console.log("The zenodo record does not link back to the right zotero item - use 'link' to fix")
        process.exit(1)
    }
    return 0
}

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
}

async function zotzenSyncOne(args) {
    verbose(args, "zotzenSync", args)
    //debug(qargs, "zotzenPush: result", result)
    // return result
    // let zoteroArgs = args
    // // remove some args/add some args
    // zoteroArgs["func"] = "create"
    // const zoteroRecord = zoteroAPI(zoteroArgs);
    const zz = zotzenLinkCheck(args)
    // Records are correctly linked - we can now proceed to sync/push
    // const DOI = zenodoRecord["metadata"]["prereserve_doi"]["doi"]
    // const doistr = 'DOI: ' + DOI
    /* --- */
    // if (!syncErrors(doi, zenodoRawItem, zoteroSelectLink)) {
    if (args.metadata) {
        // Sync metadata
        let updateDoc = {
            title: zoteroItem.title,
            description: zoteroItem.abstractNote,
            creators: zoteroItem.creators.map((c) => {
                return {
                    name: `${c.name ? c.name : c.lastName + ', ' + c.firstName}`,
                };
            }),
        };
        if (zoteroItem.date) {
            updateDoc.publication_date = zoteroItem.date;
        }
        zenodo.update(updateDoc)
    }
    if (args.attachments) {
        // push attachments. TODO: We should remove existing draft attachments in the Zenodo record
        const children = zotero.children(groupId, "get /items/${itemKey}/children")
        let attachments = children.filter(
            (c) => c.data.itemType === 'attachment' &&
                c.data.linkMode === 'imported_file'
        )
        const attachmentType = args.type.toLowerCase();
        if (attachmentType !== 'all') {
            attachments = attachments.filter((a) => a.data.filename.endsWith(attachmentType)
            );
        }
        if (!attachments.length) {
            console.log('No attachments found.');
        } else {
            attachments.forEach((attachment) => {
                doi = pushAttachment(
                    itemKey,
                    attachment.data.key,
                    attachment.data.filename,
                    doi,
                    groupId,
                    userId
                );
            });
        }
        // }
        // return dummycreate(args) */
    }
}
/*
// TODO
Replace runCommand with two functions:
- zenodoAPI
- zoteroAPI
 
*/
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
}
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
}

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
}
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
}
function getZoteroSelectlink(id, key, group = false) {
    if (args.debug) {
        console.log('DEBUG: getZoteroSelectlink');
    }
    return `zotero://select/${group ? 'groups' : 'users'}/${id}/items/${key}`;
}
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
}
function pushAttachment(itemKey, key, fileName, doi, groupId, userId) {
    if (args.debug) {
        console.log('DEBUG: pushAttachment');
    }
    console.log(`Pushing from Zotero to Zenodo: ${fileName}`);
    runCommand(
        `${groupId ? '--group-id ' + groupId : ''} attachment --key ${key} --save "../${fileName}"`
    );
    // TODO: What is the above command fails?
    // TODO: Also, I've inserted "..." in case the filename contains spaces. However, really the filename should be made shell-proof.
    // In perl, you would say:
    //                           use String::ShellQuote; $safefilename = shell_quote($filename);
    // There's no built-in for escaping. We can only escape special characters. We can do that if needed.
    // All the command failures will throw an exception which will be caught on the top-level and a message will be printed.
    const pushResult = runCommand(`upload ${doi} "../${fileName}"`, false);
    if (pushResult.status === 403) {
        console.log(pushResult.message);
        console.log('Creating new version.');
        const newVersionResponse = runCommand(`newversion ${doi}`, false);
        doi = doi.replace(
            /zenodo.*/,
            `zenodo.${parseFromZenodoResponse(newVersionResponse, 'latest_draft')
                .split('/')
                .slice(-1)[0]}`
        );
        linkZotZen(
            itemKey,
            doi,
            groupId,
            getZoteroSelectlink(userId || groupId, itemKey, !!groupId)
        );
        runCommand(`upload ${doi} "../${fileName}"`, false);
    }
    fs.unlinkSync(fileName);
    // TODO: How does the user know this was successful?
    console.log('Upload successfull.'); //This shoukd be good enough. User can always use --show or --open to see/open the record.
    return doi;
}
function linked(zenodoItem, zoteroLink) {
    if (args.debug) {
        console.log('DEBUG: linked');
    }
    return (
        zenodoItem.related_identifiers &&
        zenodoItem.related_identifiers.length >= 1 &&
        zenodoItem.related_identifiers[0].identifier === zoteroLink
    );
}

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

            const zoteroSelectLink = getZoteroSelectlink(
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
// This should not be needed as we're passing things through to the API.


async function finalActions() {
    //-- final actions
    if (args.publish && doi) {
        runCommand(`get ${doi} --publish`, false);
    }

    if (args.show) {
        console.log('Zotero:');
        console.log(`- Item key: ${itemKey}`);
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

        if (doi) {
            zenodoRawItem = zenodoGetRaw(doi);
            zenodoItem = zenodoGet(doi);
            console.log('Zenodo:');
            console.log('* Item available.');
            console.log(`* Item status: ${zenodoItem.status}`);
            console.log(`* Item is ${zenodoItem.writable} writable`);
            console.log(`- Title: ${zenodoRawItem.title}`);
            zenodoRawItem.creators &&
                zenodoRawItem.creators.forEach((c) => {
                    console.log(`- Author: ${c.name}`);
                });
            console.log(`- Publication date: ${zenodoRawItem.publication_date}`);
            console.log('');
        }
    }

    if (args.open) {
        opn(zoteroSelectLink);
        if (zenodoItem) {
            opn(zenodoItem.url);
        }
    }
}
