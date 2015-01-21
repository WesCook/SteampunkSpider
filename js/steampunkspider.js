// Constants
var countryCodes = ['us', 'ca', 'fr', 'uk', 'au', 'br']; // Country codes
var loopTimout = 50; // Time between thread heartbeats in milliseconds
var maxThreads = 3; // Max number of network threads to run

// Listen for button presses
$(document).ready(function()
{
	// Generate Data button
	$("#generate-data").click(generateData);

	// Select Markdown button
	$("#select-markdown").click(function()
	{
		$("#data-output").select(); // Select data output
	});
});

// "Main" function.  Gets data from form, parses into useful objects, and starts thread manager
function generateData()
{
	var inputData = getInputFromForm(); // Get text from form
	extractURLsIntoObject(inputData); // Turns URLs into object, and stores in steamInputData closure
	threadManager(); // Start threading program.  Will terminate when all threads are executed.
}

// Reads textarea into string data for later parsing
function getInputFromForm()
{
	// Logging
	console.log("Getting input from form.");

	// Get data from textarea and return
	var data = $("#data-input").val();

	// Add spinner glyph
	$("#generate-data-indicator").addClass("glyphicon glyphicon-refresh glyphicon-refresh-animate");

	return data;
}

// Takes string data and splits into array.  Then parses through that array for useful information (id, type) and puts into object
function extractURLsIntoObject(data)
{
	// Logging
	console.log("Extracting data into objects.");

	// Split string into URL list (array)
	var RawURLList = data.split("\n");

	// Clear out duplicate IDs
	var urlList = [];
	$.each(RawURLList, function(i, url) // Loop through raw list, run callback function against
	{
		if ($.inArray(url, urlList) === -1) // If not yet found in clean list
			urlList.push(url); // Add to list
		else
			console.log("%cDuplicate entry found: " + url, "color: red;"); // If duplicate found, report error to log
	});

	// Extract URL list into array (knows ID, Type (app/sub))
	var pattern = "(app|sub)/([0-9]+)";
	for (var i=0, len=urlList.length; i<len; i++) // Loop through URL list (outside array)
	{
		var result = urlList[i].match(pattern); // Check current URL against regex, try and extract ID and type
		if (undefined !== result && null !== result) // Error checking
		{
			// Get data
			var id = result[2];
			var type = result[1];

			// Loop through country codes (inside array) and append data to form and pcWiki closures
			for (var j=0, len2=countryCodes.length; j<len2; j++)
			{
				// Add to Steam Input Data
				steamInputData.append({
					id: id, // Get ID
					type: type, // Get type (app/sub)
					country: countryCodes[j], // Country code
					status: "unfetched" // All items are unfetched by default
				});
			}

			// Add to PC Wiki Input Data
			pcWikiInputData.append({
				id: id, // Get ID
				type: type, // Get type (app/sub)
				status: "unfetched" // All items are unfetched by default
			});
		}
		else // Error checking
			console.log("%cBad string match: " + urlList[i], "color: red;");
	}
}

// Manage threads for HTTP fetches.
// Javascript doesn't have real threading, but AJAX lets us fake it.
function threadManager()
{
	// Logging
	console.log("Starting thread manager.");

	// Start looping heartbeat
	var loop = function()
	{
		var steamAllFetched = false;
		var pcWikiAllFetched = false;

		if (threadData.getCurrentThreads() < maxThreads) //If current threads < max threads
		{
			// Try to start a Steam thread
			if (steamInputData.getAllFetched() === false)
				steamThreadStart();
			else
				steamAllFetched = true;

			// Try to start a PC Wiki thread
			if (pcWikiInputData.getAllFetched() === false)
				pcWikiThreadStart();
			else
				pcWikiAllFetched = true;
		}

		// Check if all entries are fetched, and end program if so
		if (steamAllFetched === true && pcWikiAllFetched === true )
			cleanUp();
		else // Otherwise, reset loop
			setTimeout(loop, loopTimout + threadData.getSteamPenalty()); // Updated loop time with any Steam penalties
	};
	loop(); // Start looping
}

