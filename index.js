'use strict';
var http = require('http');
var https = require('https');

var express = require('express');
var kraken = require('kraken-js');

var https = require('https');
var constants = require('constants');

var Datastore = require('nedb')
  , db = new Datastore({ filename: 'rm1', autoload:true});

var options, app, server;
/*
 * Create and configure application. Also exports application instance for use by tests.
 * See https://github.com/krakenjs/kraken-js#options for additional configuration options.
 */
options = {
    onconfig: function (config, next) {
        /*
         * Add any additional config setup or overrides here. `config` is an initialized
         * `confit` (https://github.com/krakenjs/confit/) configuration object.
         */
        next(null, config);
    }
};

app = module.exports = express();
app.use(kraken(options));
app.on('start', function () {
    console.log('Application ready to serve requests.');
    console.log('Environment: %s', app.kraken.get('env:env'));	
});
process.on('uncaughtException', function(e){
    console.log(e);
});
/*
 * Create and start HTTP server.
 */
if (!module.parent) {

    /*
     * This is only done when this module is run directly, e.g. `node .` to allow for the
     * application to be used in tests without binding to a port or file descriptor.
     */
    server = http.createServer(app);
    server.listen(process.env.PORT || 8000);
    server.on('listening', function () {
        console.log('Server listening on http://localhost:%d', this.address().port);
    });
	

    /* ignore server ssl */
    process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
    https.globalAgent.options.secureProtocol = 'TLSv1_method';    
    https.globalAgent.options.rejectUnauthorized = false;
    https.globalAgent.options.requestCert = true;
    https.globalAgent.options.agent = false;    


    db.find({_id : "payments"}, function (err, doc) {   // Callback is optional        
      if (err || doc.length == 0) return console.log("error in loading doc");
      console.log("doc="+doc);
    });

}