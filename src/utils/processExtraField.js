function processExtraField(input = '') {
  let result = '';

  let lines = input.split('\n');

  // ZenodoArchiveID
  // ZenodoArchiveConcept
  let ZenodoArchiveID = 0;
  lines.forEach(value => {
    const result = value.match(/(10\.5281\/zenodo\.|ZenodoArchiveID: )(\d+)/);
    if (result) {
      if (parseInt(result[2]) > ZenodoArchiveID) {
        ZenodoArchiveID = parseInt(result[2]);
        // console.log(`ZenodoArchiveID: ${ZenodoArchiveID}`);
      }
    }
  });
  const ZAI = `ZenodoArchiveID: ${ZenodoArchiveID}`;
  if (ZenodoArchiveID > 0) {
    lines = lines.map((line) => {
      if (line.startsWith('ZenodoArchiveID: ') && !line.startsWith(ZAI)) {
        return "previous" + line;
      } else {
        return line;
      };
    });
    lines = lines.filter((line) => !line.startsWith('ZenodoArchiveID: '));
    // lines = [ZAI, ...lines];
  }
  let doiLines = lines.filter((line) => line.startsWith('DOI: '));
  let nonDOILines = lines.filter((line) => !line.startsWith('DOI: '));

  if (doiLines.length > 1) {
    // console.log("TEMPORARY=" + JSON.stringify(doiLines, null, 2))
    // sort dois
    doiLines.sort((a, b) => {
      const [, , aLast] = a.split('.');
      const [, , bLast] = b.split('.');
      let diff = bLast - aLast;
      if (a.match(/10\.5281\//) && b.match(/10\.5281\//)) {
        return diff;
      } else if (a.match(/10\.53832\//) && b.match(/10\.53832\//)) {
        return diff;
      } else if (a.match(/10\.5281\//) && b.match(/10\.53832\//)) {
        return 1;
      } else {
        return -1;
      }
    });

    // prefix older DOIs with previous
    doiLines = doiLines.map((doi, index) => {
      if (index === 0) {
        const [, lastPart] = doi.split(' ');
        return 'DOI: ' + lastPart;
      }
      if (index > 0 && !doi.startsWith('previous')) {
        return 'previous' + doi;
      }
      return doi;
    });
  }

  lines = [...doiLines, ...nonDOILines];
  doiLines = lines.filter((line) => line.startsWith('DOI: '));
  nonDOILines = lines.filter((line) => !line.startsWith('DOI: '));

  const kerkoLinePrefix = 'KerkoCite.ItemAlsoKnownAs:';
  let kerkoLine = nonDOILines.find((line) => line.startsWith(kerkoLinePrefix));
  nonDOILines = nonDOILines.filter((line) => !line.startsWith(kerkoLinePrefix));

  // if line does not exist add it
  if (!kerkoLine) {
    kerkoLine = kerkoLinePrefix;
  }
  // split with " " and ingore first element which will be prefix
  let [, ...kerkoItems] = kerkoLine.split(' ');

  // add sorted doi
  kerkoItems = [
    ...new Set(
      doiLines
        .map((line) => {
          const [, doi] = line.split(' ');
          return doi;
        })
        .concat(kerkoItems)
    ),
  ];

  kerkoLine = '';
  if (kerkoItems.length > 0) {
    kerkoItems = [kerkoLinePrefix, ...kerkoItems];
    kerkoLine = kerkoItems.join(' ');
  }

  // combine doi + kerkoLine + anything else as result separate by newline
  result = [...doiLines, ZAI, kerkoLine, ...nonDOILines].join('\n');
  // console.log("-------\n"+result);
  // process.exit(1)
  return result;
}

module.exports = processExtraField;
