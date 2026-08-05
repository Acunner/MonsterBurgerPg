<?php
// ═══════════════════════════════════════════════════════════
//  admin/api.php — API exclusiva do painel admin
// ═══════════════════════════════════════════════════════════
ini_set('display_errors','0');
error_reporting(E_ALL);
require_once dirname(__DIR__) . '/api/config.php';

header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');
header('Content-Type: application/json; charset=UTF-8');
if ($_SERVER['REQUEST_METHOD']==='OPTIONS'){http_response_code(204);exit;}

function json_ok($d,$c=200){http_response_code($c);echo json_encode(['ok'=>true,'data'=>$d],JSON_UNESCAPED_UNICODE);exit;}
function json_err($m,$c=400){http_response_code($c);echo json_encode(['ok'=>false,'error'=>$m],JSON_UNESCAPED_UNICODE);exit;}
function body(){$r=file_get_contents('php://input');$d=json_decode($r?:'{}',true);return is_array($d)?$d:[];}
function new_token(){return bin2hex(random_bytes(32));}

function auth_staff(){
    $h=isset($_SERVER['HTTP_AUTHORIZATION'])?$_SERVER['HTTP_AUTHORIZATION']:'';
    if(!preg_match('/^Bearer\s+(\S+)$/i',$h,$m)) json_err('Não autenticado.',401);
    $s=db()->prepare('SELECT s.* FROM staff_sessions ss JOIN staff s ON s.id=ss.staff_id WHERE ss.token=? AND ss.expires_at>NOW()');
    $s->execute([$m[1]]);
    $staff=$s->fetch();
    if(!$staff) json_err('Sessão inválida.',401);
    return $staff;
}

$method=$_SERVER['REQUEST_METHOD'];
$path=rtrim(preg_replace('#^/admin/api#','',parse_url($_SERVER['REQUEST_URI'],PHP_URL_PATH)),'/');
if($path==='') $path='/';

// ── POST /login ──────────────────────────────────────────────
if($method==='POST' && $path==='/login'){
    $b=body();
    $s=db()->prepare('SELECT * FROM staff WHERE email=? AND active=1');
    $s->execute([trim($b['email']??'')]);
    $staff=$s->fetch();
    if(!$staff||!password_verify($b['password']??'',$staff['password_hash'])) json_err('Credenciais inválidas.',401);
    $token=new_token();
    $exp=date('Y-m-d H:i:s',strtotime('+12 hours'));
    db()->prepare('INSERT INTO staff_sessions (staff_id,token,expires_at) VALUES (?,?,?)')->execute([$staff['id'],$token,$exp]);
    json_ok(['token'=>$token,'staff'=>['id'=>$staff['id'],'name'=>$staff['name'],'email'=>$staff['email'],'role'=>$staff['role']]]);
}

// ── POST /logout ─────────────────────────────────────────────
if($method==='POST' && $path==='/logout'){
    auth_staff();
    $h=isset($_SERVER['HTTP_AUTHORIZATION'])?$_SERVER['HTTP_AUTHORIZATION']:'';
    preg_match('/^Bearer\s+(\S+)$/i',$h,$m);
    db()->prepare('DELETE FROM staff_sessions WHERE token=?')->execute([$m[1]??'']);
    json_ok('Logout OK.');
}

// ── GET /me ──────────────────────────────────────────────────
if($method==='GET' && $path==='/me'){
    $s=auth_staff();
    json_ok(['id'=>$s['id'],'name'=>$s['name'],'email'=>$s['email'],'role'=>$s['role']]);
}

