
'use strict'

module.exports.push = zotzenPush;
module.exports.create = zotzenCreate;
module.exports.link = zotzenLink;

// PRODUCTION: Load library
//const zotero = require("zotero-api-lib");
const zenodo = require("zenodo-lib");
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

async function zotzenCreate(args) {
    verbose(args, "zotzenlib.zotzenCreate", args)
    let result = dummycreate(args)
    let record = {}
    try {
      console.log("zotzen-lib: calls zenodo.create")
      record = await zenodo.create(args)
      console.log("zotzen-lib: zenodo.create returns")
    } catch (e) {
      debug(args, "zotzenCreate: error=", e)
      console.log(e)
    }
    debug(args, "zotzenCreate: result:", record)
    return result
    // let zoteroArgs = args
    // // remove some args/add some args
    // zoteroArgs["func"] = "create"
    // const zoteroRecord = zoteroAPI(zoteroArgs);
    const zoteroRecord = await zoteroCreate(args.title, args.group, args.json);
    const zoteroSelectLink = zoteroRecord.successful[0].links.self.href.replace(
        zoteroApiPrefix,
        zoteroSelectPrefix
    );
    // let zenodoArgs = args
    // zenodoArgs["func"] = "create"
    // // Utilise the zotero id as alternative id for the Zenodo record
    // zenodoArgs["zoteroSelectLink"] = zoteroSelectLink
    // const zenodoRecord = zenodoAPI(zenodoArgs)
    const zenodoRecord = zenodoCreate(
        zoteroRecord.successful[0].data.title,
        zoteroRecord.successful[0].data.creators,
        zoteroSelectLink
    );
    /*
    const doi = zenodoRecord["doi"]
    */
    const doi = parseFromZenodoResponse(zenodoRecord, 'DOI');
    const zenodoDepositUrl = parseFromZenodoResponse(zenodoRecord, 'URL');

    // // We now need to add teh doi to the zotero record
    // let linkArgs = args
    // linkArgs["id"] = ["zotero://.....",doi]
    // zotzenLink(linkArgs)
    linkZotZen(zoteroRecord.successful[0].key, doi, args.group);

    console.log('Item successfully created: ');
    console.log(
        `Zotero ID: ${zoteroRecord.successful[0].library.id}:${zoteroRecord.successful[0].key}`
    );
    console.log(`Zotero link: ${zoteroRecord.successful[0].links.self.href}`);
    console.log(`Zotero select link: ${zoteroSelectLink}`);
    console.log(
        `Zenodo RecordId: ${parseFromZenodoResponse(zenodoRecord, 'RecordId')}`
    );
    console.log(`Zenodo DOI: ${doi}`);
    console.log(`Zenodo deposit link: ${zenodoDepositUrl}`);

    // This should not be needed, as --show/--open etc has been passed through via the APIs.
    if (args.open) {
        opn(zoteroSelectLink);
        opn(zenodoDepositUrl);
    }
}

async function zotzenLink(args) {
    verbose(args, "zotzenLink", args)
    const result = dummycreate(args)
    debug(args, "zotzenLink: result", result)
    return result

}

async function zotzenPush(args) {
    verbose(args, "zotzenPush", args)
    const result = dummycreate(args)
    debug(args, "zotzenPush: result", result)
    return result
    if (!syncErrors(doi, zenodoRawItem, zoteroSelectLink)) {
        const children = JSON.parse(
            runCommand(
                `${groupId ? '--group-id ' + groupId : ''} get /items/${itemKey}/children`,
                true
            )
        );
        let attachments = children.filter(
            (c) => c.data.itemType === 'attachment' &&
                c.data.linkMode === 'imported_file'
        );
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
    }
    return dummycreate(args)
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
