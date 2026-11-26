<?php
defined('BASEPATH') OR exit('No direct script access allowed');

$route['default_controller'] = 'api/health';
$route['404_override'] = '';
$route['translate_uri_dashes'] = FALSE;

$route['api/health'] = 'api/health';
$route['api/admin/login'] = 'api/login';
$route['api/admin/session'] = 'api/session_status';
$route['api/admin/logout'] = 'api/logout';
$route['api/public/site'] = 'api/site';
$route['api/public/content'] = 'api/public_content';
$route['api/public/contact'] = 'api/contact';
$route['api/public/download/(:num)'] = 'api/download/$1';
$route['api/admin/dashboard'] = 'api/dashboard';
$route['api/admin/portfolio'] = 'api/portfolio';
$route['api/admin/preview'] = 'api/preview';
$route['api/admin/content'] = 'api/content';
$route['api/admin/content/(:num)'] = 'api/content_item/$1';
$route['api/admin/categories'] = 'api/categories';
$route['api/admin/design'] = 'api/design';
$route['api/admin/design/reset'] = 'api/reset_design';
$route['api/admin/publish'] = 'api/publish';
$route['api/admin/messages'] = 'api/messages';
$route['api/admin/messages/(:num)/read'] = 'api/read_message/$1';
$route['api/admin/upload'] = 'api/upload';
$route['api/admin/media'] = 'api/media';
$route['api/admin/media/(:num)'] = 'api/media_item/$1';
$route['setup/install'] = 'setup/install';
