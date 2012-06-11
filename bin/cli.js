#!/usr/bin/env node

var nforce = require('../');
var fs = require('fs');
var optimist = require('optimist');
var mkdirp = require('mkdirp');
var fs = require('fs');
var path = require('path');
var _ = require('underscore');

var dir = process.env.HOME + '/.nforce';
var file = dir + '/config.json';

var conn = nforce.createConnection({
  clientId: '3MVG9rFJvQRVOvk5nd6A4swCyck.4BFLnjFuASqNZmmxzpQSFWSTe6lWQxtF3L5soyVLfjV3yBKkjcePAsPzi',
  clientSecret: '9154137956044345875',
  redirectUri: 'http://localhost:3000/oauth/_callback'
});

var argv = optimist
  .usage([
    '',
    '***************************',
    '* nforce cli              *',
    '***************************',
    '',
    '  USAGE:',
    '',
    '  $0 config   ::  manage your configuration',
    '  $0 query    ::  execute a SOQL query',
    '  $0 version  ::  show your nforce version',
    '',
    'for specific command help type `nforce help [command]`'
  ].join('\r\n'))
  .argv
;

var cmd = argv._[0];

if(cmd == 'version') {
  console.log('nforce v' + nforce.version);
} else if (cmd == 'help') {
  if(argv._[1]) {
    var helpCmd = argv._[1];
    console.log(helpCmd);
  } else {
    optimist.showHelp();
  }
} else if(cmd == 'config') {
  handleConfig();
} else if(cmd == 'query') {
  var config = fs.openSync(__dirname + '/nforce.json', 'w+');
  console.log(config);
} else {
  if(cmd) {
    console.error('`' + cmd + '` is not a supported command!');
    console.log(' ');
  }
  optimist.showHelp();
}

function handleConfig() {
  loadConfig(function(err, cfg) {
    if(err) return console.error('Problem loading config: ' + err.message);
    
    var mod = argv._[1];
    
    if(mod == 'add-org') {
      if(!argv.u || ! argv.p || !argv.n) {
        return console.log('invalid information to add org');
      }
      
      var org = {
        nickname: argv.n,
        username: argv.u,
        password: argv.p,
        securityToken: argv.t || null,
        environment: (argv.e == 'sandbox') ? 'sandbox' : 'production',
        oauth: {}
      }
      
      var indicies = [];
      
      if(cfg.orgs.length) {
        for(var i=0; i<cfg.orgs.length; i++) {
          if(cfg.orgs[i].nickname == org.nickname) {
            indicies.push(i);
          }
        }
      }
      
      // switch to sandbox if this is selected
      if(org.environment == 'sandbox') conn.environment == 'sandbox';
      
      console.log('[NFORCE] -> attempting to authenticate');
      
      conn.authenticate(org, function(err, resp) {
        if(err) return console.error('[NFORCE] -> could not authenticate: ' + err.message);
        
        var offset = 0;
        if(indicies.length) {
          for(var i=0; i<indicies.length; i++) {
            cfg.orgs.splice(indicies[i - offset], 1);
            offset++;
          }
        }
        
        org.oauth = resp;
        cfg.orgs.push(org);

        saveConfig(cfg, function(err) {
          if(err) return console.error('Problem saving config: ' + err.message);
          console.log('[NFORCE] -> New org (' + org.nickname + ') was created.');
        });
        
      });
      
    }
    
  });
}

function loadConfig(cb) {
  mkdirp(dir, function (err) {
    if(err) return cb(err, null);
    path.exists(file, function (ex) {
      if(!ex) {
        var cfg = {
          orgs: []
        }
        saveConfig(cfg, function() {
          cb(null, cfg);
        });
      } else {
        fs.readFile(file, function(err, data) {
          if(err) cb(err, null);
          cb(null, JSON.parse(data));
        });
      }
    });
  });
}

function saveConfig(cfg, cb) {
  fs.writeFile(file, JSON.stringify(cfg, null, ' ') + '\n' , function(err) {
    if(err) return cb(err);
    cb(null);
  });
}




