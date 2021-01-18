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

//--
async function zenodoCreate(args) {
    // TODO: What if this is a user lib?
    if (!args.zotero_link && args.key && args.group_id) {
        console.log("Adding args.zotero_link from key/group_id provided")
        args.zotero_link = getZoteroSelectLink(args.key, args.group_id, "group")
    }
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
    return [zenodoRecord, DOI]
    // [zenodoRecord, DOI] = zenodoCreate(args)
}

async function zoteroCreate(args, zenodoLibCreate_Args) {
    const doistr = args.doi ? 'DOI: ' + args.doi : ""
    Object.keys(zenodoLibCreate_Args).forEach(mykey => {
        if (!args[mykey]) {
            if (mykey == "collections") { // mykey == "tags" || authors
                args[mykey] = []
            } else {
                args[mykey] = ""
            }
        }
    })
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
    // We need to get the full response
    let zarg = {
        item: report,
        fullresponse: true
    }
    if (args.group_id) {
        zarg.group_id = args.group_id
    }
    debug(args, "zoteroCreate: call", null)
    const zoteroResult = await zotero.create_item(zarg)
    const zoteroRecord = zotero.pruneData(zoteroResult)
    debug(args, "zotzenCreate: result:", zoteroResult)
    const zoteroRecordVersion = zoteroResult.successful["0"].version
    const zoteroRecordGType = zoteroResult.successful["0"].library.type
    const zoteroRecordGroup = zoteroResult.successful["0"].library.id

    if (args.id) {
        // Zotero item - attach links ... to Zenodo
        await zotero.attachLinkToItem(zoteroRecord.key, "https://zenodo.org/deposit/" + args.id, { title: "🔄View entry on Zenodo (draft)", tags: ["_r:zenodoDeposit", "_r:zotzen"] })
    }
    if (args.doi) {
        // Zotero item - attach links ... to DOI
        await zotero.attachLinkToItem(zoteroRecord.key, "https://doi.org/" + args.doi, { title: "🔄Look up this DOI (once activated)", tags: ["_r:doi", "_r:zotzen"] })
    }

    return [zoteroRecord,
        zoteroRecordGType,
        zoteroRecordGroup,
        zoteroRecordVersion
    ]
}

