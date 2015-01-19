## Steampunk Spider ##

This is a utility to spider Steam's servers (ah, get it) for data, and then output it in reddit markdown.  It checks for regional pricing, metascore, trading cards, and PCGW support.

To use, simply paste any Steam URLs into the form - separated by line breaks - and press Generate Table.  You can see the progress as the table fills in below, and the spinning indicator will stop once it is complete.

As the HTTP lookups use AJAX, there is pseudo "threading" support.  Code will not execute at the same time, but multiple lookups can take place at the same time.  The number of threads to execute at once, and how often the heartbeat should update them is configurable.

This is written almost entirely in Javascript, except for a small amount of PHP to do lookups.  This is due to same-origin policy, which prevents lookups in JS if the server hasn't allowed it.

It was written for the /r/GameDeals community, but is free to use or take apart for any other use.  Licensed under MIT.  I'm fully open to pull requests, though would appreciate a heads up if you plan to make any sweeping changes first.

Enjoy.

### Changelog ###

v1.0.0 - 2015-01-18

* Initial release