// Registers a thread.  Pass it a URL, an object with any data in it, and a success and error callback
function threadCreate(url, data, callbackSuccess, callbackError)
{
	// Logging
	console.log("%cThread created with URL: " + url, "color: blue;");

	// Increment thread count
	threadData.threadAdd();

	// Load data.php and pass it the input data via POST
	// This could be swapped out for another script to remove the dependency on a web server
	// Pure JavaScript could not be used due to same-origin policy
	$.ajax({
		type: "POST",
		url: "php/fetch.php",
		data: {url: url},
		success: callbackSuccess,
		error: callbackError,
		complete: function() {threadData.threadRemove();}, // Thread complete, decrement count  TODO: Move generateTable() here?  Maybe with a small timer?
		dataType: "json",
		async: false, // Allow requests to be made asynchronously.  This can be disabled if it causes problems.
		dataObject: data
	});
}

// Loop through data and find first unfetched entry.  Pass to threadCreate() if found.
function steamThreadStart()
{
	// Refresh data from steamInputData
	var localSteamInputData = steamInputData.get();

	// Loop through URLs (outside array)
	for (var i=0, len=localSteamInputData.length; i<len; i++)
	{
		// Loop through country codes (inside array)
		for (var j=0, len2=countryCodes.length; j<len2; j++)
		{
			// Get data
			var currentData = localSteamInputData[i][countryCodes[j]];

			// Find first unfetched item (if any)
			if (currentData.status === "unfetched")
			{
				// Build Steam url
				if (currentData.type == "app")
					url = "http://store.steampowered.com/api/appdetails?appids=" + currentData.id + "&cc=" + currentData.country;
				else if (currentData.type == "sub")
					url = "http://store.steampowered.com/api/packagedetails?packageids=" + currentData.id + "&cc=" + currentData.country;

				// Mark thread as fetching
				steamInputData.setStatus(currentData.id, currentData.type, currentData.country, "fetching");

				// Create a thread with that data
				threadCreate(url, currentData, steamThreadSuccess, steamThreadError);

				// End loop (can't 'break 2' in JS, so we just set iterators to max value)
				i = len;
				j = len2;
			}
		}
	}
}

// If Steam lookup successful, register as "fetched" and pass data for extraction
function steamThreadSuccess(data)
{
	// Get data
	var slice = this.dataObject;

	// Logging
	console.log("%cSteam Thread " + slice.id + "/" + slice.country + " ended successfully.", "color: blue;");

	// Mark slice as fetched
	steamInputData.setStatus(slice.id, slice.type, slice.country, "fetched");

	// If there's any penalty, remove it
	threadData.removeSteamPenalty();

	// Pass data
	extractDataFromJSONSlice(data, slice.id, slice.type, slice.country); // Extract JSON into object
}

// If error, register as "unfetched" so it can be retried
function steamThreadError(jqxhr, textStatus, errorThrown)
{
	// Get data
	var slice = this.dataObject;

	// Logging
	console.log("%cSteam Thread " + slice.id + "/" + slice.country + " ended in failure.", "color: blue;");

	// Mark slice as unfetched, so it can be tried again by a future thread
	steamInputData.setStatus(slice.id, slice.type, slice.country, "unfetched");

	// Add 5 second penalty to Steam lookups every time an error is hit
	threadData.addSteamPenalty(5000);

	// Error log
	console.log("%cError fetching from Steam - likely IP blocked (" + textStatus + " : " + errorThrown + ")", "color: red;");
	console.log("Current Steam penalty is: " + threadData.getSteamPenalty() + "ms");
}

