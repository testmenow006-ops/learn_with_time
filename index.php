<?php

if (PHP_SAPI === 'cli-server') {
    $staticPath = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
    if ($staticPath && $staticPath !== '/') {
        if (preg_match('#(?:^|/)\.#', $staticPath)
            || preg_match('#^/(?:application(?:/|$)|vendor(?:/|$)|migrations(?:/|$)|node_modules(?:/|$)|src(?:/|$)|dist(?:/|$)|composer\.(?:json|lock)$|package(?:-lock)?\.json$|README\.md$)#i', $staticPath)) {
            http_response_code(404);
            exit;
        }
        $staticFile = realpath(__DIR__ . '/' . ltrim($staticPath, '/'));
        $projectRoot = realpath(__DIR__);
        if ($staticFile && $projectRoot && strpos($staticFile, $projectRoot . DIRECTORY_SEPARATOR) === 0 && is_file($staticFile)) {
            return false;
        }
    }
}

require_once __DIR__ . '/vendor/autoload.php';
Dotenv\Dotenv::createUnsafeImmutable(__DIR__)->safeLoad();

define('ENVIRONMENT', getenv('APP_ENV') === 'production' ? 'production' : 'development');
$sessionSecret = getenv('SESSION_SECRET') ?: '';
if (ENVIRONMENT === 'production' && strlen($sessionSecret) < 32) {
    http_response_code(500);
    exit("Set SESSION_SECRET to a random value of at least 32 characters before running in production.\n");
}
if (defined('STDIN')) {
    chdir(__DIR__);
}
$system_path = __DIR__ . '/vendor/codeigniter/framework/system';
$application_folder = __DIR__ . '/application';

define('SELF', pathinfo(__FILE__, PATHINFO_BASENAME));
define('BASEPATH', rtrim($system_path, '/\\') . DIRECTORY_SEPARATOR);
define('APPPATH', rtrim($application_folder, '/\\') . DIRECTORY_SEPARATOR);
define('FCPATH', __DIR__ . DIRECTORY_SEPARATOR);
define('SYSDIR', basename(BASEPATH));
define('VIEWPATH', (is_dir(APPPATH . 'views') ? APPPATH . 'views' : APPPATH) . DIRECTORY_SEPARATOR);

require_once BASEPATH . 'core/CodeIgniter.php';
