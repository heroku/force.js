#!/usr/bin/env node

var nforce = require('../');
var fs = require('fs');
var optimist = require('optimist');

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
  console.log('nforce version ' + nforce.version);
} else if (cmd == 'help') {
  if(argv._[1]) {
    var helpCmd = argv._[1];
    console.log(helpCmd);
  } else {
    optimist.showHelp();
  }
} else if(cmd == 'config') {
  fs.open(__dirname + '/nforce.json', 'w+', function(err, file) {
    if(err) return console.log('error accessing file');
    console.log(__dirname + '/nforce.json');
  });
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




