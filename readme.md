# Steampunk Spider

This is a utility to crawl Steam's servers for pricing data, and output it as a reddit table in markdown format.  It checks for regional pricing, metascore, trading cards, and PCGW support.

To use, simply paste any Steam URLs into the form - separated by line breaks - and press Generate Table.  You can see the progress as the table fills in below, and the spinning indicator will stop once it is complete.

This is written almost entirely in Javascript.  Due to same-origin policy however, the lookup function is written in PHP meaning a web server is required for installation.  If Steam enables CORS or JSONP support in the future, this limitation can be removed.

Steampunk Spider uses a threading system for the network requests to make the script as fast as possible.  If however Steam starts rate limiting you (there will be a notice and automatic-retry), the number of threads and heartbeat speed are configurable to mitigate this problem.

This tool was written with love for the /r/GameDeals community, but is free to use or take apart for any other use.  Licensed under MIT, open to pull requests.

Enjoy.

## Changelog

v1.2.0 - 2022-12-23
* Repairing PC Gaming Wiki fetches after API change

v1.1.1 - 2021-07-07
* Automatically escape right parenthesis in PC Gaming Wiki links

v1.1.0 - 2021-07-06
* Adding more-accurate method of price checking with fallback to original method
* Prices now use leading zeroes (ie. $0.59 instead of $.59)
* Removing Metacritic column due to inconsistent availability
* Status message clearing is now asynchronous
* Console now logs all status messages

v1.0.8 - 2019-12-26
* Repairing PCGW functionality
* Updating error messages
* Adding version string to footer
* Switching layout to flexbox
* Cleaning up CSS
* Updated to jQuery 3
* Removing IE9 polyfills

v1.0.7 - 2018-11-22
* Adding (now functional) AUD column

v1.0.6 - 2018-06-21
* Updating formatting to use icons for yes/no
* Removing AUD column

v1.0.5 - 2018-06-21
* Switching to secure links, resolving crawl errors

v1.0.4 - 2017-01-13
* Adding error detection to catch cases of incomplete Steam json data
* Updated jQuery/Bootstrap/html5shiv libraries

v1.0.3 - 2016-01-16
* Fixed PCGamingWiki detection
* Reworded status alert when rate-limiting
* Updated jQuery/Bootstrap libraries, removed unneeded files

v1.0.2 - 2015-05-11
* Made HTTP requests asynchronous again

v1.0.1 - 2015-01-20
* PC Gaming Wiki only shows for apps now, not subs
* Added site whitelist to PHP lookup
* Small HTML validation fix

v1.0.0 - 2015-01-18
* Initial release
