const util = require('util');
const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');
const readFile = util.promisify(fs.readFile);
const tsc = path.resolve(__dirname, '..', 'node_modules', '.bin', 'tsc');
const { version } = require("../package.json");

/**
 * Generates a typescript declaration file and appends definition header for definitelyTyped
 */
function generateTypes () {
  const tsFilePath = path.resolve(__dirname, '..', 'build', 'recurly.d.ts');
  console.log(`Generating typescript declaration in ${tsFilePath}.`);

  exec(`${tsc} -p types -outFile ${tsFilePath}`, async (error, stdout, stderr) => {
    if (error || stderr) {
      throw { error, stderr, stdout };
    }

    const dtCommentsFilePath = path.resolve(__dirname, 'dt-header');
    const [types, dtComments] = await Promise.all([
      readFile(tsFilePath, 'utf-8'),
      readFile(dtCommentsFilePath, 'utf-8')
    ]);

    const dtCommentsWithVersion = dtComments.replace(/RJS_VERSION/, version);
    const out = dtCommentsWithVersion + '\n' + types;

    fs.writeFile(tsFilePath, out, err => {
      if (err) throw err;
      console.log(`Succesfully generated typescript declaration in ${tsFilePath}.`);
    });
  });
}

generateTypes();
