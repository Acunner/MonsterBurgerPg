<?php
// ═══════════════════════════════════════════════════════════
//  api/index.php — Rock Burger API  (PHP 7.2+ / MariaDB)
// ═══════════════════════════════════════════════════════════
ini_set('display_errors', '0');
error_reporting(E_ALL);
require_once __DIR__ . '/config.php';

header('Access-Control-Allow-Origin: '  . ALLOWED_ORIGIN);
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');
header('Content-Type: application/json; charset=UTF-8');
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(204); exit; }

/* ── helpers ─────────────────────────────────────────────── */
function json_ok($data, $code = 200) {
    http_response_code($code);
    echo json_encode(array('ok'=>true,'data'=>$data), JSON_UNESCAPED_UNICODE);
    exit;
}
function json_err($msg, $code = 400) {
    http_response_code($code);
    echo json_encode(array('ok'=>false,'error'=>$msg), JSON_UNESCAPED_UNICODE);
    exit;
}
function get_body() {
    $raw = file_get_contents('php://input');
    if (!$raw) return array();
    $d = json_decode($raw, true);
    return is_array($d) ? $d : array();
}
function new_token() { return bin2hex(random_bytes(32)); }
function get_bearer_token() {
    $h = isset($_SERVER['HTTP_AUTHORIZATION']) ? $_SERVER['HTTP_AUTHORIZATION'] : '';
    if (preg_match('/^Bearer\s+(\S+)$/i', $h, $m)) return $m[1];
    return '';
}
function auth_user() {
    $token = get_bearer_token();
    if (!$token) json_err('Não autenticado.', 401);
    $s = db()->prepare(
        'SELECT u.* FROM sessions s JOIN users u ON u.id=s.user_id
         WHERE s.token=? AND s.expires_at>NOW()'
    );
    $s->execute(array($token));
    $u = $s->fetch();
    if (!$u) json_err('Sessão inválida ou expirada.', 401);
    return $u;
}
function optional_user() {
    $token = get_bearer_token();
    if (!$token) return null;
    $s = db()->prepare(
        'SELECT u.* FROM sessions s JOIN users u ON u.id=s.user_id
         WHERE s.token=? AND s.expires_at>NOW()'
    );
    $s->execute(array($token));
    return $s->fetch() ?: null;
}

/* ── roteamento ──────────────────────────────────────────── */
$method = $_SERVER['REQUEST_METHOD'];
$uri    = isset($_SERVER['REQUEST_URI']) ? $_SERVER['REQUEST_URI'] : '/';
$path   = parse_url($uri, PHP_URL_PATH);
$path   = preg_replace('#^/api#', '', $path);
$path   = rtrim($path, '/');
if ($path === '') $path = '/';

/* ════════════════════════════════════════════════════════════
   CATÁLOGO
   ════════════════════════════════════════════════════════════ */
if ($method==='GET' && $path==='/catalog') {
    $tables = array('LANCHES','COMBOS','ACOMPANHAMENTOS','BEBIDAS','INGREDIENTES');
    $all = array();
    foreach ($tables as $t) {
        $rows = db()->query("SELECT *,'$t' AS table_name FROM `$t` ORDER BY id")->fetchAll();
        foreach ($rows as $r) $all[] = $r;
    }
    json_ok($all);
}
if ($method==='GET' && $path==='/catalog/deals') {
    $tables = array('LANCHES','COMBOS','ACOMPANHAMENTOS','BEBIDAS','INGREDIENTES');
    $all = array();
    foreach ($tables as $t) {
        $rows = db()->query(
            "SELECT *,'$t' AS table_name FROM `$t`
             WHERE promocao=1 AND (promocao_expira_em IS NULL OR promocao_expira_em > NOW())
             ORDER BY id"
        )->fetchAll();
        foreach ($rows as $r) $all[] = $r;
    }
    json_ok($all);
}

/* ════════════════════════════════════════════════════════════
   CUPONS
   ════════════════════════════════════════════════════════════ */
