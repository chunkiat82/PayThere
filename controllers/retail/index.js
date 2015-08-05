'use strict';

//bad idea, it should be done by a formatter in the front end
var numeral = require('numeral');
var shortId = require('shortid');

var Datastore = require('nedb')
  , db = new Datastore({ filename: 'rm1'});

var request = require('request');
var paymentJSON = require('../../requests/payment.json');
var client = require('twilio')('AC5592f04d75d6ccf4eba102992a0a9f271', '258d925d73f6b6dcc7f42c4faef13a481');

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
                res.render('retail/index', {});
 			});
 		});
        
    });

    function callExpressCheckout(req,res,callback){

		var options = {
		    url: 'https://api.sandbox.paypal.com/v1/payments/payment',
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

        console.log("making Auth Call");

        var options = {
		    url: 'https://api.sandbox.paypal.com/v1/oauth2/token',
		    headers: {
		        "Accept-Language":"en_US",
                "Accept":"application/json",
                "Content-Type":"application/x-www-form-urlencoded",                
                "Authorization": "Basic QWNQVWNoRFh0NkowcDlDUTZ0SVJMMVRHYW90STA1VGVxZ0FZOU80YnJHZDR2VzZ2WnpyTFlyVUtmNHhoOkVIamNaQkFQS2p4WmhzR1hNaDBxTUlfU1pmaGFFV3N3d2xJeER0ajBPckVwT01wTlA0ZWp4MVk4MndZUA=="                
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
                sendSMS(model.eclink);
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

   //      request.post(options, function(err,httpResponse,body){
   //      	if (err) return console.log(err);        	
			// console.log(body);        	
   //      	callback(null,body);        	
   //      });
    callback(); 
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

        // request.get(options, function(err,httpResponse,body){
        // 	if (err) return console.log(err);
        	        	
        // 	callback(null,body.QRCode.image);
        // });
        callback();
    }

    function sendSMS(link){
         client.sendMessage({

            to: '+6586688706', // Any number Twilio can deliver to
            from: '+14423337468', // A number you bought from Twilio and can use for outbound communication
            body: '[REEBONZ] - To completed your payment, please click on the link - '+link // body of the SMS message

        }, function(err, responseData) { //this function is executed when a response is received from Twilio

            if (!err) { // "err" is an error received during the request, if any

                // "responseData" is a JavaScript object containing data received from Twilio.
                // A sample response from sending an SMS message is here (click "JSON" to see how the data appears in JavaScript):
                // http://www.twilio.com/docs/api/rest/sending-sms#example-1

                console.log(responseData.from); // outputs "+14506667788"
                console.log(responseData.body); // outputs "word to your mother."

            }
        });
    }

};
