'use strict';

/* Magic Mirror
 * Module: weather-requests
 *
 * By StryderUK
 * MIT Licensed.
 */

const NodeHelper = require('node_helper');
var request = require('request');

module.exports = NodeHelper.create({
	config: {
		debug: true,
		verbose: true,
		info: true,
		error: true,
	},

	start: function() {
		console.log("Starting node helper for: " + this.name);
		this.verbose("Verbose enabled");
		this.debug("Debug enabled");
		console.log(this.name + " conf is " + JSON.stringify(this.config));
	},

	requestFn: function(config) {
		this.verbose("getting data from url:" + config.url);
		this.verbose(" with method:" + config.method);
		this.verbose(" using headers:" + JSON.stringify(config.headers));

		request({
			url: config.url,
			method: config.method,
			headers: config.headers,
		}, (error, response, body) => {
			if (!error && response.statusCode == 200) {
				var data = JSON.parse(body);
				this.sendSocketNotification("REQUEST_OK", { data: data, context: config.context });
			}
			else {
				if(error) {
					console.log(this.name + " there was an error:" + error);
				} else {
	                		this.debug(" status code is " + response.statusCode);
	                		this.debug(" body is " + body);
				}
				this.sendSocketNotification("REQUEST_ERROR", { error: error, statusCode: response.statusCode, context: config.context });
			}
		});
	},

	socketNotificationReceived: function(notification, payload) {
		if (notification === 'REQUEST') {
			this.requestFn(payload);
		}
	},

	debug: function(str) {
		if (this.config && this.config.debug) {
			console.log(new Date().toISOString().substring(11) + ":DEBUG:" + this.name + " " + str);
		}
	},
	verbose: function(str) {
		if (this.config && this.config.debug) {
			console.log(new Date().toISOString().substring(11) + ":VERBOSE:" + this.name + " " + str);
		}
	},
	info: function(str) {
		if (this.config && this.config.info) {
			console.log(new Date().toISOString().substring(11) + ":INFO:" + this.name + " " + str);
		}
	},
	error: function(str) {
		if (this.config && this.config.error) {
			console.log(new Date().toISOString().substring(11) + ":ERROR:" + this.name + " " + str);
		}
	}
});