function pcWikiThreadStart()
{
	// Get data
	var localPcWikiInputData = pcWikiInputData.get();

	// Loop through PC Wiki entries
	for (var i=0, len=localPcWikiInputData.length; i<len; i++)
	{
		if (localPcWikiInputData[i].status === "unfetched")
		{
			// Build URL
			var url = "http://pcgamingwiki.com/w/api.php?action=askargs&conditions=Steam%20AppID::" + localPcWikiInputData[i].id + "&format=json";

			// Mark thread as fetching
			pcWikiInputData.setStatus(localPcWikiInputData[i].id, localPcWikiInputData[i].type, "fetching");

			// Create a thread with that data
			threadCreate(url, localPcWikiInputData[i], pcWikiThreadSuccess, pcWikiThreadError);

			// End loop
			break;
		}
	}
}

function pcWikiThreadSuccess(data)
{
	// Get data
	var slice = this.dataObject;
	var newData = {};

	// Logging
	console.log("%cPC Wiki Thread " + slice.id + " ended successfully.", "color: blue;");

	// Mark slice as fetched
	pcWikiInputData.setStatus(slice.id, slice.type, "fetched");

	// If valid entry found and of type "app" (PC Wiki doesn't support subs)
	if (data.query.results.length !== 0 && slice.type === "app")
	{
		var name = data.query.results[Object.keys(data.query.results)[0]].fulltext; // We don't know the name of the game at this stage, so we access its only property instead

		// Read JSON
		newData.id = slice.id;
		newData.type = slice.type;
		newData.exists = data.query.results[name].exists;
		newData.url = data.query.results[name].fullurl;

		// Add to data object
		pcWikiOutputData.append(newData);
	}
	else
	{
		// Send dummy data to avoid errors
		pcWikiOutputData.append({
			id: slice.id,
			type: slice.type,
			exists: false,
			url: ""
		});
	}

	// Pass on to next function, generating markdown code from full data object
	generateTable();
}

function pcWikiThreadError(jqxhr, textStatus, errorThrown)
{
	// Get data
	var slice = this.dataObject;

	// Logging
	console.log("%cPC Wiki Thread " + slice.id + " ended in failure.", "color: blue;");

	// Mark slice as unfetched, so it can be tried again by a future thread
	pcWikiInputData.setStatus(slice.id, slice.type, "unfetched");

	// Error log
	console.log("%cError fetching from PC Wiki (" + textStatus + " : " + errorThrown + ")", "color: red;");
}

// Extract returned data from JSON object, search for relevant information and add to complete steamOutputData
function extractDataFromJSONSlice(data, steamid, type, country)
{
	// Logging
	console.log("Data extracted from JSON slice.");

	// See if JSON response was successful
	var success = data[steamid].success;

	// JSON reports successful repsonse
	if (success === true)
	{
		// Build data slice from extracted JSON
		var steamDataSlice = {};
		var jsonData = data[steamid].data; // Get us up to the "data" part, for brevity

		// Basic
		steamDataSlice.id = steamid; // ID
		steamDataSlice.type = type; // Type
		steamDataSlice.country = country; // Country
		steamDataSlice.name = jsonData.name; // Name

		// Pricing
		if (type === "app")
		{
			steamDataSlice.discount = jsonData.package_groups[0].subs[0].percent_savings_text.substr(1); // Discount percentage
			steamDataSlice.price = jsonData.package_groups[0].subs[0].price_in_cents_with_discount; // Price
		}
		else if (type === "sub")
		{
			steamDataSlice.discount = jsonData.price.discount_percent + "%"; // Discount percentage
			steamDataSlice.price = jsonData.price.final; // Price
		}

		// Metacritic
		if (jsonData.metacritic)
		{
			steamDataSlice.metacritic_score = jsonData.metacritic.score;
			steamDataSlice.metacritic_url = jsonData.metacritic.url;
		}
		else
		{
			steamDataSlice.metacritic_score = "N/A";
			steamDataSlice.metacritic_url = "N/A";
		}

		// Platform
		steamDataSlice.platform_windows = jsonData.platforms.windows;
		steamDataSlice.platform_mac = jsonData.platforms.mac;
		steamDataSlice.platform_linux = jsonData.platforms.linux;

		// Trading Cards
		steamDataSlice.cards = "No";
		if (jsonData.categories)
		{
			var categories = jsonData.categories;
			for (var i=0, len=categories.length; i<len; i++)
			{
				if (categories[i].description === "Steam Trading Cards")
					steamDataSlice.cards = "Yes";
			}
		}

		// Add to data object
		steamOutputData.append(steamDataSlice);

		// Pass on to next function, generating markdown code from full data object
		generateTable();
	}
	else
	{
		// Send dummy data to avoid errors
		steamOutputData.append({
			id: steamid,
			type: type,
			country: country,
			price: "N/A",
			discount: "N/A",
			metacritic_score: "N/A",
			metacritic_url: "N/A",
			cards: "N/A"
		});

		// Steam request failed.  Page may not exist.
		console.log("%cSteam request " + steamid + "/" + country + " failed.", "color: red;");
	}
}