// ════════════════════════════════════════════════════════════
//  PEDIDOS
// ════════════════════════════════════════════════════════════
if($method==='GET' && $path==='/orders'){
    auth_staff();
    $status=isset($_GET['status'])?$_GET['status']:'';
    $where=$status?'WHERE o.status=?':'';
    $params=$status?[$status]:[];
    $sql="SELECT o.*,
            COALESCE(u.name, o.guest_name, 'Visitante') AS customer_name,
            COALESCE(u.phone, o.guest_phone, '') AS customer_phone,
            GROUP_CONCAT(CONCAT(oi.qty,'x ',oi.product_name) ORDER BY oi.id SEPARATOR ' | ') AS items_summary
          FROM orders o
          LEFT JOIN users u ON u.id=o.user_id AND o.user_id>0
          LEFT JOIN order_items oi ON oi.order_id=o.id
          $where GROUP BY o.id ORDER BY o.created_at DESC";
    $s=db()->prepare($sql);$s->execute($params);
    json_ok($s->fetchAll());
}

// PUT /orders/{id}/status
if($method==='PUT' && preg_match('#^/orders/(\d+)/status$#',$path,$pm)){
    auth_staff();
    $b=body();
    $valid=['pendente','confirmado','em_preparo','em_entrega','entregue','cancelado'];
    if(!in_array($b['status']??'',$valid)) json_err('Status inválido.');
    db()->prepare('UPDATE orders SET status=? WHERE id=?')->execute([$b['status'],(int)$pm[1]]);
    json_ok('Status atualizado.');
}

// GET /orders/{id}/items
if($method==='GET' && preg_match('#^/orders/(\d+)/items$#',$path,$pm)){
    auth_staff();
    $s=db()->prepare('SELECT * FROM order_items WHERE order_id=?');
    $s->execute([(int)$pm[1]]);
    json_ok($s->fetchAll());
}

// ════════════════════════════════════════════════════════════
//  PRODUTOS
// ════════════════════════════════════════════════════════════
if($method==='GET' && $path==='/products'){
    auth_staff();
    $all=[];
    foreach(['LANCHES','COMBOS','ACOMPANHAMENTOS','BEBIDAS','INGREDIENTES'] as $t){
        $rows=db()->query("SELECT *,'$t' AS table_name FROM `$t` ORDER BY id")->fetchAll();
        foreach($rows as $r) $all[]=$r;
    }
    json_ok($all);
}

// PUT /products/{table}/{id}
if($method==='PUT' && preg_match('#^/products/([A-Z_]+)/(\d+)$#',$path,$pm)){
    auth_staff();
    $allowed=['LANCHES','COMBOS','ACOMPANHAMENTOS','BEBIDAS','INGREDIENTES'];
    $table=$pm[1]; $id=(int)$pm[2];
    if(!in_array($table,$allowed)) json_err('Tabela inválida.');
    $b=body();
    $fields=[];$vals=[];
    $editable=['nome','ml','preco','promocao','valor_promocional','marca','retornavel','img','rate','preco_de_compra','estoque'];
    foreach($editable as $f){
        if(array_key_exists($f,$b)){
            $fields[]="`$f`=?";
            $vals[]=$b[$f];
        }
    }
    if(empty($fields)) json_err('Nada para atualizar.');
    $vals[]=$id;
    db()->prepare("UPDATE `$table` SET ".implode(',',$fields)." WHERE id=?")->execute($vals);
    json_ok('Produto atualizado.');
}

// POST /products/{table}
if($method==='POST' && preg_match('#^/products/([A-Z_]+)$#',$path,$pm)){
    auth_staff();
    $allowed=['LANCHES','COMBOS','ACOMPANHAMENTOS','BEBIDAS','INGREDIENTES'];
    $table=$pm[1];
    if(!in_array($table,$allowed)) json_err('Tabela inválida.');
    $b=body();
    db()->prepare(
        "INSERT INTO `$table` (nome,ml,preco,promocao,valor_promocional,marca,retornavel,img,rate,preco_de_compra,estoque)
         VALUES (?,?,?,?,?,?,?,?,?,?,?)"
    )->execute([
        $b['nome']??'', (int)($b['ml']??0),
        (float)($b['preco']??0), (int)($b['promocao']??0),
        (float)($b['valor_promocional']??0), $b['marca']??'',
        (int)($b['retornavel']??0), $b['img']??'',
        (float)($b['rate']??0), (float)($b['preco_de_compra']??0),
        (int)($b['estoque']??0),
    ]);
    json_ok(['id'=>(int)db()->lastInsertId()],201);
}

