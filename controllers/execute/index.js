'use strict';

var request = require('request');

var Datastore = require('nedb')
  , db = new Datastore({ filename: 'rm1' });

module.exports = function (router) {

    router.get('/', function (req, res) {
        		        
        console.log(req.query);
        console.log(req.query.paymentId);

        if (req.query.paymentId){
	        callOAuth(req,res,function(err,data){

	        	req.accessToken = data;



	        	callExecuteOrder(req,res,function(err,data){
	        		updatePaymentStatus(req);
		        	res.render('execute/index', {});
		        });
	        })
		}else{
			res.render('execute/index', {});
		}

    });

    function updatePaymentStatus(req){
    	db.loadDatabase();
		db.update({ paymentId:req.query.paymentId } , { $set: {status:"completed"} }, {upsert:true}, function (err, num , upsertDoc) {
		 	if (err) return console.log("error in update");		 	
		});
    }

    function callExecuteOrder(req,res,callback){
    	var options = {
		    url: 'https://live.qa.paypal.com:11888/v1/payments/payment/'+req.query.paymentId+'/execute',
		    headers: {
		        "Accept-Language":"en_US",
                "Accept":"application/json",
                "Content-Type":"application/json",
                "Authorization": "Bearer "+req.accessToken
		    },
		    body : { "payer_id": req.query.PayerID },
		    json : true
		};

        request.post(options, function(err,httpResponse,body){
        	if (err) return console.log(httpResponse);
        	console.log(body);
        	callback(null,body);
        });
    }

    function callOAuth(req,res,callback){

        var options = {
		    url: 'https://live.qa.paypal.com:11866/v1/oauth2/token',
		    headers: {
		        "Accept-Language":"en_US",
                "Accept":"application/json",
                "Content-Type":"application/x-www-form-urlencoded",
                //"Authorization": "Bearer A015AwSixTumRLd0uVeGDdF9lNXY0Kcvc1a92hIeC1EiZqA"
                "Authorization": "Basic QVprVVhSRDQ4R280dWhLZXpGUC0tU19fY2VnM2p6TnNmRXZycTVPemtjMmliUE04UGllcjlyRkxCZ3VVOg=="                
		    },
		    form: {"grant_type":"client_credentials"},
		    json:true
		};

        request.post(options, function(err,httpResponse,body){        	
        	console.log(body);        	        	
        	callback(null,body.access_token);
        });
    }
 }
