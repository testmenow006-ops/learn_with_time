<?php
defined('BASEPATH') OR exit('No direct script access allowed');

$databaseUrl = getenv('DATABASE_URL') ?: 'postgres://portfolio:portfolio@localhost:5432/teacher_portfolio';
$database = parse_url($databaseUrl);
$query = array();
parse_str($database['query'] ?? '', $query);
$connection = array(
    'host' => $database['host'] ?? 'localhost',
    'port' => (string) ($database['port'] ?? 5432),
    'user' => isset($database['user']) ? rawurldecode($database['user']) : 'portfolio',
    'password' => isset($database['pass']) ? rawurldecode($database['pass']) : 'portfolio',
    'dbname' => isset($database['path']) ? rawurldecode(ltrim($database['path'], '/')) : 'teacher_portfolio',
);
$dsn = '';
foreach ($connection as $key => $value) {
    $escaped = str_replace(array('\\', "'"), array('\\\\', "\\'"), $value);
    $dsn .= $key . "='" . $escaped . "' ";
}
foreach (array('connect_timeout', 'options', 'sslmode', 'service') as $key) {
    if (isset($query[$key]) && is_string($query[$key]) && $query[$key] !== '') {
        $escaped = str_replace(array('\\', "'"), array('\\\\', "\\'"), $query[$key]);
        $dsn .= $key . "='" . $escaped . "' ";
    }
}
$db['default'] = array(
    'dsn'      => trim($dsn),
    'hostname' => $connection['host'],
    'username' => $connection['user'],
    'password' => $connection['password'],
    'database' => $connection['dbname'],
    'dbdriver' => 'postgre',
    'dbprefix' => '',
    'pconnect' => FALSE,
    'db_debug' => ENVIRONMENT !== 'production',
    'cache_on' => FALSE,
    'cachedir' => '',
    'char_set' => 'utf8',
    'dbcollat' => 'utf8_general_ci',
    'swap_pre' => '',
    'encrypt' => FALSE,
    'compress' => FALSE,
    'stricton' => FALSE,
    'failover' => array(),
    'save_queries' => FALSE,
    'port'     => $connection['port'],
);
