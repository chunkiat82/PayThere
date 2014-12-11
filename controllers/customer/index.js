'use strict';

var qrcode=require('qrcode-js');
var Client = require('node-rest-client').Client;

//bad idea, it should be done by a formatter in the front end
var numeral = require('numeral');
var shortId = require('shortid');

var Datastore = require('nedb')
  , db = new Datastore({ filename: 'rm1' });

module.exports = function (router) {

    //var model = new IndexModel();

    router.get('/', function (req, res) {
        		
      var model = {};
      
      db.loadDatabase();
      db.find({type : "payment" }, function (err, docs) {   // Callback is optional        
          if (err) return console.log("error in db loading payments for merchant");
          model.payments = docs;
          res.render("customer/index",model);    
      });
      
    });

}