// POST /coupons/validate  { code, subtotal }
if ($method==='POST' && $path==='/coupons/validate') {
    $b    = get_body();
    $code = strtoupper(trim(isset($b['code']) ? $b['code'] : ''));
    $sub  = (float)(isset($b['subtotal']) ? $b['subtotal'] : 0);
    if (!$code) json_err('Código vazio.');

    $stmt = db()->prepare(
        'SELECT * FROM coupons WHERE code=? AND active=1
         AND (expires_at IS NULL OR expires_at > NOW())
         AND (max_uses=0 OR used_count < max_uses)'
    );
    $stmt->execute(array($code));
    $c = $stmt->fetch();
    if (!$c) json_err('Cupom inválido ou expirado.', 404);
    if ($sub < (float)$c['min_order'])
        json_err('Pedido mínimo para este cupom: R$ ' . number_format($c['min_order'],2,',','.'));

    $disc = $c['type']==='percent'
        ? round($sub * ((float)$c['value'] / 100), 2)
        : min((float)$c['value'], $sub);

    json_ok(array(
        'code'     => $c['code'],
        'type'     => $c['type'],
        'value'    => (float)$c['value'],
        'discount' => $disc,
        'message'  => $c['type']==='percent'
            ? 'Desconto de ' . (int)$c['value'] . '% aplicado!'
            : 'Desconto de R$ ' . number_format($disc,2,',','.') . ' aplicado!',
    ));
}

/* ════════════════════════════════════════════════════════════
   AUTH
   ════════════════════════════════════════════════════════════ */
if ($method==='POST' && $path==='/auth/register') {
    $b     = get_body();
    $name  = trim(isset($b['name'])  ? $b['name']  : '');
    $email = trim(isset($b['email']) ? $b['email'] : '');
    $pass  = isset($b['password'])   ? $b['password'] : '';
    if (!$name || !filter_var($email,FILTER_VALIDATE_EMAIL) || strlen($pass)<6)
        json_err('Dados inválidos. Senha mínimo 6 caracteres.');
    $chk = db()->prepare('SELECT id FROM users WHERE email=?');
    $chk->execute(array($email));
    if ($chk->fetch()) json_err('E-mail já cadastrado.', 409);
    $hash = password_hash($pass, PASSWORD_BCRYPT);
    $phone = trim(isset($b['phone']) ? $b['phone'] : '');
    if (!$phone) json_err('Informe seu telefone.');
    db()->prepare('INSERT INTO users (name,email,password_hash,phone) VALUES (?,?,?,?)')->execute(array($name,$email,$hash,$phone));
    $uid = (int)db()->lastInsertId();
    $token = new_token();
    $exp   = date('Y-m-d H:i:s', strtotime('+'.SESSION_TTL_HOURS.' hours'));
    db()->prepare('INSERT INTO sessions (user_id,token,expires_at) VALUES (?,?,?)')->execute(array($uid,$token,$exp));
    json_ok(array('token'=>$token,'user'=>array('id'=>$uid,'name'=>$name,'email'=>$email,'badge'=>'Cliente Bronze','points'=>0)), 201);
}
if ($method==='POST' && $path==='/auth/login') {
    $b = get_body();
    $s = db()->prepare('SELECT * FROM users WHERE email=?');
    $s->execute(array(trim(isset($b['email'])?$b['email']:'')));
    $u = $s->fetch();
    if (!$u || !password_verify(isset($b['password'])?$b['password']:'',$u['password_hash']))
        json_err('E-mail ou senha incorretos.', 401);
    $token = new_token();
    $exp   = date('Y-m-d H:i:s', strtotime('+'.SESSION_TTL_HOURS.' hours'));
    db()->prepare('INSERT INTO sessions (user_id,token,expires_at) VALUES (?,?,?)')->execute(array($u['id'],$token,$exp));
    json_ok(array('token'=>$token,'user'=>array('id'=>(int)$u['id'],'name'=>$u['name'],'email'=>$u['email'],'badge'=>$u['badge'],'points'=>(int)$u['points'],'avatar'=>$u['avatar_url'])));
}
if ($method==='POST' && $path==='/auth/logout') {
    auth_user();
    db()->prepare('DELETE FROM sessions WHERE token=?')->execute(array(get_bearer_token()));
    json_ok('Sessão encerrada.');
}