/*
TOP-LEVEL FUNCTION 
*/
async function zotzenCreate(args) {
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
    // TODO - we have to fix the communities for Zenodo.
    verbose(args, "zotzenlib.zotzenCreate", args)
    // let result = dummycreate(args)
    // Create zenodo record
    const [zenodoRecord, DOI] = await zenodoCreate(args)
    args.id = zenodoRecord.id
    args.doi = DOI
    const [zoteroRecord,
        zoteroRecordGType,
        zoteroRecordGroup,
        zoteroRecordVersion
    ] = await zoteroCreate(args, zenodoLibCreate_Args)
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
    let newZoteroRecord
    const zoteroSelectLink = getZoteroSelectLink(zoteroRecord.key, zoteroRecordGroup, "group")
    const kerko_url = args.kerko_url ? args.kerko_url + zoteroRecord.key : ""
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

        // Zotero item - attach links ... to Google Doc
        if (args.googledoc) {
            // Attach link to google doc, if there is one:
            await zotero.attachLinkToItem(zoteroRecord.key, args.googledoc, { title: "🔄View Google Doc and download alternative formats", tags: ["_r:googleDoc", "_r:zotzen"] })
        }

        // Zotero item - attach note
        const team = args.team ? `<p><b>Team (via form):</b> ${args.team}</p>` : ""
        const note = args.team ? `<p><b>Note (via form):</b> ${args.note}</p>` : ""
        const content = `${team} ${note}`
        await zotero.attachNoteToItem(zoteroRecord.key, { content: content, tags: ["_r:noteViaForm", "_r:zotzen"] })

        // Attach kerko url to Zotero record (as url)
        newZoteroRecord = zoteroRecord
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
            await zotero.attachLinkToItem(zoteroRecord.key, kerko_url, { title: "🔄View item Evidence Library - click to open", tags: ["_r:kerko", "_r:zotzen"] })
        }

    }
    const record = {
        status: 0,
        message: "success",
        data: {
            zenodoRecordID: zenodoRecord.id,
            zoteroItemKey: zoteroRecord.key,
            zoteroGroup: zoteroRecordGroup,
            zoteroSelectLink: zoteroSelectLink,
            DOI: DOI,
            kerko_url: kerko_url
        },
        zotero: {
            data: newZoteroRecord
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

function zenodoParseID(str) {
    const zenodoIDstr = str.match(/(\d+)$/s)
    let zenodoIDref = null;
    if (zenodoIDstr) {
        zenodoIDref = zenodoIDstr[1]
        console.log(`Got Zenodo ID = ${zenodoIDref}`)
    }
    return zenodoIDref
}

function zoteroParseKey(str) {
    //const arr = zotlink.split("/")
    //arr[arr.length - 1]        
    const a = str.match(/([\d\w]+)\/?$/s)
    let zoteroKey = null;
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
async function zotzenLinkCheck(args) {
    // This functions gets whatever items possible, which can then be checked.
    console.log("Getting Zotero item if possible.")
    //-- Get the Zotero item
    let zenodoIDFromZotero = null
    const zoteroKey = args.key ? zoteroParseKey(args.key) : null
    const zoteroGroup = args.group_id ? args.group_id : null
    if (zoteroKey) {
        // There's a key, so we can get the item.    
        debug(args, "zoteroItem: call", args)
        const zoteroItem = await zotero.item(args);
        debug(args, "zotzenCreate: result:", zoteroItem)
        // zoteroRecord.extras -> DOI -> zenodo
        // return zoteroRecord
        // "extra": "DOI: 10.5072/zenodo.716876",
        // TODO - this will not work for Zotero recordTypes other the 'record'
        zenodoIDFromZotero = zenodoParseID(zoteroItem.extra)
    } else {
        console.log("You did not provided a 'key' (for a zotero item)", args)
    }
    //-- Zenodo
    console.log("Getting Zenodo record if possible.")
    let zoteroKeyFromZenodo = null
    let zoteroGroupFromZenodo = null
    const zenodoID = args.id ? zenodoParseID(args.id) : null
    if (zenodoID) {
        //-- Get the zenodo record
        let zenodoRecord = {}
        const zenodoID = args.id ? zenodoParseID(args.id) : null
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
            zoteroKeyFromZenodo = zoteroParseKey(zotlink)
            zoteroGroupFromZenodo = zoteroParseGroup(zotlink)
        } else {
            console.log("The Zenodo item is not linked to a Zoteroitem")
            // ask prompt or check tags and proceed to link TODO
        }
        //if (!zotlink) {
        //    console.log("The zenodo record does not link back to the zotero item - use 'link'")
        //}
    } else {
        console.log("You did not provided an 'id' (for a zotero item)", args)
    }
    // We now have all potential keys and links:
    const keySet = {
        zoteroKey: zoteroKey,
        zenodoID: zenodoID,
        zoteroGroup: zoteroGroup,
        zenodoIDFromZotero: zenodoIDFromZotero,
        zoteroKeyFromZenodo: zoteroKeyFromZenodo,
        zoteroGroupFromZenodo: zoteroGroupFromZenodo,
        DOI: "......../zenodo." + zenodoID
    }
    // TODO: Fix the DOI above - either take it from the actual DOI or the pre-reserved DOI.
    const result = await checkZotZenLink(args, keySet)
    console.log("TEMPORARY=" + JSON.stringify(result, null, 2))
    return result
}
async function checkZotZenLink(args, k) {
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
                        return await linkZotZen(args, keySet)
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
                        return await linkZotZen(args, keySet)
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
                    return await linkZotZen(args, keySet)
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
                return await zotzenLinkCheck(args)
            } else {
                if (args.link) {
                    return await linkZotZen(args, keySet)
                } else {
                    return message(1, "You provided both a Zotero Key but no Zenodo ID. You can generate a Zenodo by providing the option 'link'. Zenodo record links to the Zotero item, but Zotero does not link back. You can link the items by providing the option 'link'. This will provided a DOI for the Zotero item.", k)
                }
            }
        }
    } else {
        // We dont have Zotero
        if (k.zenodoID) {
            if (k.zoteroKeyFromZenodo) {
                // However, we have a reference to a zenodo id.
                console.log("Zenodo ID provided, and it links to Zotero key, but no Zotero key provided. Going to check this pair.")
                args.key = k.zoteroKeyFromZenodo
                args.group_id = k.zoteroGroupFromZenodo
                return await zotzenLinkCheck(args)
            } else {
                // return await linkZotZen(args, keySet)
                return message(1, "You provided a Zenodo ID but no Zotero. At the moment it's not possible to generate a corresponding Zotero element, but this is planned. If the item has been published on Zenodo, please use e.g. the DOI to import to Zotero.", args)
            }
        } else {
            return message(1, "You provided neither a Zotero Key nor Zenodo ID - nothing to do. You can create pairs of records with 'create'", args)
        }
    }
}

