<?php
$host = 'localhost';
$port = 1234;

$sock = socket_create(AF_INET, SOCK_STREAM, 0);
if(!socket_connect($sock, $host, $port)) {
	header('HTTP/1.1 500 Internal Server Error');
	socket_close($sock);
	die();
}

if(!empty($_GET['connect'])) {
	$pseudo = $_GET['connect'];
	socket_write($sock, "connect $pseudo\n");
	$msg = socket_read($sock, 1024, PHP_NORMAL_READ);
	socket_close($sock);

	$data = explode(' ', trim($msg));
	$response = array();
	$response['pnum'] = (int)$data[1];
	echo json_encode($response);
	die();	
}

if(!empty($_GET['pnum'])) {
	$pnum = (int)$_GET['pnum'];
	
	if(!empty($_GET['send'])) {
		$send = $_GET['send'];
		socket_write($sock, "write $pnum\n");
		socket_write($sock, $send."\n");
		socket_close($sock);
		die();
	}
	else {
		socket_write($sock, "read $pnum\n");
		$msg = socket_read($sock, 1024*1024); // blocking
		socket_close($sock);
		$response = array();
		$response['msg'] = explode("\n", trim($msg));
		foreach($response['msg'] as &$msg) {
			$new_msg = "";
			$msg = trim($msg);
			for($i = 0; $i < strlen($msg); $i++) {
				if(ord($msg[$i]) >= 32) {
					$new_msg .= $msg[$i];
				}
			}
			$msg = $new_msg;
		}
		echo json_encode($response);
		die();
	}
}
		
socket_close($sock);
?>
