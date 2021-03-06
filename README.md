# force.js 

## NOTE: This library is now deprecated. Please use the [Nforce](https://npmjs.org/package/nforce) (https://github.com/kevinohara80/nforce) library instead.


**force** is node.js a REST API wrapper for force.com, database.com, and salesforce.com.

## Features

- Simple API
- Intelligent sObjects
- Helper OAuth methods
- Simple streaming
- Multi-user design with single user mode
- Express middleware

## Installation

```bash
$ npm install force
```

## Usage

Require **force** in your app and create a client connection to a Salesforce Remote Access Application.

```js
var force = require('force');

var org = force.createConnection({
  clientId: 'SOME_OAUTH_CLIENT_ID',
  clientSecret: 'SOME_OAUTH_CLIENT_SECRET',
  redirectUri: 'http://localhost:3000/oauth/_callback',
  apiVersion: 'v27.0',  // optional, defaults to current salesforce API version
  environment: 'production',  // optional, salesforce 'sandbox' or 'production', production default
  mode: 'multi' // optional, 'single' or 'multi' user mode, multi default
});
```

Now we just need to authenticate and get our salesforce OAuth credentials. Here is one way to do this in multi-user mode...

```js
// multi user mode
var oauth;
org.authenticate({ username: 'my_test@gmail.com', password: 'mypassword'}, function(err, resp){
  // store the oauth object for this user
  if(!err) oauth = resp;
});
```

...or in single-user mode...

```js
// single-user mode
org.authenticate({ username: 'my_test@gmail.com', password: 'mypassword'}, function(err, resp){
  // the oauth object was stored in the connection object
  if(!err) console.log('Cached Token: ' + org.oauth.access_token)
});
```

Now we can go nuts. **force** has an salesforce sObject factory method that creates records for you. Let's use that and insert a record...

```js
var acc = force.createSObject('Account');
acc.Name = 'Spiffy Cleaners';
acc.Phone = '800-555-2345';
acc.SLA__c = 'Gold';

org.insert(acc, oauth, function(err, resp){
  if(!err) console.log('It worked!');
});
```

If you are in single-user mode, the `oauth` argument can be ommitted since it's cached as part of your connection object.

```js
org.insert(acc, function(err, resp){
  if(!err) console.log('It worked!');
});
```

Querying and updating records is super easy. **force** wraps API-queried records in a special object. The object caches field updates that you make to the record and allows you to pass the record directly into the update method without having to scrub out the unchanged fields. In the example below, only the Name and Industry fields will be sent in the update call despite the fact that the query returned other fields such as BillingCity and CreatedDate.

```js
var q = 'SELECT Id, Name, CreatedDate, BillingCity FROM Account WHERE Name = "Spiffy Cleaners" LIMIT 1';

org.query(q, oauth, function(err, resp){
  
  if(!err && resp.records) {
    
    var acc = resp.records[0];
    acc.Name = 'Really Spiffy Cleaners';
    acc.Industry = 'Cleaners';
    
    org.update(acc, oauth, function(err, resp){
      if(!err) console.log('It worked!');
    });
    
  } 
});
```

## Using the Example Files

Most of the files in the examples directory can be used by simply setting two environment variables then running the files. The two environment variables are `SFUSER` and `SFPASS` which are your Salesforce.com username and passsword, respectively. Example below:

```bash 
$ export SFUSER=myusername@salesforce.com
$ export SFPASS=mypassword
$ node examples/crud.js
```

## Authentication

**force** supports two Salesforce OAuth 2.0 flows, username/password and authorization code. 

### Username/Password flow

To request an access token and other oauth information using the username and password flow, use the `authenticate()` method and pass in your username and password in the options

```js
var oauth;

org.authenticate({ username: 'my_test@gmail.com', password: 'mypassword'}, function(err, resp){
  if(!err) {
    console.log('Access Token: ' + resp.access_token);
    oauth = resp;
  } else {
    console.log('Error: ' + err.message);
  }
});
```