async function linkZotZen(args, k) {
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
    let zenodoRecord
    if (k.zenodoID && k.zoteroKey) {
        if (k.zoteroKeyFromZenodo && k.zenodoIDFromZotero) {
            // Nothing to do - items are linked
            console.log("Items are linked.")
        } else {
            if (!k.zoteroKeyFromZenodo) {
                // TODO: Testing
                console.log("Linking from Zenodo to Zotero (alters Zotero record)")
                // TODO: Need to write zotero.update_doi
                const status = await zotero.update_doi(k.zoteroKey, k.zoteroGroup, DOI)
                // Zotero item - attach links ... to Zenodo
                await zotero.attachLinkToItem(k.zoteroID, "https://zenodo.org/deposit/" + k.zenodoID, { title: "🔄View entry on Zenodo (draft)", tags: ["_r:zenodoDeposit", "_r:zotzen"] })
                // Zotero item - attach links ... to DOI
                await zotero.attachLinkToItem(k.zoteroKey, "https://doi.org/" + k.DOI, { title: "🔄Look up this DOI (once activated)", tags: ["_r:doi", "_r:zotzen"] })
            }
            if (!k.zenodoIDFromZotero) {
                // TODO: Testing
                console.log("Linking from Zotero to Zenodo (alters Zenodo record)")
                args.zotero_link = getZoteroSelectLink(k.zoteroKey, k.zoteroGroup, "group")
                args.id = k.zenodoID
                zenodoRecord = await zenodo.update(args)
            }
        }
    } else if (k.zoteroKey) {
        // Create a new zenodo record - that's the standard scenario.
        console.log("Create a new zenodo record.")
        // TODO: testing
        args.zotero_link = getZoteroSelectLink(k.zoteroKey, k.zoteroGroup, "group")
        [zenodoRecord, DOI] = zenodoCreate(args)
    } else if (k.zenodoID) {
        // Create a new zotero record
        // TODO: complete
        console.log("Create a new zotero record.")
        process.exit(1)
    } else {
        return message(1, "linkZotZen: You have to provide a zenodo id or zotero key.")
    }
    return 0
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
function getZoteroSelectLinkV1(group_id, key, group = false) {
    return `zotero://select/${group ? 'groups' : 'users'}/${group_id}/items/${key}`;
}
function getZoteroSelectLink(item_key, group_id, zoteroRecordGType = "group") { // add a switch for collections?
    return `zotero://select/${zoteroRecordGType}/${group_id}/items/${item_key}`;
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
            getZoteroSelectLinkV1(userId || groupId, itemKey, !!groupId)
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