// DELETE /products/{table}/{id}
if($method==='DELETE' && preg_match('#^/products/([A-Z_]+)/(\d+)$#',$path,$pm)){
    $staff=auth_staff();
    if($staff['role']!=='admin') json_err('Apenas admin pode excluir.',403);
    $allowed=['LANCHES','COMBOS','ACOMPANHAMENTOS','BEBIDAS','INGREDIENTES'];
    if(!in_array($pm[1],$allowed)) json_err('Tabela inválida.');
    db()->prepare("DELETE FROM `{$pm[1]}` WHERE id=?")->execute([(int)$pm[2]]);
    json_ok('Produto excluído.');
}

// ════════════════════════════════════════════════════════════
//  CUPONS
// ════════════════════════════════════════════════════════════
if($method==='GET' && $path==='/coupons'){
    auth_staff();
    json_ok(db()->query('SELECT * FROM coupons ORDER BY created_at DESC')->fetchAll());
}
if($method==='POST' && $path==='/coupons'){
    auth_staff(); $b=body();
    if(empty($b['code'])||empty($b['value'])) json_err('Código e valor obrigatórios.');
    db()->prepare(
        'INSERT INTO coupons (code,type,value,min_order,max_uses,active,expires_at) VALUES (?,?,?,?,?,?,?)'
    )->execute([
        strtoupper(trim($b['code'])), $b['type']??'percent',
        (float)$b['value'], (float)($b['min_order']??0),
        (int)($b['max_uses']??0), 1,
        !empty($b['expires_at'])?$b['expires_at']:null,
    ]);
    json_ok(['id'=>(int)db()->lastInsertId()],201);
}
if($method==='PUT' && preg_match('#^/coupons/(\d+)$#',$path,$pm)){
    auth_staff(); $b=body();
    db()->prepare('UPDATE coupons SET active=? WHERE id=?')->execute([(int)($b['active']??1),(int)$pm[1]]);
    json_ok('Cupom atualizado.');
}
if($method==='DELETE' && preg_match('#^/coupons/(\d+)$#',$path,$pm)){
    $staff=auth_staff();
    if($staff['role']!=='admin') json_err('Apenas admin.',403);
    db()->prepare('DELETE FROM coupons WHERE id=?')->execute([(int)$pm[1]]);
    json_ok('Cupom excluído.');
}

// ════════════════════════════════════════════════════════════
//  DESPESAS
// ════════════════════════════════════════════════════════════
if($method==='GET' && $path==='/expenses'){
    auth_staff();
    $from=$_GET['from']??date('Y-m-01');
    $to=$_GET['to']??date('Y-m-t');
    $s=db()->prepare('SELECT * FROM expenses WHERE expense_date BETWEEN ? AND ? ORDER BY expense_date DESC');
    $s->execute([$from,$to]);
    json_ok($s->fetchAll());
}
if($method==='POST' && $path==='/expenses'){
    $staff=auth_staff(); $b=body();
    if(empty($b['description'])||empty($b['amount'])) json_err('Descrição e valor obrigatórios.');
    db()->prepare(
        'INSERT INTO expenses (description,category,amount,expense_date,staff_id) VALUES (?,?,?,?,?)'
    )->execute([
        $b['description'], $b['category']??'Geral',
        (float)$b['amount'], $b['expense_date']??date('Y-m-d'),
        $staff['id'],
    ]);
    json_ok(['id'=>(int)db()->lastInsertId()],201);
}
if($method==='DELETE' && preg_match('#^/expenses/(\d+)$#',$path,$pm)){
    auth_staff();
    db()->prepare('DELETE FROM expenses WHERE id=?')->execute([(int)$pm[1]]);
    json_ok('Despesa removida.');
}