### Authorization Code Flow

To perform an authorization code flow, first redirect users to the Authorization URI at Salesforce. **force** provides a helper function to build this url for you.

```js
org.getAuthUri()
```

Once you get a callback at the Redirect URI that you specify, you need to request your access token and other important oauth information by calling `authenticate()` and passing in the "code" that you received.

```js
var oauth;

org.authenticate({ code: 'SOMEOAUTHAUTHORIZATIONCODE' }, function(err, resp){
  if(!err) {
    console.log('Access Token: ' + resp.access_token);
    oauth = resp;
  } else {
    console.log('Error: ' + err.message);
  }
});
```

### OAuth Object

At the end of a successful authorization, you a returned an OAuth object for the user. This object contains your salesforce access token, endpoint, id, and other information.  If you have `mode` set to `multi`, cache this object for the user as it will be used for subsequent requests. If you are in `single` user mode, the OAuth object is stored as a property on your salesforce connection object.

### OAuth Object De-Coupling (Multi-user mode)

**force.js** decouples the oauth credentials from the connection object when `mode` is set to `multi` so that in a multi-user situation, a separate connection object doesn't need to be created for each user. This makes the module more efficient. Essentially, you only need one connection object for multiple users and pass the OAuth object in with the request. In this scenario, it makes the most sense to store the OAuth credentials in the users session or in some other data store. If you are using [express](https://github.com/visionmedia/express), **force.js** can take care of storing this for you (see Express Middleware).

### Integrated OAuth Object (Single-user mode)

If you specified `single` as your `mode` when creating the connection, calling authenticate will store the OAuth object within the connection object. Then, in subsequent API requests, you can simply omit the OAuth object from the request like so.

```js
org.query('SELECT Id FROM Lead LIMIT 1', function(err, res) {
  if(err) return console.error(err);
  else return console.log(res.records[0]);
});
```

## Other Features

### Express Middleware

