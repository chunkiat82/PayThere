'use strict';

var qrcode=require('qrcode-js');
var Client = require('node-rest-client').Client;

//bad idea, it should be done by a formatter in the front end
var numeral = require('numeral');
var shortId = require('shortid');

var Datastore = require('nedb')
  , db = new Datastore({ filename: 'rm1' });

module.exports = function (router) {    

    router.get('/', function (req, res) {
            
      db.loadDatabase();
      db.findOne( {paymentId:req.query.paymentId}, function (err, doc) {   // Callback is optional        
          if (err) return console.log("error in db loading payments for merchant");          
          if (doc){
            var model = doc;
            res.render("code/index",model);
          }else{
            res.render("code/refresh",model);            
          }
      });
      
    });
}
