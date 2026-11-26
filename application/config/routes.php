<?php
defined('BASEPATH') OR exit('No direct script access allowed');

/*
| -------------------------------------------------------------------------
| URI ROUTING
| -------------------------------------------------------------------------
| This file lets you re-map URI requests to specific controller functions.
|
| Typically there is a one-to-one relationship between a URL string
| and its corresponding controller class/method. The segments in a
| URL normally follow this pattern:
|
|	example.com/class/method/id/
|
| In some instances, however, you may want to remap this relationship
| so that a different class/function is called than the one
| corresponding to the URL.
|
| Please see the user guide for complete details:
|
|	https://codeigniter.com/userguide3/general/routing.html
|
| -------------------------------------------------------------------------
| RESERVED ROUTES
| -------------------------------------------------------------------------
|
| There are three reserved routes:
|
|	$route['default_controller'] = 'welcome';
|
| This route indicates which controller class should be loaded if the
| URI contains no data. In the above example, the "welcome" class
| would be loaded.
|
|	$route['404_override'] = 'errors/page_missing';
|
| This route will tell the Router which controller/method to use if those
| provided in the URL cannot be matched to a valid route.
|
|	$route['translate_uri_dashes'] = FALSE;
|
| This is not exactly a route, but allows you to automatically route
| controller and method names that contain dashes. '-' isn't a valid
| class or method name character, so it requires translation.
| When you set this option to TRUE, it will replace ALL dashes in the
| controller and method URI segments.
|
| Examples:	my-controller/index	-> my_controller/index
|		my-controller/my-method	-> my_controller/my_method
*/


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
