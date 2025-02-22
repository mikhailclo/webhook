<?php

require 'vendor/autoload.php';

$dotenv = Dotenv\Dotenv::createImmutable(__DIR__);
$dotenv->load();

/**
 * Configuration variables.
 *
 * Ensure you have set the API_KEY in your environment variables.
 * For example, in a UNIX-based system you can export the variable:
 *   export API_KEY="YOUR_KEY"
 */
$imagePath = '../image.jpeg';
$apiUrl    = 'https://public-api.clothoff.net/undress';
$apiKey    = $_ENV['API_KEY'];

if (!$apiKey) {
    throw new Exception("API_KEY environment variable is not set.");
}

/**
 * Associative array for CURLOPT_POSTFIELDS.
 * You can add any key-value pairs as needed.
 */
$postFields = [
    // 'image' can be either a path to the file or a CURLFile instance.
    'image'   => new CURLFile($imagePath),
    'webhook' => 'https://webhook.site',
    'id_gen'  => 'UNIQ ID',
    'cloth'   => 'naked',
    // Additional parameters can be added here.
];

/**
 * Sends an image to the API with arbitrary POST fields.
 *
 * This function initializes a cURL session to POST data to the API endpoint.
 * It accepts an associative array of post fields, allowing for flexible parameters.
 * If an 'image' key is provided as a string (file path), it checks for file existence.
 *
 * @param string $apiUrl     The API endpoint URL.
 * @param array  $postFields Associative array of POST data for the API.
 * @param string $apiKey     API key for authentication.
 *
 * @return string API response.
 *
 * @throws Exception If the file does not exist, if a cURL error occurs,
 *                   or if the API returns a non-200 HTTP code.
 */
function sendImageToAPI($apiUrl, array $postFields, $apiKey)
{
    // If 'image' is set as a string (file path), verify that the file exists.
    if (isset($postFields['image']) && is_string($postFields['image']) && !file_exists($postFields['image'])) {
        throw new Exception("Image not found: " . $postFields['image']);
    }

    $curl = curl_init();

    curl_setopt_array($curl, [
        CURLOPT_URL            => $apiUrl,
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_ENCODING       => '',
        CURLOPT_MAXREDIRS      => 10,
        CURLOPT_TIMEOUT        => 30,
        CURLOPT_FOLLOWLOCATION => true,
        CURLOPT_HTTP_VERSION   => CURL_HTTP_VERSION_1_1,
        CURLOPT_CUSTOMREQUEST  => 'POST',
        // Pass any data provided in the $postFields array.
        CURLOPT_POSTFIELDS     => $postFields,
        CURLOPT_HTTPHEADER     => [
            "x-api-key: $apiKey",
        ],
    ]);

    $response  = curl_exec($curl);
    $httpCode  = curl_getinfo($curl, CURLINFO_HTTP_CODE);
    $curlError = curl_error($curl);

    curl_close($curl);

    if ($curlError) {
        throw new Exception("cURL error: $curlError");
    }

    if ($httpCode !== 200) {
        throw new Exception("API error. Code: $httpCode, Response: $response");
    }

    return $response;
}

try {
    $response = sendImageToAPI($apiUrl, $postFields, $apiKey);
    echo "API Success: $response";
} catch (Exception $e) {
    echo "Error: " . $e->getMessage();
}
