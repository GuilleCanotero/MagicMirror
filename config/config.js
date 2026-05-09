/* Config Sample
 *
 * For more information on how you can configure this file
 * see https://docs.magicmirror.builders/configuration/introduction.html
 * and https://docs.magicmirror.builders/modules/configuration.html
 *
 * You can use environment variables using a `config.js.template` file instead of `config.js`
 * which will be converted to `config.js` while starting. For more information
 * see https://docs.magicmirror.builders/configuration/introduction.html#enviromnent-variables
 */
let config = {
	address: "localhost",	// Address to listen on, can be:
							// - "localhost", "127.0.0.1", "::1" to listen on loopback interface
							// - another specific IPv4/6 to listen on a specific interface
							// - "0.0.0.0", "::" to listen on any interface
							// Default, when address config is left out or empty, is "localhost"
	port: 8080,
	basePath: "/",	// The URL path where MagicMirror² is hosted. If you are using a Reverse proxy
									// you must set the sub path here. basePath must end with a /
	ipWhitelist: ["127.0.0.1", "::ffff:127.0.0.1", "::1"],	// Set [] to allow all IP addresses
									// or add a specific IPv4 of 192.168.1.5 :
									// ["127.0.0.1", "::ffff:127.0.0.1", "::1", "::ffff:192.168.1.5"],
									// or IPv4 range of 192.168.3.0 --> 192.168.3.15 use CIDR format :
									// ["127.0.0.1", "::ffff:127.0.0.1", "::1", "::ffff:192.168.3.0/28"],

	useHttps: false,			// Support HTTPS or not, default "false" will use HTTP
	httpsPrivateKey: "",	// HTTPS private key path, only require when useHttps is true
	httpsCertificate: "",	// HTTPS Certificate path, only require when useHttps is true

	language: "en",
	locale: "en-US",   // this variable is provided as a consistent location
			   // it is currently only used by 3rd party modules. no MagicMirror code uses this value
			   // as we have no usage, we  have no constraints on what this field holds
			   // see https://en.wikipedia.org/wiki/Locale_(computer_software) for the possibilities

	logLevel: ["INFO", "LOG", "WARN", "ERROR"], // Add "DEBUG" for even more logging
	timeFormat: 24,
	units: "metric",

	modules: [
		{
			module: "alert",
		},
		{
			module: "updatenotification",
			position: "top_bar"
		},
		// Test the vault module. Fetchs a secret from kv
		{
			module: "MMM-hcvault",
			// debug lines to check the connection to vault
			header: "myVault",
			position: "top_right",
			config: {
				vaultAddr: "https://127.0.0.1:8200",
				authMethod: "approle",
				roleIdPath: "/etc/magicmirror/vault/role_id",
				secretIdPath: "/etc/magicmirror/vault/secret_id",
				secretPath: "secret/data/magicmirror/test", 
				spotifySecretPath: "secret/data/magicmirror/spotify",
				refreshIntervalMs: 10000,
			}
		},

		{
			module: "clock",
			position: "middle_center",
			config: {
				displayType: "digital",
				showWeek: true,
				/*showSunTimes: true,*/
			}
		},
		{
			module: "calendar",
			header: "German Holidays",
			position: "top_left",
			config: {
				
				// uncomment this if you want to show the last events
				pastDaysCount: 2,
				broadcastPastEvents: true,
				
				showLocation: true,
				maximumEntries: 10,
				calendars: [
					{
						fetchInterval: 7 * 24 * 60 * 60 * 1000,
						symbol: "globe",
						url: "https://www.ferienwiki.de/exports/feiertage/2026/de"
					},
					{
						fetchInterval: 7 * 24 * 60 * 60 * 1000,
						symbol: "calendar-check",
						url: "https://www.ferienwiki.de/exports/ferien/2026/de/hessen"
					},
					/*{
						symbol: ["calendar"],
						url: "webcal://calendar.google.com/calendar/ical/canedo.guille%40gmail.com/public/basic.ics",
						showLocation: true
					}*/
				]
			}
		},

		{
			module: "calendar",
			header: "Hesse Holidays",
			position: "top_left",
			config: {
				maximumEntries: 2,
				calendars: [
					{
						fetchInterval: 7 * 24 * 60 * 60 * 1000,
						symbol: "calendar-check",
						url: "https://www.ferienwiki.de/exports/ferien/2026/de/hessen"
					}
				]
			}
		},
		{
			module: "calendar",
			header: "My Google Calendar",
			position: "top_left",
			config: {
				maxLocationTitleLength: 10,
				wrapEvents: true,
				maximumEntries: 5,
				calendars: [
					{
						symbol: ["calendar"],
						url: "webcal://calendar.google.com/calendar/ical/canedo.guille%40gmail.com/public/basic.ics",
						showLocation: true
					}
				]
			}
		},

		{
			  module: "MMM-PublicTransportHafas",
			  position: "bottom_left",
			  
			  config: {
				updatesEvery: 30,
				stationID: "124681",                   // Replace with your stationID!
				stationName: "Taunusplatz, DA",   // Replace with your station name!
			  
				direction: "",                    // Show only departures heading to this station. (A station ID.)
				ignoredLines: [],                 // Which lines should be ignored? (comma-separated list of line names)
				excludedTransportationTypes: [],  // Which transportation types should not b	e shown on the mirror? (comma-separated list of types) possible values: StN for tram, BuN for bus, s for suburban
				timeToStation: 2,                // How long do you need to walk to the next Station?

				showColoredLineSymbols: true,     // Want colored line symbols?
				useColorForRealtimeInfo: true,    // Want colored real time information (timeToStation, early)?
				showTableHeadersAsSymbols: true,  // Table Headers as symbols or text?
				maxUnreachableDepartures: 1,      // How many unreachable departures should be shown?
				maxReachableDepartures: 3,        // How many reachable departures should be shown?
				customLineStyles: "Hello",             // Prefix for the name of the custom css file. ex: Leipzig-lines.css (case sensitive)
				showOnlyLineNumbers: false        // Display only the line number instead of the complete name, i. e. "11" instead of "STR 11"
			  }
		},
				{
			  module: "MMM-PublicTransportHafas",
			  position: "bottom_left",
			  
			  config: {
				updatesEvery: 30,
				stationID: "124428",                   // Replace with your stationID!
				stationName: "Lucasweg/Hochzeitsturm, DA",   // Replace with your station name!
			  
				direction: "",                    // Show only departures heading to this station. (A station ID.)
				ignoredLines: [],                 // Which lines should be ignored? (comma-separated list of line names)
				excludedTransportationTypes: [],  // Which transportation types should not b	e shown on the mirror? (comma-separated list of types) possible values: StN for tram, BuN for bus, s for suburban
				timeToStation: 2,                // How long do you need to walk to the next Station?

				showColoredLineSymbols: true,     // Want colored line symbols?
				useColorForRealtimeInfo: true,    // Want colored real time information (timeToStation, early)?
				showTableHeadersAsSymbols: true,  // Table Headers as symbols or text?
				maxUnreachableDepartures: 1,      // How many unreachable departures should be shown?
				maxReachableDepartures: 3,        // How many reachable departures should be shown?
				customLineStyles: "Hello",             // Prefix for the name of the custom css file. ex: Leipzig-lines.css (case sensitive)
				showOnlyLineNumbers: false        // Display only the line number instead of the complete name, i. e. "11" instead of "STR 11"
			  }
		},
/*		{
			// https://github.com/Klizzy/MMM-Vrr
			module: 'MMM-Vrr',
			header: "Taunusplatz",
			position: "bottom_left",
			config: {
				city: 'Darmstadt',
				station: 'Taunusplatz',
				numberOfResults: 5,
				displayTimeOption: 'countdown',
				displayType: 'detail'
			},
		},
		{
			// https://github.com/Klizzy/MMM-Vrr
			module: 'MMM-Vrr',
			header: "Lucasweg/Hochzeitsturm",
			position: "bottom_left",
			config: {
				city: 'Darmstadt',
				station: 'Lucasweg/Hochzeitsturm',
				numberOfResults: 5,
				displayTimeOption: 'countdown',
				displayType: 'detail'
			}
		},
*/
		/*{
			module: "compliments",
			position: "lower_third"
		},*/
		{
			module: "weather",
			position: "top_right",
			config: {
				weatherProvider: "openmeteo",
				type: "current",
				location: "DA",
				//locationID: "2938913", //ID from http://bulk.openweathermap.org/sample/city.list.json.gz; unzip the gz file and find your city
				
			}
		},
		{
			module: "weather",
			position: "top_right",
			header: "Weather Forecast",
			config: {
				weatherProvider: "openmeteo",
				type: "forecast",
				lat: 49.8728,
				lon: 8.6512
				
			}
		},
		{
			module: "newsfeed",
			position: "bottom_bar",
			config: {
				feeds: [
					//{
					//	title: "New York Times",
					//	url: "https://rss.nytimes.com/services/xml/rss/nyt/HomePage.xml"
					//},
					{
						title: "N-TV Nachrichten",
						url: "https://n-tv.de/rss"
					},
					{
						title: "Spiegel",
						url: "https://www.spiegel.de/schlagzeilen/tops/index.rss"						
					},
										{
						title: "Spiegel-Wissenschaft",
						url: "https://www.spiegel.de/wissenschaft/index.rss"						
					},
					{
						title: "El Pais",
						url: "https://feeds.elpais.com/mrss-s/pages/ep/site/elpais.com/portada"
					}
				],
				showSourceTitle: true,
				showPublishDate: true,
				broadcastNewsFeeds: true,
				broadcastNewsUpdates: true
			}
		},
		{
		  module: "MMM-NowPlayingOnSpotify",
		  position: "bottom_right",
		  config: {
//		    showCoverArt: false,
		 }
			
		},
		// config/config.js — no secrets here, only addresses and paths
	]
};

/*************** DO NOT EDIT THE LINE BELOW ***************/
if (typeof module !== "undefined") { module.exports = config; }
