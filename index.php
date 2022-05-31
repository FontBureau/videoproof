<?php

switch (@parse_url($_SERVER['REQUEST_URI'])['path']) {
    case '/':
        readfile('index.html');
        break;
    case '/legacy.php':
        require 'legacy.php';
        break;
    default:
        http_response_code(404);
        exit('Not Found');
}