/* ════════════════════════════════════════════════════════════
   PERFIL
   ════════════════════════════════════════════════════════════ */
if ($method==='GET' && $path==='/profile') {
    $u  = auth_user();
    $oc = db()->prepare('SELECT COUNT(*) FROM orders WHERE user_id=?'); $oc->execute(array($u['id']));
    $fc = db()->prepare('SELECT COUNT(*) FROM favorites WHERE user_id=?'); $fc->execute(array($u['id']));
    json_ok(array('id'=>(int)$u['id'],'name'=>$u['name'],'email'=>$u['email'],'phone'=>isset($u['phone'])?$u['phone']:null,'badge'=>$u['badge'],'points'=>(int)$u['points'],'avatar'=>$u['avatar_url'],'order_count'=>(int)$oc->fetchColumn(),'fav_count'=>(int)$fc->fetchColumn()));
}
if ($method==='PUT' && $path==='/profile') {
    $u = auth_user(); $b = get_body();
    $name  = trim(isset($b['name'])?$b['name']:$u['name']);
    $av    = trim(isset($b['avatar'])?$b['avatar']:(isset($u['avatar_url'])?$u['avatar_url']:''));
    $phone = trim(isset($b['phone'])?$b['phone']:(isset($u['phone'])?$u['phone']:''));
    if (!$name) json_err('Nome não pode ser vazio.');
    db()->prepare('UPDATE users SET name=?,avatar_url=?,phone=? WHERE id=?')->execute(array($name,$av?:null,$phone?:null,$u['id']));
    json_ok(array('name'=>$name,'avatar'=>$av?:null,'phone'=>$phone?:null));
}

/* ════════════════════════════════════════════════════════════
   ENDEREÇOS
   ════════════════════════════════════════════════════════════ */
if ($method==='GET' && $path==='/addresses') {
    $u = auth_user();
    $s = db()->prepare('SELECT * FROM addresses WHERE user_id=? ORDER BY is_default DESC,id ASC');
    $s->execute(array($u['id']));
    json_ok($s->fetchAll());
}
if ($method==='POST' && $path==='/addresses') {
    $u = auth_user(); $b = get_body();
    foreach (array('street','number') as $f)
        if (empty($b[$f])) json_err('Campo obrigatório: '.$f);
    $pdo = db();
    if (!empty($b['is_default']))
        $pdo->prepare('UPDATE addresses SET is_default=0 WHERE user_id=?')->execute(array($u['id']));
    $pdo->prepare(
        'INSERT INTO addresses (user_id,label,street,number,complement,district,city,state,zip,is_default)
         VALUES (?,?,?,?,?,?,?,?,?,?)'
    )->execute(array(
        $u['id'],
        isset($b['label'])      ? trim($b['label'])     : 'Casa',
        trim($b['street']),
        trim($b['number']),
        isset($b['complement']) ? trim($b['complement']) : '',
        isset($b['district'])   ? trim($b['district'])   : '',
        isset($b['city'])       ? trim($b['city'])       : '',
        isset($b['state'])      ? strtoupper(trim($b['state'])) : '',
        isset($b['zip'])        ? preg_replace('/\D/','',$b['zip']) : '',
        empty($b['is_default']) ? 0 : 1,
    ));
    $id  = (int)$pdo->lastInsertId();
    $row = $pdo->prepare('SELECT * FROM addresses WHERE id=?'); $row->execute(array($id));
    json_ok($row->fetch(), 201);
}
if ($method==='DELETE' && preg_match('#^/addresses/(\d+)$#',$path,$pm)) {
    $u = auth_user();
    $s = db()->prepare('DELETE FROM addresses WHERE id=? AND user_id=?');
    $s->execute(array((int)$pm[1],$u['id']));
    if ($s->rowCount()===0) json_err('Endereço não encontrado.',404);
    json_ok('Removido.');
}

/* ════════════════════════════════════════════════════════════
   PEDIDOS — aceita logado e visitante
   ════════════════════════════════════════════════════════════ */
