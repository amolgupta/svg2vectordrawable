
const fs = require('fs');
const path = require('path');
const promisify = require('util.promisify');
const readFile = promisify(fs.readFile);
const writeFile = promisify(fs.writeFile);
const pkg = require('../package.json');
const svg2vectordrawable = require('./svg2vectordrawable');
const mkdirp = require('mkdirp');

let programName = process.argv[1];
let exampleText = '\n\n' +
    'Example:\n' +
    '  \x1b[31m\x1b[1m' + path.basename(programName) + '\x1b[0m -i input.svg -o output.xml\n' +
    '  \x1b[31m\x1b[1m' + path.basename(programName) + '\x1b[0m -f input_folder -o output_folder\n' +
    '  \x1b[31m\x1b[1m' + path.basename(programName) + '\x1b[0m -s \'<svg>...</svg>\'';

// https://github.com/veged/coa
module.exports = require('coa').Cmd()
    .name(programName)
    .title(pkg.description + exampleText)
    .helpful()

    .opt()
        .name('version')
        .title('Version')
        .short('v')
        .long('version')
        .only()
        .flag()
        .act(function(opts) {
            return pkg.version;
        })
        .end()

    .opt()
        .name('input').title('Input file, must be a SVG file.')
        .short('i')
        .long('input')
        .val(function(val) {
            return val || this.reject('Option "-i, --input" must have a value.');
        })
        .end()

    .opt()
        .name('folder').title('Input folder, convert all *.svg files')
        .short('f')
        .long('folder')
        .val(function(val) {
            return val || this.reject('Option "-f, --folder" must have a value.');
        })
        .end()

    .opt()
        .name('string').title('Input full SVG code, or a SVG tag code.')
        .short('s')
        .long('string')
        .val(function(val) {
            if (/^<.*>$/s.test(val.trim())) {
                return val.trim();
            }
            else {
                return this.reject('Option "-s, --string" must be a SVG code.');
            }
        })
        .end()

    .opt()
        .name('output').title('Output file or folder (by default the same as the input).')
        .short('o')
        .long('output')
        .val(function(val) {
            return val || this.reject('Option "-o, --output" must have a value.');
        })
        .end()

    .act(function(opts, args) {
        let input = opts.input || args.input;

        // -s '<...>' -o file
        if (opts.string) {
            svg2vectordrawable(opts.string).then(xml => {
                let output = opts.output;
                if (output) {
                    if (!/\.xml$/i.test(output)) {
                        output += '.xml';
                    }
                    return outputFile(output, xml).then(() => {
                        console.log(`Save to "${output}".`);
                    }).catch(err => {
                        console.error(err.message);
                    });
                }
                else {
                    return console.log(`\nAndroid Vector Drawable Code:\n\n${xml}`);
                }
            }).catch(err => {
                return console.error(err.message);
            });
        }
        else {
            let svgFiles = [];

            // -f
            if (opts.folder) {
                if (isDirectory(opts.folder)) {
                    fs.readdirSync(opts.folder).forEach(file => {
                        if (/\.svg$/i.test(file)) {
                            svgFiles.push(path.join(opts.folder, file));
                        }
                    });
                    if (svgFiles.length === 0) {
                        return console.error(`Folder "${opts.folder}" has not any SVG file.`);
                    }
                }
                else if (isFile(opts.folder)) {
                    return console.error(`File "${opts.folder}" must be a folder.`);
                }
                else {
                    return console.error(`Folder "${opts.folder}" is not exists.`);
                }
                // -o
                if (!opts.output) {
                    opts.output = opts.folder;
                }
            }

            // -i
            if (input) {
                if (isFile(input)) {
                    svgFiles.push(input);
                }
                else if (isDirectory(input)) {
                    return console.error(`File "${input}" must be a file.`);
                }
                else {
                    return console.error(`File "${input}" is not exists.`);
                }
                // -o
                if (!opts.output) {
                    opts.output = path.dirname(input);
                }
            }

            // output
            if (svgFiles.length === 1 && !/\.xml$/i.test(opts.output)) {
                return console.error('Output must be a XML file.');
            }
            if (svgFiles.length > 1 && /\.[0-9a-z]+$/i.test(opts.output)) {
                return console.error('Output must be a folder.');
            }

            svgFiles.forEach(svg => {
                let filePath = opts.output;
                if (!/\.xml$/i.test(opts.output)) {
                    filePath = path.join(filePath, path.basename(svg, '.svg') + '.xml');
                }
                return convertFile(svg, filePath).catch(err => {
                    console.error(err.message);
                });
            });
        }
    });

function convertFile(input, output) {
    return new Promise((resolve, reject) => {
        readFile(input, 'utf8').then(data => {
            svg2vectordrawable(data).then(xml => {
                outputFile(output, xml).then(() => {
                    console.log(`∙ ${input} → ${output}`);
                }).catch(err => reject(err));
            }).catch(err => reject(err));
        }, error => {
            reject(error);
        }).catch(err => reject(err));
    });
}

function outputFile(filePath, content) {
    return new Promise((resolve, reject) => {
        let dir = path.dirname(filePath);
        fs.stat(dir, (err, stats) => {
            if (err) {
                if (err.code === 'ENOENT') {
                    mkdirp(dir, err => {
                        if (err) {
                            reject(err);
                        }
                        else {
                            writeFile(filePath, content, 'utf8').then(() => {
                                resolve();
                            }).catch(err => reject(err));
                        }
                    });
                }
                else {
                    reject(err);
                }
            }
            else {
                writeFile(filePath, content, 'utf8').then(() => {
                    resolve();
                }).catch(err => reject(err));
            }
        });
    });
}

function isFile(filePath) {
    if (fs.existsSync(filePath)) {
        if (fs.statSync(filePath).isFile()) {
            return true;
        }
    }
    return false;
}

function isDirectory(filePath) {
    if (fs.existsSync(filePath)) {
        if (fs.statSync(filePath).isDirectory()) {
            return true;
        }
    }
    return false;
}
