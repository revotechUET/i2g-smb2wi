const fs = require('fs');
const {smb2wi, wi2smb} = require('./converters');
const service = require('./service');
const opt = require('node-getopt').create([
  ['i', 'input-file=ARG', 'input file'],
  ['', 'smb2wi', 'convert smb2wi'],
  ['', 'wi2smb', 'convert wi2smb'],
  ['s', 'service', 'service mode'],
  ['o', 'output-file=ARG', 'output file'],
  ['p', 'share-prefix=ARG', 'share prefix'],
  ['P', 'port=ARG', 'service port'],
  ['k', 'jwt-key=ARG', 'jwt key'],
  ['h', 'help', 'display this help' ]
]).bindHelp().parseSystem();

const inputFile = opt.options['input-file'] || 'smb.conf';
const outputFile = opt.options['output-file'];
const sharePrefix = opt.options['share-prefix'] || 'codb';
const port = +(opt.options['port'] || 4000);
const jwtKey = opt.options['jwt-key'] || 'wi-hash';
console.log(opt.options);
if (opt.options.smb2wi) {
  let wiConfig = smb2wi(inputFile, sharePrefix);
  console.log(JSON.stringify(wiConfig));
}
else if (opt.options.wi2smb) {
  wi2smb(outputFile, JSON.parse(fs.readFileSync(inputFile, 'utf-8')));
}
else if (opt.options.service) {
  console.log('Service mode');
  let wiConfig = smb2wi(inputFile, sharePrefix);
  service(port, wiConfig, sharePrefix, inputFile, jwtKey);
}
else {
  opt.showHelp();
}
