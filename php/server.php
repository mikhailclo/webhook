<?php

/**
 * Handles errors by logging the error message.
 * @param string $error The error message to log.
 */
function errorHandler(string $error): void
{
    error_log("errorHandler: " . $error);
}

/**
 * Checks if the request method is POST.
 * @param array $server The server array from $_SERVER.
 * @return bool True if the method is POST, false otherwise.
 */
function isPostMethod(array $server): bool
{
    return $server['REQUEST_METHOD'] === 'POST';
}

/**
 * Checks if the request contains multipart/form-data.
 * @param array $server The server array from $_SERVER.
 * @return bool True if the content-type is multipart/form-data, false otherwise.
 */
function isMultipartFormData(array $server): bool
{
    return strpos($server['CONTENT_TYPE'], 'multipart/form-data') !== false;
}

/**
 * Processes the form data from the request.
 * @param array $post The post data from $_POST.
 * @param array $files The files data from $_FILES.
 * @return void
 */
function processFormData(array $post, array $files): void
{
    $status = $post['status'];
    $idGen = $post['id_gen'];
    $timeGen = $post['time_gen'];
    $resImage = $files['res_image'];
    error_log("processFormData: Status: $status, ID: $idGen, Time: $timeGen");

    try {
        if ($status !== '200') {
            $imgMessage = $post['img_message'];
            throw new Exception($imgMessage);
        } else if (!isset($resImage) || $resImage['error'] !== UPLOAD_ERR_OK) {
            throw new Exception('resImage is not a file');
        }

        move_uploaded_file($resImage['tmp_name'], 'resImage.png');

        error_log("processFormData: ID: $idGen, Time: $timeGen");
    } catch (Exception $e) {
        errorHandler($e->getMessage());
    }
}

/**
 * Main handler function for the webhook endpoint.
 * @param array $server The server array from $_SERVER.
 * @param array $post The post data from $_POST.
 * @param array $files The files data from $_FILES.
 * @return void
 */
function handleWebhook(array $server, array $post, array $files): void
{
    if (!isPostMethod($server)) {
        http_response_code(405);
        echo "Method Not Allowed";
        return;
    } else if (!isMultipartFormData($server)) {
        http_response_code(400);
        echo "Bad Request";
        return;
    }

    processFormData($post, $files);
    http_response_code(200);
    echo "OK";
}

/**
 * Main handler for the server.
 * @param array $server The server array from $_SERVER.
 * @param array $post The post data from $_POST.
 * @param array $files The files data from $_FILES.
 * @return void
 */
function fetchHandler(array $server, array $post, array $files): void
{
    $urlPath = parse_url($server['REQUEST_URI'], PHP_URL_PATH);

    if ($urlPath === '/webhook') {
        handleWebhook($server, $post, $files);
    } else {
        http_response_code(404);
        echo "Not Found";
    }
}

// Start the server
fetchHandler($_SERVER, $_POST, $_FILES);
