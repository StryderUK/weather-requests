/* global WeatherProvider, WeatherObject */

/* Magic Mirror
 * Module: Weather
 *
 * By Malcolm Oakes https://github.com/maloakes
 * MIT Licensed.
 *
 * This class is a provider for UK Met Office Datapoint.
 */


WeatherProvider.register("ukmetoffice-datahub", {

	// Set the name of the provider.
	// This isn't strictly necessary, since it will fallback to the provider identifier
	// But for debugging (and future alerts) it would be nice to have the real name.
	providerName: "UK Met Office (DataHub)",

	units: {
		imperial: "us",
		metric: "si"
	},

	// Overwrite fetchData to use node_helper (avoid CORS issue)
	fetchData(url, headers, context) {
		this.delegate.sendSocketNotification("REQUEST", { 'url': url, 'method': 'GET', 'headers': headers, 'context': context});
	},

	// Overwrite the fetchCurrentWeather method.
	fetchCurrentWeather() {
		this.fetchData(this.getUrl("three-hourly"), this.getHeaders(), 'weather-current');
	},

	handleCurrentWeatherRequest(data) {
		if (!data || !data.features || !(data.features.length > 0) || !data.features[0].properties ||
		     !data.features[0].properties.location || !data.features[0].properties.location.name ||
		     !data.features[0].properties.timeSeries || !(data.features[0].properties.timeSeries.length > 0)) {
			// Did not receive usable new data.
			// Maybe this needs a better check?
			return;
		}

		this.setFetchedLocation(data.features[0].properties.location.name);

		const currentWeather = this.generateWeatherObjectFromCurrentWeather(data.features[0].properties.timeSeries);
		this.setCurrentWeather(currentWeather);
	},

	// Overwrite the fetchCurrentWeather method.
	fetchWeatherForecast() {
		this.fetchData(this.getUrl("daily"), this.getHeaders(), 'weather-forecast');
	},

	handleWeatherForecastRequest(data) {
		if (!data || !data.features || !(data.features.length > 0) || !data.features[0].properties ||
		     !data.features[0].properties.location || !data.features[0].properties.location.name ||
		     !data.features[0].properties.timeSeries || !(data.features[0].properties.timeSeries.length > 0)) {
			// Did not receive usable new data.
			// Maybe this needs a better check?
			return;
		}

		this.setFetchedLocation(data.features[0].properties.location.name);

		const forecast = this.generateWeatherObjectsFromForecast(data.features[0].properties.timeSeries);
		this.setWeatherForecast(forecast);
	},

	socketNotificationReceived(notification, payload) {
		if(notification.startsWith("REQUEST_") === true) {
			if (notification === 'REQUEST_OK') {
				if(payload.context) {
					if(payload.context === "weather-forecast" && payload.data) {
						this.handleWeatherForecastRequest(payload.data);
					} else if (payload.context == "weather-current" && payload.data) {
						this.handleCurrentWeatherRequest(payload.data);
					}
				}
			} else if (notificatuin === "REQUEST_ERROR") {
				Log.error("Could not load data ... ", request);
			}
			this.updateAvailable();

			// Notification handled
			return true;
		}

		// Notification not handled
		return false;
	},



	/** UK Met Office Specific Methods - These are not part of the default provider methods */
	/*
	 * Gets the complete url for the request
	 */
	getUrl(forecastType) {
		return this.config.apiBase + forecastType + this.getParams(forecastType);
	},

	/*
	 * Generate a WeatherObject based on currentWeatherInformation
	 */
	generateWeatherObjectFromCurrentWeather(currentWeatherData) {
		const currentWeather = new WeatherObject(this.config.units, this.config.tempUnits, this.config.windUnits);

		// loop round each of the (5) periods, look for today (the first period may be yesterday)
		for (i in currentWeatherData) {
			let periodDate = moment(currentWeatherData[i].time).utc();
			var diffHours = moment.utc().diff(periodDate, "hours", true);
			if (diffHours >= 0 && diffHours < 3) {
				// finally got the one we want, so populate weather object
				currentWeather.humidity = currentWeatherData[i].screenRelativeHumidity,
				currentWeather.temperature = this.convertTemp((currentWeatherData[i].maxScreenAirTemp + currentWeatherData[i].minScreenAirTemp) / 2);
				currentWeather.feelsLikeTemp = this.convertTemp(currentWeatherData[i].feelsLikeTemp);
				currentWeather.precipitation = parseInt(currentWeatherData[i].probOfPrecipitation);
				currentWeather.windSpeed = this.convertWindSpeed(currentWeatherData[i].windSpeed10m);
				currentWeather.windDirection = currentWeatherData[i].windDirectionFrom10m;
				currentWeather.weatherType = this.convertWeatherType(currentWeatherData[i].significantWeatherCode);
				break;
			}
		}

		// determine the sunrise/sunset times - not supplied in UK Met Office data
		let times = this.calcAstroData();
		currentWeather.sunrise = times[0];
		currentWeather.sunset = times[1];

		return currentWeather;
	},

	/*
	 * Generate WeatherObjects based on forecast information
	 */
	generateWeatherObjectsFromForecast(forecasts) {

		const days = [];

		// loop round the (5) periods getting the data
		// for each period array, Day is [0], Night is [1]
		for (i in forecasts) {
			const weather = new WeatherObject(this.config.units, this.config.tempUnits, this.config.windUnits);

			// data times are always UTC
			let periodDate = moment(forecasts[i].time).utc();

			// ignore if period is before today
			if (periodDate.isSameOrAfter(moment.utc().startOf("day"))) {
				// populate the weather object
				weather.date = periodDate;
				weather.minTemperature = this.convertTemp((forecasts[i].nightUpperBoundMinTemp + forecasts[i].nightLowerBoundMinTemp) / 2);
				weather.maxTemperature = this.convertTemp((forecasts[i].dayUpperBoundMaxTemp + forecasts[i].dayLowerBoundMaxTemp) / 2);
				weather.weatherType = this.convertWeatherType(forecasts[i].daySignificantWeatherCode);
				weather.precipitation = parseInt(Math.max(forecasts[i].dayProbabilityOfPrecipitation, forecasts[i].nightProbabilityOfPrecipitation));

				days.push(weather);
			}
		}

		return days;
	},

	/*
	 * calculate the astronomical data
	 */
	calcAstroData() {
		const sunTimes = [];

		// determine the sunrise/sunset times
		let times = SunCalc.getTimes(new Date(), this.config.latitude, this.config.longitude);
		sunTimes.push(moment(times.sunrise, "X"));
		sunTimes.push(moment(times.sunset, "X"));

		return sunTimes;
	},

	/*
	 * Convert the Met Office icons to a more usable name.
	 */
	convertWeatherType(weatherType) {
		const weatherTypes = {
			0: "night-clear",
			1: "day-sunny",
			2: "night-alt-cloudy",
			3: "day-cloudy",
			5: "fog",
			6: "fog",
			7: "cloudy",
			8: "cloud",
			9: "night-sprinkle",
			10: "day-sprinkle",
			11: "raindrops",
			12: "sprinkle",
			13: "night-alt-showers",
			14: "day-showers",
			15: "rain",
			16: "night-alt-sleet",
			17: "day-sleet",
			18: "sleet",
			19: "night-alt-hail",
			20: "day-hail",
			21: "hail",
			22: "night-alt-snow",
			23: "day-snow",
			24: "snow",
			25: "night-alt-snow",
			26: "day-snow",
			27: "snow",
			28: "night-alt-thunderstorm",
			29: "day-thunderstorm",
			30: "thunderstorm"
		};

		return weatherTypes.hasOwnProperty(weatherType) ? weatherTypes[weatherType] : null;
	},

	/*
	 * Convert temp (from degrees C) if required
	 */
	convertTemp(tempInC) {
		return this.tempUnits === "imperial" ? tempInC * 9 / 5 + 32 : tempInC;
	},

	/*
	 * Convert wind speed (from mph) if required
	 */
	convertWindSpeed(windInMph) {
		return this.windUnits === "metric" ? windInMph * 2.23694 : windInMph;
	},

	/*
	 * Convert the wind direction cardinal to value
	 */
	/*convertWindDirection(windDirection) {
		const windCardinals = {
			"N": 0,
			"NNE": 22,
			"NE": 45,
			"ENE": 67,
			"E": 90,
			"ESE": 112,
			"SE": 135,
			"SSE": 157,
			"S": 180,
			"SSW": 202,
			"SW": 225,
			"WSW": 247,
			"W": 270,
			"WNW": 292,
			"NW": 315,
			"NNW": 337
		};

		return windCardinals.hasOwnProperty(windDirection) ? windCardinals[windDirection] : null;
	},*/

	/*
	 * Generates an url with api parameters based on the config.
	 *
	 * return String - URL params.
	 */
	getParams(forecastType) {
		let params = "?";
		params += "excludeParameterMetadata=true";
		params += "&includeLocationName=true";
		params += "&latitude=" + this.config.longitude;
		params += "&longitude=" + this.config.latitude;

		return params;
	},

	getHeaders() {
		let headers = {
			"x-ibm-client-id": this.config.clientId,
			"x-ibm-client-secret": this.config.clientSecret,
			"accept": "application/json"
		};
		return headers;
	}
});