// ════════════════════════════════════════════════════════════
//  RELATÓRIOS / DASHBOARD
// ════════════════════════════════════════════════════════════
if($method==='GET' && $path==='/dashboard'){
    auth_staff();
    $pdo=db();
    $from=$_GET['from']??date('Y-m-01');
    $to=$_GET['to']??date('Y-m-d');

    // Receita do período
    $rev=$pdo->prepare("SELECT COALESCE(SUM(total),0) FROM orders WHERE status NOT IN('cancelado') AND DATE(created_at) BETWEEN ? AND ?");
    $rev->execute([$from,$to]);
    $revenue=(float)$rev->fetchColumn();

    // Despesas do período
    $exp=$pdo->prepare("SELECT COALESCE(SUM(amount),0) FROM expenses WHERE expense_date BETWEEN ? AND ?");
    $exp->execute([$from,$to]);
    $expenses=(float)$exp->fetchColumn();

    // Pedidos por status
    $st=$pdo->prepare("SELECT status, COUNT(*) as qty FROM orders WHERE DATE(created_at) BETWEEN ? AND ? GROUP BY status");
    $st->execute([$from,$to]);
    $byStatus=$st->fetchAll();

    // Top 10 produtos vendidos
    $top=$pdo->prepare(
        "SELECT oi.product_name, SUM(oi.qty) as total_qty, SUM(oi.qty*oi.unit_price) as total_revenue
         FROM order_items oi
         JOIN orders o ON o.id=oi.order_id
         WHERE o.status NOT IN('cancelado') AND DATE(o.created_at) BETWEEN ? AND ?
         GROUP BY oi.product_name ORDER BY total_qty DESC LIMIT 10"
    );
    $top->execute([$from,$to]);

    // Faturamento por dia
    $daily=$pdo->prepare(
        "SELECT DATE(created_at) as day, COALESCE(SUM(total),0) as revenue, COUNT(*) as orders
         FROM orders WHERE status NOT IN('cancelado') AND DATE(created_at) BETWEEN ? AND ?
         GROUP BY DATE(created_at) ORDER BY day"
    );
    $daily->execute([$from,$to]);

    // Contadores gerais
    $totalOrders=$pdo->prepare("SELECT COUNT(*) FROM orders WHERE DATE(created_at) BETWEEN ? AND ?");
    $totalOrders->execute([$from,$to]);
    $totalUsers=$pdo->query("SELECT COUNT(*) FROM users")->fetchColumn();
    $pendingOrders=$pdo->query("SELECT COUNT(*) FROM orders WHERE status='pendente'")->fetchColumn();

    json_ok([
        'revenue'       => $revenue,
        'expenses'      => $expenses,
        'profit'        => $revenue - $expenses,
        'total_orders'  => (int)$totalOrders->fetchColumn(),
        'total_users'   => (int)$totalUsers,
        'pending_orders'=> (int)$pendingOrders,
        'by_status'     => $byStatus,
        'top_products'  => $top->fetchAll(),
        'daily'         => $daily->fetchAll(),
    ]);
}

// ════════════════════════════════════════════════════════════
//  USUÁRIOS
// ════════════════════════════════════════════════════════════
if($method==='GET' && $path==='/users'){
    auth_staff();
    $s=db()->prepare(
        "SELECT u.id,u.name,u.email,u.phone,u.badge,u.points,u.created_at,
                COUNT(o.id) as total_orders,
                COALESCE(SUM(o.total),0) as total_spent
         FROM users u
         LEFT JOIN orders o ON o.user_id=u.id AND o.status NOT IN('cancelado')
         GROUP BY u.id ORDER BY u.created_at DESC"
    );
    $s->execute();
    json_ok($s->fetchAll());
}
if($method==='PUT' && preg_match('#^/users/(\d+)/points$#',$path,$pm)){
    $staff=auth_staff();
    if($staff['role']!=='admin') json_err('Apenas admin.',403);
    $b=body();
    db()->prepare('UPDATE users SET points=? WHERE id=?')->execute([(int)$b['points'],(int)$pm[1]]);
    json_ok('Pontos atualizados.');
}

