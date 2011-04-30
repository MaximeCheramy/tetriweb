<?php
require_once('backend.inc.php');
fix_magic_quotes();
set_time_limit(0);

$host = 'localhost';
$port = 1234;

if(empty($_GET['connect']) && empty($_GET['pnum'])) {
  header('HTTP/1.1 400 Bad Request');
  die();
}

$sock = socket_create(AF_INET, SOCK_STREAM, 0);
if(!socket_connect($sock, $host, $port)) {
  header('HTTP/1.1 500 Internal Server Error');
  socket_close($sock);
  die();
}

if(!empty($_GET['connect'])) {
  $pseudo = $_GET['connect'];
  socket_write($sock, "connect $pseudo\n");
  $msg = read_messages($sock);
  //file_put_contents('log_recu', $msg, FILE_APPEND);

  $response = array();
  $data = explode(' ', trim($msg), 2);
  if($data[0] == 'playernum') {
    $response['pnum'] = (int)$data[1];
  }
  else {
    $response['error'] = $data[1];
  }

  echo json_encode($response);
  socket_close($sock);
  die();
}

if(!empty($_GET['pnum'])) {
  $pnum = (int)$_GET['pnum'];

  if(isset($_GET['send'])) {
    file_put_contents("backend_client_$pnum.log", "WRITE from client $client\n", FILE_APPEND);
    $send = $_GET['send'];
    socket_write($sock, "write $pnum\n");
    socket_write($sock, $send."\n");
    socket_close($sock);
    file_put_contents("backend_client_$pnum.log", "client >>> proxy :\n$send\n--------------------\n", FILE_APPEND);
    die();
  }
  else {
    file_put_contents("backend_client_$pnum.log", "READ from client $client\n", FILE_APPEND);
    socket_write($sock, "read $pnum\n");
    $msg = read_messages($sock);
    socket_close($sock);

    if(empty($msg)) {
      // Le proxy nous a fermé la connexion au nez : quelque chose ne va pas.
      header('HTTP/1.1 410 Gone');
      die();
    }

    file_put_contents("backend_client_$pnum.log", "proxy >>> client :\n$msg\n--------------------\n", FILE_APPEND);
    $response = array();
    $response['msg'] = explode("\n", trim($msg));
    format_messages($response['msg']);
    echo json_encode($response);
    die();
  }
}

socket_close($sock);
?>
