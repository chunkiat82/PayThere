'use strict';


requirejs.config({
    paths: {    	
        'jquery': '/components/jquery/dist/jquery.min',
        'bootstrap': '/components/bootstrap/dist/js/bootstrap.min'
    },
    useStrict:true
});


require(['jquery'], function () {
	require(['bootstrap'], function ($, nougat) {
	    var app = {
	        initialize: function () {
	            // Your code here
	        }
	    };

	    app.initialize();
	});

});