// ════════════════════════════════════════════════════════════
//  FUNCIONÁRIOS (só admin)
// ════════════════════════════════════════════════════════════
if($method==='GET' && $path==='/staff'){
    $s=auth_staff();
    if($s['role']!=='admin') json_err('Apenas admin.',403);
    json_ok(db()->query('SELECT id,name,email,role,active,created_at FROM staff ORDER BY id')->fetchAll());
}
if($method==='POST' && $path==='/staff'){
    $s=auth_staff();
    if($s['role']!=='admin') json_err('Apenas admin.',403);
    $b=body();
    if(empty($b['email'])||empty($b['password'])) json_err('Email e senha obrigatórios.');
    $chk=db()->prepare('SELECT id FROM staff WHERE email=?');
    $chk->execute([$b['email']]);
    if($chk->fetch()) json_err('Email já cadastrado.',409);
    db()->prepare('INSERT INTO staff (name,email,password_hash,role) VALUES (?,?,?,?)')->execute([
        $b['name']??'Funcionário', $b['email'],
        password_hash($b['password'],PASSWORD_BCRYPT),
        $b['role']??'funcionario',
    ]);
    json_ok(['id'=>(int)db()->lastInsertId()],201);
}
if($method==='PUT' && preg_match('#^/staff/(\d+)$#',$path,$pm)){
    $s=auth_staff();
    if($s['role']!=='admin') json_err('Apenas admin.',403);
    $b=body();
    $fields=[];$vals=[];
    if(isset($b['active'])){$fields[]='active=?';$vals[]=(int)$b['active'];}
    if(isset($b['role'])){$fields[]='role=?';$vals[]=$b['role'];}
    if(isset($b['password'])){$fields[]='password_hash=?';$vals[]=password_hash($b['password'],PASSWORD_BCRYPT);}
    if(empty($fields)) json_err('Nada para atualizar.');
    $vals[]=(int)$pm[1];
    db()->prepare('UPDATE staff SET '.implode(',',$fields).' WHERE id=?')->execute($vals);
    json_ok('Funcionário atualizado.');
}

// ════════════════════════════════════════════════════════════
//  PRECIFICAÇÃO
// ════════════════════════════════════════════════════════════

// GET /pricing — retorna custos + config + produtos com custo
if($method==='GET' && $path==='/pricing'){
    auth_staff();
    $pdo = db();

    $costs = $pdo->query('SELECT * FROM pricing_costs ORDER BY type, id')->fetchAll();

    $cfg_rows = $pdo->query('SELECT `key`,`value` FROM pricing_config')->fetchAll();
    $config = [];
    foreach($cfg_rows as $r) $config[$r['key']] = $r['value'];

    // Produtos com custo de compra preenchido
    $products = [];
    foreach(['LANCHES','COMBOS','ACOMPANHAMENTOS','BEBIDAS','INGREDIENTES'] as $t){
        $rows = $pdo->query("SELECT id, nome, ml, marca, preco, preco_de_compra, '$t' AS table_name FROM `$t` WHERE preco_de_compra > 0 ORDER BY nome")->fetchAll();
        foreach($rows as $r) $products[] = $r;
    }

    json_ok(['costs'=>$costs,'config'=>$config,'products'=>$products]);
}

// POST /pricing/costs — cria novo item de custo
if($method==='POST' && $path==='/pricing/costs'){
    auth_staff(); $b=body();
    if(empty($b['name'])||empty($b['type'])) json_err('Nome e tipo obrigatórios.');
    db()->prepare(
        'INSERT INTO pricing_costs (name,type,value_type,value) VALUES (?,?,?,?)'
    )->execute([
        $b['name'], $b['type'],
        $b['value_type']??'reais',
        (float)($b['value']??0),
    ]);
    json_ok(['id'=>(int)db()->lastInsertId()],201);
}

