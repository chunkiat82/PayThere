'use strict';

var request = require('request');
var client = require('twilio')(process.env.TWILIO_CLIENT), process.env.TWILIO_SECRET);


var Datastore = require('nedb'),
    db = new Datastore({
        filename: 'rm1'
    });

module.exports = function(router) {

    router.get('/', function(req, res) {

        console.log(req.query);
        console.log(req.query.paymentId);

        if (req.query.paymentId) {
            callOAuth(req, res, function(err, data) {

                req.accessToken = data;



                callExecuteOrder(req, res, function(err, data) {
                    updatePaymentStatus(req);
                    res.render('execute/index', {});
                });
            })
        } else {
            res.render('execute/index', {});
        }

    });

    router.get('/test', function(req, res) {
       
    });

    function updatePaymentStatus(req) {
        db.loadDatabase();
        db.update({
            paymentId: req.query.paymentId
        }, {
            $set: {
                status: "completed"
            }
        }, {
            upsert: true
        }, function(err, num, upsertDoc) {
            if (err) return console.log("error in update");
        });
    }

    function callExecuteOrder(req, res, callback) {
        var options = {
            url: 'https://api.sandbox.paypal.com/v1/payments/payment/' + req.query.paymentId + '/execute',
            headers: {
                "Accept-Language": "en_US",
                "Accept": "application/json",
                "Content-Type": "application/json",
                "Authorization": "Bearer " + req.accessToken
            },
            body: {
                "payer_id": req.query.PayerID
            },
            json: true
        };

        request.post(options, function(err, httpResponse, body) {
            if (err) return console.log(httpResponse);
            console.log(body);
            callback(null, body);
        });
    }

    function callOAuth(req, res, callback) {

        var options = {
            url: 'https://api.sandbox.paypal.com/v1/oauth2/token',
            headers: {
                "Accept-Language": "en_US",
                "Accept": "application/json",
                "Content-Type": "application/x-www-form-urlencoded",
                "Authorization": "Basic QWNQVWNoRFh0NkowcDlDUTZ0SVJMMVRHYW90STA1VGVxZ0FZOU80YnJHZDR2VzZ2WnpyTFlyVUtmNHhoOkVIamNaQkFQS2p4WmhzR1hNaDBxTUlfU1pmaGFFV3N3d2xJeER0ajBPckVwT01wTlA0ZWp4MVk4MndZUA=="
            },
            form: {
                "grant_type": "client_credentials"
            },
            json: true
        };

        request.post(options, function(err, httpResponse, body) {
            console.log(body);
            callback(null, body.access_token);
        });
    }
}
