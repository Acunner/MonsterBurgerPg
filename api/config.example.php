<?php
// ═══════════════════════════════════════════════════════════
//  api/config.example.php — Modelo de credenciais
//  Copie este arquivo para "config.php" e preencha com os
//  dados reais do banco no servidor (Hostinger > hPanel > Bancos de dados).
//  config.php NÃO é versionado (está no .gitignore).
// ═══════════════════════════════════════════════════════════

define('DB_HOST',    'localhost');
define('DB_NAME',    'SEU_BANCO_AQUI');
define('DB_USER',    'SEU_USUARIO_AQUI');
define('DB_PASS',    'SUA_SENHA_AQUI');
define('DB_CHARSET', 'utf8mb4');

define('ALLOWED_ORIGIN',    '*');
define('SESSION_TTL_HOURS', 720);

function db() {
    static $pdo = null;
    if ($pdo !== null) return $pdo;
    try {
        $dsn = 'mysql:host=' . DB_HOST
             . ';dbname='    . DB_NAME
             . ';charset='   . DB_CHARSET;
        $pdo = new PDO($dsn, DB_USER, DB_PASS, array(
            PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            PDO::ATTR_EMULATE_PREPARES   => false,
        ));
    } catch (PDOException $e) {
        http_response_code(500);
        header('Content-Type: application/json; charset=UTF-8');
        echo json_encode(array('ok' => false, 'error' => 'DB: ' . $e->getMessage()));
        exit;
    }
    return $pdo;
}
