<?php

// Get URL from JavaScript
$url = (isset($_POST["url"]) ? $_POST["url"] : "");

// Error checking
if ($url === "")
	exit();

// Site whitelist
$whitelist = array("store.steampowered.com", "pcgamingwiki.com");
$urlComponents = parse_url($url);
if (!in_array($urlComponents["host"], $whitelist))
	exit();

// cURL Website
$ch = curl_init();
curl_setopt($ch, CURLOPT_URL, $url);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
$response = curl_exec($ch);

// Return JSON
echo $response;

?>
