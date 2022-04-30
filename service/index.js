const {wi2smb} = require('../converters');
const jwt = require('jsonwebtoken');
const notify = require("../notification");
module.exports = service;
function buildPath(storageDBKey) {
  return `/i2g_data/minio_data/I2G_Storage_Bucket/BDPOC/${storageDBKey}`;
}
function buildShareName(workspaceName, owner, sharePrefix) {
  return `${sharePrefix}_${owner}_${workspaceName}`;
}

// ACCESSORS
function getValidUsersOfShare(share) {
  return share.data.validUsers;
}
function getNameOfShare(share) {
  return share.data.name;
}
function getOwnerOfShare(share) {
  return share.data.owner;
}
function diffInUsers(newUsers, oldUsers) {
  let newUHash = {};
  let oldUHash = {};
  let addedUsers = [];
  let removedUsers = [];
  for (let u of newUsers) {
    newUHash[u] = 1;
  }
  for (let u of oldUsers) {
    oldUHash[u] = 1;
  }
  for (let u of newUsers) {
    if (!oldUHash[u]) {
      addedUsers.push(u);
    }
  }
  for (let u of oldUsers) {
    if (!newUHash[u]) {
      removedUsers.push(u);
    }
  }
  return {added: addedUsers, removed: removedUsers}
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
    // Process shares
    for (let dbKey of storageDBKeys) {
      if (Object.keys(hashOfShares).includes(dbKey)) {
        // update share in wiConfig
        let idx = wiConfig.shares.findIndex(sh => sh.data.storageDBKey === dbKey);
        if (idx >= 0) {
          console.log("Update share");
          let newValidUsers = getValidUsersOfShare(hashOfShares[dbKey]);
          let oldValidUsers = getValidUsersOfShare(wiConfig.shares[idx]);
          let usersObj = diffInUsers(newValidUsers, oldValidUsers);
          notify(usersObj.added, usersObj.removed, getOwnerOfShare(hashOfShares[dbKey]), getNameOfShare(hashOfShares[dbKey]));
          wiConfig.shares[idx] = hashOfShares[dbKey];
        }
        else {
          console.log("New share");
          notify(getValidUsersOfShare(hashOfShares[dbKey]), [], getOwnerOfShare(hashOfShares[dbKey]), getNameOfShare(hashOfShares[dbKey]));
          wiConfig.shares.push(hashOfShares[dbKey]);
        }
      }
      else {
        let idx = wiConfig.shares.findIndex(sh => sh.data.storageDBKey === dbKey);
        if (idx >= 0) {
          console.log("remove share");
          notify([], getValidUsersOfShare(wiConfig.shares[idx]), getOwnerOfShare(wiConfig.shares[idx]), getNameOfShare(wiConfig.shares[idx]));
          wiConfig.shares.splice(idx, 1);
        }
      }
    }
    wi2smb(SMB_CONFIG, wiConfig);
    res.send({success: true, data: wiConfig.shares.filter(sh => storageDBKeys.includes(sh.data.storageDBKey))});
  });
  app.listen(port, function() {
    console.log("service started at port " + port);
  });
}
