'use strict';

//bad idea, it should be done by a formatter in the front end
var numeral = require('numeral');
var shortId = require('shortid');

var Datastore = require('nedb')
  , db = new Datastore({ filename: 'rm1'});

var request = require('request');
var paymentJSON = require('../../requests/payment.json');

module.exports = function (router) {

    //var model = new IndexModel();

    router.get('/', function (req, res) {
        
        res.render('retail/index', {});
        
    });

    router.post('/', function (req, res) {
        
        //populateUnqiuePaymentId(model);

		req.model = {};
        req.model.customerName = req.body.customer_name;
        populateAuthorizedAmount(req.body.total,req.model);

		callOAuth(req,res,function(err,accessToken){
 			console.log("getOAuth done");
 			req.accessToken = accessToken;
 			callExpressCheckout(req,res,function(){
				console.log("getCheckoutDetails done");
 			});
 		});
        
    });

    function callExpressCheckout(req,res,callback){

		var options = {
		    url: 'https://live.qa.paypal.com:11888/v1/payments/payment',
		    headers: {
		        "Accept-Language":"en_US",
                "Accept":"application/json",
                "Content-Type":"application/json",
                "Authorization": "Bearer "+req.accessToken
		    },
		    body : paymentJSON,
		    json : true
		};

        request.post(options, function(err,httpResponse,body){
        	if (err) return console.log(httpResponse);   	
        	console.log(body);
        	var model = req.model;
        	
        	model.links = body.links;
            model.id = body.id;
            
            persistPaymentStatus(model,"PENDING");
            processExpressCheckoutResponse(req,res);            

        	callback();
        });
    }

    function callOAuth(req,res,callback){

        var options = {
		    url: 'https://live.qa.paypal.com:11866/v1/oauth2/token',
		    headers: {
		        "Accept-Language":"en_US",
                "Accept":"application/json",
                "Content-Type":"application/x-www-form-urlencoded",                
                "Authorization": "Basic QVprVVhSRDQ4R280dWhLZXpGUC0tU19fY2VnM2p6TnNmRXZycTVPemtjMmliUE04UGllcjlyRkxCZ3VVOg=="                
		    },
		    form: {"grant_type":"client_credentials"},
		    json:true
		};

        request.post(options, function(err,httpResponse,body){        	
        	console.log(body);
        	console.log(body.access_token);
        	callback(null,body.access_token);
        });
    }

    /*
    * not used now future used for unique key
    */    
    function populateUnqiuePaymentId(model){
    	var paymentId = shortId.generate();    	
    	model.paymentId = paymentId;
    }

    function populateAuthorizedAmount(input, model){
    	model.authorizedAmount= numeral(input).format('$0,0.00');
    }

    function persistPaymentStatus(model,status){        

        console.log("payment id=" +model.id);

		db.loadDatabase();

        db.insert({ type:'payment', paymentId:model.id , status:'PENDING'}, function (err) {
		 	if (err) return console.log("error in saving");		 			 	
		});
    }

    function processExpressCheckoutResponse(req,res){
    	var model = req.model;
        var links = model.links;

        for (var i = 0; i < links.length; i++) { 
            var entry = links[i];
            if (entry.rel === 'approval_url') {            
                model.eclink = entry.href;
                populateBase64Image(entry.href, function(err,data){


                    if (err === null){                        
                        getQRCode(data,function(err,data){

	                        db.update({ paymentId:model.id } , { $set: {customerName:model.customerName, ecBase64Image:data, ecLink:model.eclink, authorizedAmount:model.authorizedAmount }}, {upsert:true}, function (err, num , upsertDoc) {
							 	if (err) return console.log("error in finding");		 			 							 	
							 	db.findOne({ paymentId:model.id } , function (err, doc) {
								 	if (err) return console.log("error in finding");		 			 	

								 	res.redirect("/code?paymentId="+model.id);
								});
							});
                    	});

						
                    }
                });
            }
        };
    }

    function populateBase64Image(input, callback){

    	 var options = {
		    url: 'https://live.qa.paypal.com:13735/v1/barcodes/qr-code',
		    headers: {
		        "Accept-Language":"en_US",
                "Accept":"application/json",
                "Content-Type":"application/json",                
                "Authorization": "Basic QVprVVhSRDQ4R280dWhLZXpGUC0tU19fY2VnM2p6TnNmRXZycTVPemtjMmliUE04UGllcjlyRkxCZ3VVOg=="
		    },
		    body:{"QRCode":{"data":input,"type":"url","width":"200","height":"200"}},
		    json:true
		};

		console.log("Before Call populateBase64Image");

        request.post(options, function(err,httpResponse,body){
        	if (err) return console.log(err);        	
			console.log(body);        	
        	callback(null,body);        	
        });

    }

    function getQRCode(data,callback){        

        var options = {
        	url:"https://live.qa.paypal.com:13735/v1/barcodes/qr-code/"+data.QRCode.id,    
            headers:{
                "Content-Type": "application/json",
                "Accept": "application/json"
            },
            json:true
        };

        request.get(options, function(err,httpResponse,body){
        	if (err) return console.log(err);
        	        	
        	callback(null,body.QRCode.image);
        });

    }

};