// PUT /pricing/costs/{id} — atualiza item
if($method==='PUT' && preg_match('#^/pricing/costs/(\d+)$#',$path,$pm)){
    auth_staff(); $b=body();
    $fields=[]; $vals=[];
    foreach(['name','type','value_type','value','active'] as $f){
        if(array_key_exists($f,$b)){ $fields[]="`$f`=?"; $vals[]=$b[$f]; }
    }
    if(empty($fields)) json_err('Nada para atualizar.');
    $vals[]=(int)$pm[1];
    db()->prepare('UPDATE pricing_costs SET '.implode(',',$fields).' WHERE id=?')->execute($vals);
    json_ok('Atualizado.');
}

// DELETE /pricing/costs/{id}
if($method==='DELETE' && preg_match('#^/pricing/costs/(\d+)$#',$path,$pm)){
    auth_staff();
    db()->prepare('DELETE FROM pricing_costs WHERE id=?')->execute([(int)$pm[1]]);
    json_ok('Removido.');
}

// PUT /pricing/config — salva múltiplos configs de uma vez
if($method==='PUT' && $path==='/pricing/config'){
    auth_staff(); $b=body();
    $allowed=['monthly_revenue','monthly_units','margin_pct','tax_pct','machine_pct'];
    $pdo=db();
    foreach($allowed as $key){
        if(array_key_exists($key,$b)){
            $pdo->prepare('INSERT INTO pricing_config (`key`,`value`) VALUES (?,?) ON DUPLICATE KEY UPDATE `value`=?')
                ->execute([$key,(string)$b[$key],(string)$b[$key]]);
        }
    }
    json_ok('Config salva.');
}

// PUT /pricing/product/{table}/{id} — atualiza custo de compra do produto
if($method==='PUT' && preg_match('#^/pricing/product/([A-Z_]+)/(\d+)$#',$path,$pm)){
    auth_staff();
    $allowed=['LANCHES','COMBOS','ACOMPANHAMENTOS','BEBIDAS','INGREDIENTES'];
    if(!in_array($pm[1],$allowed)) json_err('Tabela inválida.');
    $b=body();
    db()->prepare("UPDATE `{$pm[1]}` SET preco_de_compra=? WHERE id=?")->execute([(float)($b['cost']??0),(int)$pm[2]]);
    json_ok('Custo atualizado.');
}

// ════════════════════════════════════════════════════════════
//  OFERTAS RELÂMPAGO (flash deals com expiração real)
// ════════════════════════════════════════════════════════════

// PUT /products/{table}/{id}/deal — ativa oferta por N horas
if($method==='PUT' && preg_match('#^/products/([A-Z_]+)/(\d+)/deal$#',$path,$pm)){
    auth_staff();
    $allowed=['LANCHES','COMBOS','ACOMPANHAMENTOS','BEBIDAS','INGREDIENTES'];
    $table=$pm[1]; $id=(int)$pm[2];
    if(!in_array($table,$allowed)) json_err('Tabela inválida.');
    $b=body();
    $saleValue = (float)($b['valor_promocional']??0);
    $hours     = max(1,(int)($b['hours']??12));
    if($saleValue<=0) json_err('Informe o preço promocional.');
    db()->prepare(
        "UPDATE `$table` SET promocao=1, valor_promocional=?, promocao_expira_em=DATE_ADD(NOW(), INTERVAL ? HOUR) WHERE id=?"
    )->execute([$saleValue,$hours,$id]);
    json_ok('Oferta ativada.');
}

// DELETE /products/{table}/{id}/deal — encerra oferta manualmente
if($method==='DELETE' && preg_match('#^/products/([A-Z_]+)/(\d+)/deal$#',$path,$pm)){
    auth_staff();
    $allowed=['LANCHES','COMBOS','ACOMPANHAMENTOS','BEBIDAS','INGREDIENTES'];
    if(!in_array($pm[1],$allowed)) json_err('Tabela inválida.');
    db()->prepare("UPDATE `{$pm[1]}` SET promocao=0, promocao_expira_em=NULL WHERE id=?")->execute([(int)$pm[2]]);
    json_ok('Oferta encerrada.');
}

json_err('Rota não encontrada: '.$method.' '.$path,404);