**force** has built-in support for [express](https://github.com/visionmedia/express) using the express/connect middleware system. The middleware handles the oauth callbacks for you and automatically stores the OAuth credentials in the user's session. Therefore, to use the middleware you must have sessions enabled in your express configuration.

```js
app.configure(function(){
  app.set('views', __dirname + '/views');
  app.set('view engine', 'jade');
  app.use(express.bodyParser());
  app.use(express.methodOverride());
  app.use(express.cookieParser());
  app.use(express.session({ secret: 'force testing baby' }));
  app.use(org.expressOAuth({onSuccess: '/home', onError: '/oauth/error'}));  // <--- force middleware
  app.use(app.router);
  app.use(express.static(__dirname + '/public'));
});
```

Once this OAuth flow completes, subsequent requests just need to retrieve the OAuth requests from the user's session. Having this OAuth data in the session is quite handy.

```js
// express route
app.get('ajax/cases', function(req, res) { 
  var q = 'SELECT Id, CaseNumber FROM Cases WHERE IsClosed = false';
  org.query(q, req.session.oauth).pipe(res);
});
```

### Streaming API Responses

Under the covers, **force** leverages [request](https://github.com/mikeal/request) for all http requests to the Salesforce REST API. **request** returns a readable stream that can be used to pipe the data to a writable stream.

Here is an example of piping an force api request for the binary data of an Attachment directly to the response object in an http server.

```js
var http = require('http');

var server = http.createServer(function(req, res) {
  if(req.url === '/myimage') {
    org.getAttachmentBody({ id: attId }, oauth).pipe(res);
  } else {
    res.statusCode = 404;
    res.end();
  }
});
```

Here is an example of how you could get all sobjects in an org and write directly to a file in the local file system.

```js
var fs = require('fs');

org.getSObjects(oauth).pipe(fs.createWriteStream('./sobjects.txt'));
```

### Query Streaming

The Salesforce query call in the REST API returns a 2000 record chunk at one time. The example below shows a normal query returning 2000 records only.

```js
// dataset of 50k records.
var query = 'SELECT Name, CreatedDate FROM Account ORDER BY CreatedDate DESC';
org.query(query, req.session.oauth, callback(err, resp) {
  if(!err) console.log(resp.records.length) // this will be 2000 max
});
```

Like other API requests, **force** query method returns a node stream. By calling the `pipe` method on this object, your query call will automatically start streaming ALL of the records from your query in 2000 record batches.

```js
// dataset of 50k records.
var query = 'SELECT Name, CreatedDate FROM Account ORDER BY CreatedDate DESC';
org.query(query, req.session.oauth).pipe(res); // streaming all 50k records
``` 

### Force.com Streaming API Support

**force** supports the Force.com Streaming API. Connecting to one of your PushTopics is easy using the node.js EventEmitter interface.

```js
org.authenticate({ username: user, password: pass }, function(err, oauth) {
  
  if(err) return console.log(err);

  // subscribe to a pushtopic
  var str = org.stream('AllAccounts', oauth);

  str.on('connect', function(){
    console.log('connected to pushtopic');
  });

  str.on('error', function(error) {
    console.log('error: ' + error);
  });

  str.on('data', function(data) {
    console.log(data);
  });

});
```

## force.js API Basics

### Callbacks

The API of **force** follows typical node.js standards. Callbacks will always pass an optional error object, and a response object. The response object closely resembles the typical responses from the Salesforce REST API.

```js
callback(err, resp);
```

### Streams

Most of the org methods take a callback, but also return a stream. This is useful if you want to **pipe** stuff around. Here is a quick example of how you could dump all sobjects in an org to a file.

```js
var so = fs.createWriteStream('sobjects.txt', {'flags': 'a'});

org.getSObjects(oauth).pipe(so);
```

## force Base Methods

### createConnection(opts)

The createConnection method creates an *force* salesforce connection object. You need to supply some arguments including oauth information and some optional arguments for version and salesforce environment type. 

* `clientId`: Required. This is the OAuth client id
* `clientSecret`: Required. This is the OAuth client secret
* `redirectUri`: Required. This is the redirect URI for OAuth callbacks
* `apiVersion`: Optional. This is a number or string representing a valid REST API version. Default is the latest current api version.
* `environment`: Optional. Values can be 'production' or 'sandbox'. Default is production.
* `loginUri`: Optional. Used to override the login URI if needed.
* `testLoginUri`: Optional. Used to override the testLoginUri if needed.

### createSObject(type, [fieldValues])

This creates an sObject record that you can use to insert, update, upsert, and delete. `type` should be the salesforce API name of the sObject that you are updating. `fieldValues` should be a hash of field names and values that you want to initialize your sObject with. You can also just assign fields and values by setting properties after you create the sObject.

## Salesforce sObject Methods

### getFieldValues()

This method returns the cached values that have been updated that will be passed in an update or upsert method. Calling this method clears the cache. It's very rare that you will need to call this method directly.

### setExternalId(field, value)

For upsert methods, you need to specify the External Id field and the value that you are trying to match on.

### getId()

Returns the sObjects Id (if set)

## Connection Methods

The following list of methods are available for an **force** connection object:

### getAuthUri([opts])

This is a helper method to build the authentication uri for a authorization code OAuth 2.0 flow. You can optionally pass in an OAuth options argument. The supported options are:

* `display`: (String) Tailors the login page to the user's device type. Currently the only values supported are `page`, `popup`, and `touch`
* `immediate`: (Boolean) Avoid interacting with the user. Default is false.
* `scope`: (Array) The scope parameter allows you to fine-tune what the client application can access. Supported values are `api`, `chatter_api`, `full`, `id`, `refresh_token`, `visualforce`, and `web` 
* `state`: Any value that you wish to be sent with the callback

### authenticate(opts, [callback])

This method requests the OAuth access token and instance information from Salesforce or Force.com. This method either requires that you pass in the authorization code (authorization code flow) or username and password (username/password flow).

* `code`: (String) An OAuth authorization code

-- OR --

* `username`: (String) Your salesforce/force.com/database.com username
* `password`: (String) Your salesforce/force.com/database.com password
* `securityToken`: (String) Your Salesforce security token. This will be appended to your password if this property is set.

### expressOAuth(onSuccess, onError)

The express middleware. `onSuccess` and `onError` should be uri routes for redirection after OAuth callbacks.

### getVersions([callback])

Gets the salesforce versions. Note: Does not require authentication.

### getResources([oauth], [callback])

Gets the available salesforce resources

### getSObjects([oauth], [callback])

Get all sObjects for an org

### getMetadata(type, [oauth], [callback])

Get metadata for a single sObject. `type` is a required String for the sObject type

### getDescribe(type, [oauth], [callback])

Get describe information for a single sObject. `type` is a required String for the sObject type

### insert(sobject, [oauth], [callback])

Insert a record. `sobject`: (Object) A Salesforce sObject

### update(sobject, [oauth], [callback])

Update a record. `sobject`: (Object) A Salesforce sObject

### upsert(sobject, [oauth], [callback])

Update a record. `sobject`: (Object) A Salesforce sObject. NOTE: you must use the setExternalId() method to set the external Id field and the value to match on.

### delete(sobject, [oauth], [callback])

Delete a record. `sobject`: (Object) A Salesforce sObject

### getRecord(sobject, [oauth], [callback])

Get a single record. `sobject`: (Object) A Salesforce sObject

### getBody(sobject, [oauth], [callback])

Get the binary data for an attachment, document, or contentversion. The `sobject` must be one of those three types.

### getAttachmentBody(id, [oauth], [callback]) 

Get the binary data for an attachment for the given `id`

### getDocumentBody(id, [oauth], [callback]) 

Get the binary data for an document for the given `id`

### getContentVersionBody(id, [oauth], [callback]) 

Get the binary data for an contentversion for the given `id`

### query(query, [oauth], [callback])

Execute a SOQL query for records. `query` should be a SOQL string. Large queries can be streamed using the `pipe()` method.

### search(search, [oauth], [callback])

Execute a SOSL search for records. `search` should be a SOSL string.

### getUrl(url, [oauth], [callback])

Get a REST API resource by its url. `url` should be a REST API resource.

### stream(pushtopic, [oauth])

Start a force.com streaming API connection. An EventEmitter is returned with the following events:

* `connect`: subscribed to the topic
* `data`: got a streaming event
* `error`: there was a problem with the subscription

### apexRest(restRequest, [oauth], [callback])

This method handles integration with salesforce ApexRest (Custom Rest endpoints)
http://wiki.developerforce.com/page/Creating_REST_APIs_using_Apex_REST

A restRequest has the following properties

* `uri`: (String) REQUIRED - The endpoint you wrote (everything after services/apexrest/..)
* `method`: (String) Optional - defaults to GET if not supplied
* `body`: (Object || String) Optional - What you would like placed in the body of your request
* `urlParams`: (Array) Optional - URL parmams in an array of [{key:'key', value:'value'}]

```js
org.apexRest({uri:'test', method: 'POST', body: body, urlParams: urlParams}, req.session.oauth, function(err,resp) {
  if(!err) {
    console.log(resp);
    res.send(resp);
  } else {
    console.log(err);
    res.send(err);
  }
});
```

## Contributors

* [Kevin O'Hara](https://github.com/kevinohara80)
* [Jeff Douglas](https://github.com/jeffdonthemic)
* [Zach McElrath](https://github.com/zachelrath)
* [Chris Bland](https://github.com/chrisbland)
* [Jeremy Neander](https://github.com/jneander)
* [Austin McDaniel](https://github.com/amcdaniel2)
* [Chris Hickman](https://github.com/chrishic)
