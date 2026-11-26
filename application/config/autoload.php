<?php
defined('BASEPATH') OR exit('No direct script access allowed');

$autoload['packages'] = array();
$arguments = $_SERVER['argv'] ?? array();
$isInstallCommand = PHP_SAPI === 'cli'
    && ((isset($arguments[1]) && $arguments[1] === 'setup/install')
        || (isset($arguments[1], $arguments[2]) && $arguments[1] === 'setup' && $arguments[2] === 'install'));
$autoload['libraries'] = $isInstallCommand ? array('database') : array('database', 'session');
$autoload['drivers'] = array();
$autoload['helper'] = array('url');
$autoload['config'] = array();
$autoload['language'] = array();
$autoload['model'] = array();