if ($method==='GET' && $path==='/orders') {
    $u    = auth_user();
    $stmt = db()->prepare(
        "SELECT o.*,
            GROUP_CONCAT(CONCAT(oi.qty,'x ',oi.product_name) ORDER BY oi.id SEPARATOR ' | ') AS items_summary
         FROM orders o
         LEFT JOIN order_items oi ON oi.order_id=o.id
         WHERE o.user_id=? GROUP BY o.id ORDER BY o.created_at DESC"
    );
    $stmt->execute(array($u['id']));
    json_ok($stmt->fetchAll());
}

// POST /orders  — funciona para logado e visitante
if ($method==='POST' && $path==='/orders') {
    $u     = optional_user();   // null se visitante
    $b     = get_body();
    $items = isset($b['items'])   ? $b['items']   : array();
    $sub   = (float)(isset($b['subtotal'])  ? $b['subtotal']  : 0);
    $tot   = (float)(isset($b['total'])     ? $b['total']     : 0);
    $disc  = (float)(isset($b['discount'])  ? $b['discount']  : 0);
    $pay   = isset($b['payment_method'])    ? $b['payment_method'] : 'pix';
    $coup  = isset($b['coupon_code'])       ? strtoupper(trim($b['coupon_code'])) : '';
    $addr_id   = isset($b['address_id']) && $b['address_id'] ? (int)$b['address_id'] : null;
    $addr_text = isset($b['address_text'])  ? trim($b['address_text']) : '';
    $g_name    = isset($b['guest_name'])    ? trim($b['guest_name'])   : '';
    $g_phone   = isset($b['guest_phone'])   ? trim($b['guest_phone'])  : '';

    if (empty($items) || $tot <= 0) json_err('Pedido inválido.');

    // Visitante: nome e telefone obrigatórios
    if (!$u && (!$g_name || !$g_phone)) json_err('Informe nome e telefone para continuar.');

    $pdo = db();
    $pdo->beginTransaction();
    try {
        // Pedido de visitante usa user_id=0 (ou cria usuário anônimo interno)
        $uid = $u ? $u['id'] : 0;

        $pdo->prepare(
            'INSERT INTO orders
             (user_id,subtotal,freight,total,discount,address_id,address_text,
              payment_method,coupon_code,guest_name,guest_phone)
             VALUES (?,?,0,?,?,?,?,?,?,?,?)'
        )->execute(array($uid,$sub,$tot,$disc,$addr_id,$addr_text,$pay,$coup?:null,$g_name?:null,$g_phone?:null));
        $oid = (int)$pdo->lastInsertId();

        $ins = $pdo->prepare(
            'INSERT INTO order_items (order_id,product_id,table_name,product_name,unit_price,qty)
             VALUES (?,?,?,?,?,?)'
        );
        foreach ($items as $it) {
            $ins->execute(array(
                $oid,
                (int)(isset($it['id'])         ? $it['id']         : 0),
                isset($it['table_name'])        ? $it['table_name'] : 'LANCHES',
                isset($it['name'])              ? $it['name']       : '',
                (float)(isset($it['price'])     ? $it['price']      : 0),
                (int)(isset($it['qty'])         ? $it['qty']        : 1),
            ));
        }

        // Atualiza cupom usado
        if ($coup) {
            $pdo->prepare('UPDATE coupons SET used_count=used_count+1 WHERE code=?')->execute(array($coup));
        }

        // Pontos só para logados
        $pts = 0;
        if ($u) {
            $pts = (int)floor($tot);
            $pdo->prepare('UPDATE users SET points=points+? WHERE id=?')->execute(array($pts,$u['id']));
        }

        $pdo->commit();
        json_ok(array('order_id'=>$oid,'points_earned'=>$pts), 201);
    } catch (Exception $e) {
        $pdo->rollBack();
        json_err('Erro ao salvar pedido: '.$e->getMessage(), 500);
    }
}

/* ════════════════════════════════════════════════════════════
   AVALIAÇÕES (estrelas) — só quem já comprou pode avaliar
   ════════════════════════════════════════════════════════════ */
$RATEABLE_TABLES = array('LANCHES','COMBOS','ACOMPANHAMENTOS','BEBIDAS','INGREDIENTES');