// Build Markdown table from steamOutputData.  This is called multiple times to show user progress.
function generateTable()
{
	// Logging
	console.log("Table generated.");

	// Get data from steamOutputData object
	// Note: There's a lot of duplication in steamOutputData, but we're using US-specific data for most of it.
	var data = steamOutputData.get();
	var pcWikiData = pcWikiOutputData.get();

	// Header
	output = "";
	output += "|Title|Disc.|$USD|$CAD|€EUR|£GBP|AU ($USD)|BRL$|Metascore|Platform|Cards|PCGW|\n";
	output += "|:-|-:|-:|-:|-:|-:|-:|-:|-:|:-:|:-:|:-:|\n";
	for (var i=0, len=data.length; i<len; i++)
	{
		if (undefined !== data[i].us) // We use US data for main output, so verify it's been fetched first
		{
			// Name/URL
			output += "|[" + data[i].us.name + "](http://store.steampowered.com/" + data[i].us.type + "/" + data[i].us.id + "/)|";

			// Discount
			output += data[i].us.discount + "|";

			// Price
			for (var j=0, len2=countryCodes.length; j<len2; j++)
			{
				if (undefined !== data[i][countryCodes[j]]) // Pricing data found for this country
				{
					var priceText = data[i][countryCodes[j]].price; // Get price
					priceText = String(priceText); // Convert to string
					if (priceText !== "N/A") // If price is valid
						output += priceText.slice(0, -2) + "." + priceText.slice(-2) + "|"; // Insert period two characters from the right.
					else
						output += priceText + "|"; // If error, just insert N/A
				}
				else // Pricing information isn't available for this country yet
					output += "?|";
			}

			// Metascore
			if (data[i].us.metacritic_score !== "N/A")
				output += "[" + data[i].us.metacritic_score + "]("+ data[i].us.metacritic_url +")|";
			else
				output += "N/A|";

			// Platform
			var platforms = "";
			if (data[i].us.platform_windows) platforms += "W/";
			if (data[i].us.platform_mac) platforms += "M/";
			if (data[i].us.platform_linux) platforms += "L/";
			output += platforms.slice(0, -1) + "|";

			// Cards
			output += data[i].us.cards + "|";

			// Loop through PC Wiki data
			for (var k=0, len3=pcWikiData.length; k<len3; k++)
			{
				if (pcWikiData[k].id === data[i].us.id && pcWikiData[k].type === data[i].us.type) // If iterated ID matches current outputting ID and type
				{
					if (pcWikiData[k].exists) // And iterated ID "exists"
						output += "[Yes](" + pcWikiData[k].url + ")|"; // Output exists with URL
					else
						output += "No|"; // Output doesn't exist
				}
			}

			// New line
			output += "\n";
		}
	}

	// Pass on to next function, output data to page
	returnOutput(output);
}

