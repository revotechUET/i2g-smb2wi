const {wi2smb} = require('../converters');
const jwt = require('jsonwebtoken');
module.exports = service;
function buildPath(storageDBKey) {
  return `/i2g_data/minio_data/I2G_Storage_Bucket/BDPOC/${storageDBKey}`;
}
function buildShareName(workspaceName, owner, sharePrefix) {
  return `${sharePrefix}_${owner}_${workspaceName}`;
}
function service(port, wiConfig, SHARE_PREFIX, SMB_CONFIG, JWTKEY) {
  const express = require('express');
  const app = express();

  function authenticate(req, res, next) {
    let token = req.headers['x-access-token'] || req.headers['Authorization'] || req.query.token;
    console.log(token);
    console.log(JWTKEY);
    jwt.verify(token, JWTKEY, function(err, decoded) {
      if(err) {
        console.error(err);
        return res.status(400).send('Invalid token');
      }
      next();
    });
  }
  
  app.use(express.json());

  app.get('/api', function(req, res) {
    console.log('received api');
    res.send('wi-smb service running ok');
  });
  app.get('/', function(req, res) {
    console.log('received');
    res.send('wi-smb service running');
  });
  app.post('/query-shares', authenticate, function(req, res) {
    let storageDBKeys = req.body;
    console.log(storageDBKeys);
    try {
      let shares = wiConfig.shares.filter(sh => storageDBKeys.includes(sh.data.storageDBKey));
      res.send({success: true, data: shares});
    }
    catch(e) {
      res.status(400).send(e.message);
    }
  });
  app.post('/load-shares', authenticate, function(req, res) {
    let {shares, storageDBKeys} = req.body;
    // console.log(shares, storageDBKeys);
    let hashOfShares = {};
    for (let sh of shares) {
      hashOfShares[sh.data.storageDBKey] = sh;
    }
    console.log("HashOfShare:", hashOfShares);
    // Process shares
    for (let dbKey of storageDBKeys) {
      if (Object.keys(hashOfShares).includes(dbKey)) {
        // update share in wiConfig
        let idx = wiConfig.shares.findIndex(sh => sh.data.storageDBKey === dbKey);
        if (idx >= 0) {
          console.log("Update share");
          wiConfig.shares[idx] = hashOfShares[dbKey];
        }
        else {
          wiConfig.shares.push(hashOfShares[dbKey]);
        }
      }
      else {
        let idx = wiConfig.shares.findIndex(sh => sh.data.storageDBKey === dbKey);
        if (idx >= 0) {
          console.log("remove share");
          wiConfig.shares.splice(idx, 1);
        }
      }
    }
    wi2smb(SMB_CONFIG, wiConfig);
    res.send({success: true, data: wiConfig.shares.filter(sh => storageDBKeys.includes(sh.data.storageDBKey))});
  });
  app.post('/share', authenticate, function(req, res) {
    let { workspaceName, owner, storageDBKey, toUsers } = req.body;
    let found = wiConfig.shares.find(sh => sh.data.storageDBKey === storageDBKey);
    if (found) {
      res.status(400).send({success: false, data: `Workspace ${workspaceName} is already shared`});
      return;
    }
    wiConfig.shares.push({
      comment: JSON.stringify({owner, storageDBKey}),
      path: buildPath(storageDBKey),
      'read only': 'no',
      browsable: 'no',
      'hide files': '/*__WI__/',
      data: {
        name: buildShareName(workspaceName, owner, SHARE_PREFIX),
        owner: owner, 
        storageDBKey: storageDBKey,
        validUsers: toUsers
      }
    });
    wi2smb(SMB_CONFIG, wiConfig);
    res.send({success: true, data: {workspaceName, owner, storageDBKey}});
  });
  app.put('/share', authenticate, function(req, res) {
    let { storageDBKey, toUsers } = req.body;
    let found = wiConfig.shares.find(sh => sh.data.storageDBKey === storageDBKey);
    if (!found) {
      res.status(400).send({success: false, data: `Shared workspace not found`});
      return;
    }
    found.data.validUsers = toUsers;
    wi2smb(SMB_CONFIG, wiConfig);
    res.send({success: true, data: {storageDBKey}});
  });
  app.delete('/share/:storageDBKey', authenticate, function(req, res) {
    let storageDBKey = req.params.storageDBKey;
    let foundIndex = wiConfig.shares.findIndex(sh => sh.data.storageDBKey === storageDBKey);
    if (foundIndex < 0) {
      res.status(400).send({success: false, data: `Shared workspace not found`});
      return;
    }
    wiConfig.shares.splice(foundIndex, 1);
    wi2smb(SMB_CONFIG, wiConfig);
    res.send({success: true, data: {storageDBKey}});
  });
  app.listen(port, function() {
    console.log("service started at port " + port);
  });
}