if ($method==='GET' && $path==='/ratings/status') {
    $u     = auth_user();
    $table = isset($_GET['table'])      ? $_GET['table']            : '';
    $pid   = isset($_GET['product_id']) ? (int)$_GET['product_id']  : 0;
    if (!in_array($table, $RATEABLE_TABLES)) json_err('Categoria inválida.');

    $purchased = db()->prepare(
        "SELECT COUNT(*) FROM order_items oi
         JOIN orders o ON o.id=oi.order_id
         WHERE o.user_id=? AND oi.table_name=? AND oi.product_id=?"
    );
    $purchased->execute(array($u['id'], $table, $pid));
    $canRate = $purchased->fetchColumn() > 0;

    $mine = db()->prepare('SELECT stars FROM product_ratings WHERE user_id=? AND table_name=? AND product_id=?');
    $mine->execute(array($u['id'], $table, $pid));
    $row = $mine->fetch();

    json_ok(array('can_rate'=>$canRate, 'my_rating'=>$row ? (int)$row['stars'] : null));
}

if ($method==='POST' && $path==='/ratings') {
    $u     = auth_user();
    $b     = get_body();
    $table = isset($b['table_name'])  ? $b['table_name']    : '';
    $pid   = isset($b['product_id'])  ? (int)$b['product_id'] : 0;
    $stars = isset($b['stars'])       ? (int)$b['stars']      : 0;

    if (!in_array($table, $RATEABLE_TABLES)) json_err('Categoria inválida.');
    if ($stars < 1 || $stars > 5) json_err('Nota deve ser de 1 a 5.');

    $purchased = db()->prepare(
        "SELECT COUNT(*) FROM order_items oi
         JOIN orders o ON o.id=oi.order_id
         WHERE o.user_id=? AND oi.table_name=? AND oi.product_id=?"
    );
    $purchased->execute(array($u['id'], $table, $pid));
    if ($purchased->fetchColumn() == 0) json_err('Você só pode avaliar produtos que já comprou.', 403);

    $pdo = db();
    $pdo->prepare(
        "INSERT INTO product_ratings (user_id,table_name,product_id,stars)
         VALUES (?,?,?,?)
         ON DUPLICATE KEY UPDATE stars=VALUES(stars), updated_at=NOW()"
    )->execute(array($u['id'], $table, $pid, $stars));

    $avg = $pdo->prepare('SELECT AVG(stars) FROM product_ratings WHERE table_name=? AND product_id=?');
    $avg->execute(array($table, $pid));
    $newAvg = round((float)$avg->fetchColumn(), 2);

    $pdo->prepare("UPDATE `$table` SET rate=? WHERE id=?")->execute(array($newAvg, $pid));

    json_ok(array('average'=>$newAvg));
}

/* ════════════════════════════════════════════════════════════
   FAVORITOS
   ════════════════════════════════════════════════════════════ */
if ($method==='GET' && $path==='/favorites') {
    $u = auth_user();
    $s = db()->prepare('SELECT product_key,added_at FROM favorites WHERE user_id=? ORDER BY added_at DESC');
    $s->execute(array($u['id']));
    json_ok($s->fetchAll());
}
if ($method==='POST' && $path==='/favorites') {
    $u = auth_user(); $b = get_body();
    $key = isset($b['product_key']) ? trim($b['product_key']) : '';
    if (!$key) json_err('product_key inválido.');
    db()->prepare('INSERT IGNORE INTO favorites (user_id,product_key) VALUES (?,?)')->execute(array($u['id'],$key));
    json_ok('Adicionado.');
}
if ($method==='DELETE' && preg_match('#^/favorites/(.+)$#',$path,$pm)) {
    $u = auth_user();
    db()->prepare('DELETE FROM favorites WHERE user_id=? AND product_key=?')->execute(array($u['id'],urldecode($pm[1])));
    json_ok('Removido.');
}

/* ════════════════════════════════════════════════════════════
   404
   ════════════════════════════════════════════════════════════ */
json_err('Rota não encontrada: '.$method.' '.$path, 404);