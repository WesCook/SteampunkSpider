<?php

// Get URL from JavaScript
$url = (isset($_POST["url"]) ? $_POST["url"] : "");

// Error checking
if ($url === "")
	exit();

// cURL Steam
$ch = curl_init();
curl_setopt($ch, CURLOPT_URL, $url);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
$response = curl_exec($ch);

// Return JSON
echo $response;

?>
