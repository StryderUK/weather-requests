/* global Module, WeatherProvider */

/* Magic Mirror
 * Module: Weather
 *
 * By Michael Teeuw http://michaelteeuw.nl
 * MIT Licensed.
 */

Module.register("weather-requests",{
	// Default module config.
	defaults: {
		updateInterval: 10 * 60 * 1000,
		weatherProvider: "openweathermap",
		roundTemp: false,
		type: "current", //current, forecast

		location: false,
		locationID: false,
		appid: "",
		units: config.units,

		tempUnits: config.units,
		windUnits: config.units,

		updateInterval: 10 * 60 * 1000, // every 10 minutes
		animationSpeed: 1000,
		timeFormat: config.timeFormat,
		showPeriod: true,
		showPeriodUpper: false,
		showWindDirection: true,
		showWindDirectionAsArrow: false,
		useBeaufort: true,
		lang: config.language,
		showHumidity: true,
		degreeLabel: false,
		decimalSymbol: ".",
		showIndoorTemperature: false,
		showIndoorHumidity: false,
		maxNumberOfDays: 5,
		fade: true,
		fadePoint: 0.25, // Start on 1/4th of the list.

		initialLoadDelay: 0, // 0 seconds delay
		retryDelay: 2500,

		apiVersion: "2.5",
		apiBase: "http://api.openweathermap.org/data/",
		weatherEndpoint: "/weather",

		appendLocationNameToHeader: true,
		calendarClass: "calendar",
		tableClass: "small",

		onlyTemp: false,
		showPrecipitationAmount: false,
		colored: false,
		showFeelsLike: true
	},

	// Module properties.
	weatherProvider: null,

	// Define required scripts.
	getStyles: function() {
		return ["font-awesome.css", "weather-icons.css", "weather-requests.css"];
	},

	// Return the scripts that are necessary for the weather module.
	getScripts: function () {
		return [
			"moment.js",
			"weatherprovider.js",
			"weatherobject.js",
			"suncalc.js",
			this.file("providers/" + this.config.weatherProvider.toLowerCase() + ".js")
		];
	},

	// Define required translations.
	getTranslations: function() {
		return {
		        "nl": "translations/nl.json", // Dutch
			"en": "translations/en.json", // English
		        "de": "translations/de.json", // German
		        "fi": "translations/fi.json", // Suomi
		        "fr": "translations/fr.json", // French
		        "fy": "translations/fy.json", // Frysk
		        "es": "translations/es.json", // Spanish
		        "ca": "translations/ca.json", // Catalan
		        "nb": "translations/nb.json", // Norsk bokmål
		        "nn": "translations/nn.json", // Norsk nynorsk
		        "pt": "translations/pt.json", // Português
		        "pt-br": "translations/pt-br.json", // Português Brasileiro
		        "sv": "translations/sv.json", // Svenska
		        "id": "translations/id.json", // Indonesian
		        "it": "translations/it.json", // Italian
		        "zh-cn": "translations/zh-cn.json", // Simplified Chinese
		        "zh-tw": "translations/zh-tw.json", // Traditional Chinese
		        "ja": "translations/ja.json", // Japanese
		        "pl": "translations/pl.json", // Polish
		        "gr": "translations/gr.json", // Greek
		        "da": "translations/da.json", // Danish
		        "tr": "translations/tr.json", // Turkish
		        "ru": "translations/ru.json", // Russian
		        "af": "translations/af.json", // Afrikaans
		        "hu": "translations/hu.json", // Hungarian
		        "is": "translations/is.json", // Icelandic
		        "et": "translations/et.json", // Estonian
		        "kr": "translations/kr.json", // Korean
		        "ro": "translations/ro.json", // Romanian
		        "cy": "translations/cy.json", // Welsh (Cymraeg)
		        "bg": "translations/bg.json", // Bulgarian
		        "cs": "translations/cs.json", // Czech
		        "hr": "translations/hr.json", // Croatian
		        "sk": "translations/sk.json", // Slovak
		        "tlh": "translations/tlh.json", // Klingon
		        "ms-my": "translations/ms-my.json", // Malay
		        "he": "translations/he.json", // Hebrew
		        "uk": "translations/uk.json" // Ukrainian
		};
	},

	// Override getHeader method.
	getHeader: function() {
		if (this.config.appendLocationNameToHeader && this.data.header !== undefined && this.weatherProvider) {
			return this.data.header + " " + this.weatherProvider.fetchedLocation();
		}

		return this.data.header;
	},

	// Start the weather module.
	start: function () {
		moment.locale(this.config.lang);

		// Initialize the weather provider.
		this.weatherProvider = WeatherProvider.initialize(this.config.weatherProvider, this);

		// Let the weather provider know we are starting.
		this.weatherProvider.start();

		// Add custom filters
		this.addFilters();

		// Schedule the first update.
		this.scheduleUpdate(this.config.initialLoadDelay);
	},

	// Override notification handler.
	notificationReceived: function(notification, payload, sender) {
		if (notification === "CALENDAR_EVENTS") {
			var senderClasses = sender.data.classes.toLowerCase().split(" ");
			if (senderClasses.indexOf(this.config.calendarClass.toLowerCase()) !== -1) {
				this.firstEvent = false;

				for (var e in payload) {
					var event = payload[e];
					if (event.location || event.geo) {
						this.firstEvent = event;
						//Log.log("First upcoming event with location: ", event);
						break;
					}
				}
			}
		} else if (notification === "INDOOR_TEMPERATURE") {
			this.indoorTemperature = this.roundValue(payload);
			this.updateDom(300);
		} else if (notification === "INDOOR_HUMIDITY") {
			this.indoorHumidity = this.roundValue(payload);
			this.updateDom(300);
		}
	},

	// Override socket notification handler
	socketNotificationReceived(notification, payload) {
		if(this.weatherProvider.socketNotificationReceived) {
			if(this.weatherProvider.socketNotificationReceived(notification, payload)) {
				// Provider handled notification
				return;
			}
		}
	},

	// Select the template depending on the display type.
	getTemplate: function () {
		return `${this.config.type.toLowerCase()}.njk`;
	},

	// Add all the data to the template.
	getTemplateData: function () {
		return {
			config: this.config,
			current: this.weatherProvider.currentWeather(),
			forecast: this.weatherProvider.weatherForecast(),
			indoor: {
				humidity: this.indoorHumidity,
				temperature: this.indoorTemperature
			}
		};
	},

	// What to do when the weather provider has new information available?
	updateAvailable: function() {
		Log.log("New weather information available.");
		this.updateDom(0);
		this.scheduleUpdate();
	},

	scheduleUpdate: function(delay = null) {
		var nextLoad = this.config.updateInterval;
		if (delay !== null && delay >= 0) {
			nextLoad = delay;
		}

		setTimeout(() => {
			if (this.config.type === "forecast") {
				this.weatherProvider.fetchWeatherForecast();
			} else {
				this.weatherProvider.fetchCurrentWeather();
			}
		}, nextLoad);
	},

	roundValue: function(temperature) {
		var decimals = this.config.roundTemp ? 0 : 1;
		return parseFloat(temperature).toFixed(decimals);
	},

	addFilters() {
		this.nunjucksEnvironment().addFilter("formatTime", function(date) {
			date = moment(date);

			if (this.config.timeFormat !== 24) {
				if (this.config.showPeriod) {
					if (this.config.showPeriodUpper) {
						return date.format("h:mm A");
					} else {
						return date.format("h:mm a");
					}
				} else {
					return date.format("h:mm");
				}
			}

			return date.format("HH:mm");
		}.bind(this));

		this.nunjucksEnvironment().addFilter("unit", function (value, type) {
			if (type === "temperature") {
				if (this.config.tempUnits === "metric" || this.config.tempUnits === "imperial") {
					value += "°";
				}
				if (this.config.degreeLabel) {
					if (this.config.tempUnits === "metric") {
						value += "C";
					} else if (this.config.tempUnits === "imperial") {
						value += "F";
					} else {
						value += "K";
					}
				}
			} else if (type === "precip") {
				if (isNaN(value) || value === 0 || value.toFixed(2) === "0.00") {
					value = "";
				} else {
				    if (this.config.weatherProvider.includes("ukmetoffice")) {
						value += "%";
				    } else {
						value = `${value.toFixed(2)} ${this.config.units === "imperial" ? "in" : "mm"}`;
				    }
				}
			} else if (type === "humidity") {
				value += "%";
			}

			return value;
		}.bind(this));

		this.nunjucksEnvironment().addFilter("roundValue", function(value) {
			return this.roundValue(value);
		}.bind(this));

		this.nunjucksEnvironment().addFilter("decimalSymbol", function(value) {
			return value.toString().replace(/\./g, this.config.decimalSymbol);
		}.bind(this));

		this.nunjucksEnvironment().addFilter("calcNumSteps", function(forecast) {
			return Math.min(forecast.length, this.config.maxNumberOfDays);
		}.bind(this));

		this.nunjucksEnvironment().addFilter("opacity", function(currentStep, numSteps) {
			if (this.config.fade && this.config.fadePoint < 1) {
				if (this.config.fadePoint < 0) {
					this.config.fadePoint = 0;
				}
				var startingPoint = numSteps * this.config.fadePoint;
				var numFadesteps = numSteps - startingPoint;
				if (currentStep >= startingPoint) {
					return 1 - (currentStep - startingPoint) / numFadesteps;
				} else {
					return 1;
				}
			} else {
				return 1;
			}
		}.bind(this));
	}
});