// Outputs data to form, as delivered from generateTable().
function returnOutput(data)
{
	// Logging
	console.log("Output returned.");

	// Output
	$("#data-output").html(data); // Replace HTML with data output
	$("#data-output-wrapper").removeClass("hidden"); // Reveal data output (if not already)
}

// Clean up program by updating DOM and clearing closures of data.
function cleanUp()
{
	// Logging
	console.log("Ending thread manager.  Outputting final data:");

	// Final data output
	console.log("%cSteam Input Data", "color: #A86C00;");
	console.log(steamInputData.get());
	console.log("%cSteam Output Data", "color: #A86C00;");
	console.log(steamOutputData.get());
	console.log("%cPC Wiki Input Data", "color: #A86C00;");
	console.log(pcWikiInputData.get());
	console.log("%cPC Wiki Output Data", "color: #A86C00;");
	console.log(pcWikiOutputData.get());

	// Reset closure data back to default
	steamInputData.reset();
	steamOutputData.reset();
	pcWikiInputData.reset();
	pcWikiOutputData.reset();
	threadData.reset();

	// Update UI
	$("#generate-data").removeClass("btn-primary"); // Make Generate Table button non-primary
	$("#generate-data").addClass("btn-default"); // And add back default class
	$("#generate-data-indicator").removeClass("glyphicon glyphicon-refresh glyphicon-refresh-animate"); // Remove spinner
}

// Send the user a status message such as errors.
function statusMessage(msg)
{
	// Set HTML to text, and update class for fade transition
	if (msg !== "")
	{
		$("#status").html(msg);
		$("#status").addClass("load");
	}
	else
	{
		setTimeout(1000, function(){$("#status").html(msg);}); // On a timer, so fade out has time to be fancy
		$("#status").removeClass("load");
	}
}

// Set up closure to store/manage form (input) data
// Data structure mimicks steamOutputData. eg:
// steamInputData = [
// 	[{us: {id, type, country, fetched}, ca: {id, type, country, fetched}],
// 	[{us: {id, type, country, fetched}, ca: {id, type, country, fetched}]
// ]
// steamInputData[url].us.id

var steamInputData = (function()
{
	var data = [];
	var methodList =
	{
		get: function()
		{
			// Return complete data array
			return data;
		},
		append: function(dataSlice)
		{
			// This method will read a simple data object (dataSlice) and put it into the correct format for steamInputData.

			// Will append data to existing array, or create new array if necessary
			var foundObject = false;
			for (var i=0, len=data.length; i<len; i++) // Loop through data array
			{
				for (var j=0, len2=countryCodes.length; j<len2; j++) // Loop through countries
				{
					if (undefined !== data[i][countryCodes[j]]) // If array even exists
					{
						if (data[i][countryCodes[j]].id === dataSlice.id && data[i][countryCodes[j]].type === dataSlice.type) // If ID matches any country in array, and type matches, we found the right array
						{
							foundObject = true;
							data[i][dataSlice.country] = dataSlice; // Add data to the object to the array
						}
					}
				}
			}

			// Create array if non-existant and push in data
			if (!foundObject)
			{
				var newObj = {}; // Create empty object
				newObj[dataSlice.country] = dataSlice; // Put data slice object into country object
				data.push(newObj); // Push container array and data back into main data array
			}
		},
		setStatus: function(id, type, country, status)
		{
			for (var i=0, len=data.length; i<len; i++) // Loop through urls
				for (var j=0, len2=countryCodes.length; j<len2; j++) // Loop through countries
					if (id === data[i][countryCodes[j]].id && country === data[i][countryCodes[j]].country && type === data[i][countryCodes[j]].type) // If ID, type, and country match
						data[i][countryCodes[j]].status = status; // Update status
		},
		getAllFetched: function()
		{
			// Loop through all entries, return true if all are fetched
			for (var i=0, len=data.length; i<len; i++) // Loop through urls
				for (var j=0, len2=countryCodes.length; j<len2; j++) // Loop through countries
					if (data[i][countryCodes[j]].status !== "fetched")
						return false;
			return true;
		},
		reset: function()
		{
			// Clear data from array
			data = [];
		}
	};

	// Methods to expose this data.
	return methodList;
}());

