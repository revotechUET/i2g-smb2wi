const ini = require('ini');
const fs = require('fs');
const { spawn } = require('child_process');
module.exports = {smb2wi, wi2smb}

function smb2wi(iniFile, sharePrefix) {
  const config = ini.parse(fs.readFileSync(iniFile, 'utf-8'));
  let wiConfig = {};
  let generals = [];
  let shares = [];
  for (let k in config) {
    if (k.startsWith(sharePrefix)) {
      let o = Object.assign({}, config[k]);
      let o1 = JSON.parse(o.comment);
      o.data = {
        name: k,
        owner: o1.owner,
        storageDBKey: o1.storageDBKey,
        validUsers: o['valid users']?o['valid users'].split(',').filter(u => u !== o1.owner) : []
      }
      shares.push(o);
    }
    else {
      let o = Object.assign({}, config[k]);
      o.data = {name : k};
      generals.push(o);
    }
  }
  wiConfig.generals = generals;
  wiConfig.shares = shares;
  return wiConfig;
}
function forkChild(cmd) {
  return new Promise(function(resolve, reject) {
    const child = spawn('bash', ['-c', cmd]);
    child.stdout.pipe(process.stdout);
    child.stderr.pipe(process.stderr);
    child.on("exit", function(code) {
      console.log('code:' + code);
      resolve(code === 0);
    });
  });
}

function reload_smbd() {
  console.log('reload_smbd', arguments);
  forkChild('systemctl restart smbd');
}
function wi2smb(outFile, wiConfig) {
  let stream = fs.createWriteStream(outFile);
  for (let share of wiConfig.generals) {
    stream.write(`[${share.data.name}]\r\n`);
    let props = Object.keys(share).filter( p => p !== 'data' );
    for (p of props) {
      stream.write(`  ${p} = ${share[p]}\r\n`);
    }
  }

  for (let share of wiConfig.shares) {
    stream.write(`[${share.data.name}]\r\n`);
    let props = Object.keys(share).filter( p => p !== 'data' && p !== 'valid users' );
    for (p of props) {
      stream.write(`  ${p} = ${share[p]}\r\n`);
    }
    stream.write(`  valid users = ${[share.data.owner, ...share.data.validUsers].join(',')}\r\n`);
  }
  stream.end(reload_smbd);
}