// Set up closure to store/manage Steam (output) data
var steamOutputData = (function()
{
	var data = [];
	var methodList =
	{
		get: function()
		{
			// Return complete data array
			return data;
		},
		append: function(dataSlice)
		{
			// This method will read a simple data object (dataSlice) and put it into the correct format for steamInputData.

			// Will append data to existing array, or create new array if necessary
			var foundObject = false;
			for (var i=0, len=data.length; i<len; i++) // Loop through data array
			{
				for (var j=0, len2=countryCodes.length; j<len2; j++) // Loop through countries
				{
					if (undefined !== data[i][countryCodes[j]]) // If array even exists
					{
						if (data[i][countryCodes[j]].id === dataSlice.id && data[i][countryCodes[j]].type === dataSlice.type) // If ID matches any country in array, and type matches, we found the right array
						{
							foundObject = true;
							data[i][dataSlice.country] = dataSlice; // Add data to the object to the array
						}
					}
				}
			}

			// Create array if non-existant and push in data
			if (!foundObject)
			{
				var newObj = {}; // Create empty object
				newObj[dataSlice.country] = dataSlice; // Put data slice object into country object
				data.push(newObj); // Push container array and data back into main data array
			}
		},
		reset: function()
		{
			// Clear data from array
			data = [];
		}
	};

	// Methods to expose this data.
	return methodList;
}());

// Set up closure to store/manage PC Wiki data
var pcWikiInputData = (function()
{
	var data = [];
	var methodList =
	{
		get: function()
		{
			// Return complete data array
			return data;
		},
		append: function(dataSlice)
		{
			// Push object into data array
			data.push(dataSlice);
		},
		setStatus: function(id, type, status)
		{
			for (var i=0, len=data.length; i<len; i++) // Loop through urls
				if (id === data[i].id && type === data[i].type) // If ID and type match
					data[i].status = status; // Update status
		},
		getAllFetched: function()
		{
			// Loop through all entries, return true if all are fetched
			for (var i=0, len=data.length; i<len; i++) // Loop through urls
				if (data[i].status !== "fetched")
					return false;
			return true;
		},
		reset: function()
		{
			// Clear data from array
			data = [];
		}
	};

	// Methods to expose this data.
	return methodList;
}());

// Set up closure to store/manage PC Wiki data
var pcWikiOutputData = (function()
{
	var data = [];
	var methodList =
	{
		get: function()
		{
			// Return complete data array
			return data;
		},
		append: function(dataSlice)
		{
			// Push object into data array
			data.push(dataSlice);
		},
		reset: function()
		{
			// Clear data from array
			data = [];
		}
	};

	// Methods to expose this data.
	return methodList;
}());

// Set up closure for threading data
var threadData = (function()
{
	var currentThreads = 0; // Currently running threads
	var steamPenalty = 0; // Time to add (in milliseconds) between thread executions/Steam lookups
	var methodList =
	{
		threadAdd: function()
		{
			currentThreads++;
		},
		threadRemove: function(dataSlice)
		{
			currentThreads--;
		},
		getCurrentThreads: function()
		{
			return currentThreads;
		},
		getSteamPenalty: function()
		{
			return steamPenalty;
		},
		addSteamPenalty: function(additionalPenalty)
		{
			statusMessage("We are being rate-limited by Steam.  This may take a few minutes to resolve.  Current penalty is: <mark class='highlight'>" + steamPenalty + "ms</mark>."); // Set status message
			steamPenalty += additionalPenalty;
		},
		removeSteamPenalty: function()
		{
			statusMessage(""); // Clear status message
			steamPenalty = 0;
		},
		reset: function()
		{
			currentThreads = 0;
			steamPenalty = 0;
		}
	};

	// Methods to expose this data.
	return methodList;
}());
