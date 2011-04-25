<?php
set_time_limit(0);

if (get_magic_quotes_gpc()) {
    $process = array(&$_GET, &$_POST, &$_COOKIE, &$_REQUEST);
    while (list($key, $val) = each($process)) {
        foreach ($val as $k => $v) {
            unset($process[$key][$k]);
            if (is_array($v)) {
                $process[$key][stripslashes($k)] = $v;
                $process[] = &$process[$key][stripslashes($k)];
            } else {
                $process[$key][stripslashes($k)] = stripslashes($v);
            }
        }
    }
    unset($process);
}

function read_messages($sock) {
	$buf = '';
	do {
		$buf .= socket_read($sock, 1024*1024); // blocking
	} while (substr($buf, -1) != "\n");
	return $buf;
}

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

	socket_close($sock);
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
		$msg = read_messages($sock);
		socket_close($sock);

    if(empty($msg)) {
      // Le proxy nous a fermé la connexion au nez : quelque chose ne va pas.
      header('HTTP/1.1 410 Gone');
      die();
    }

		//file_put_contents('log_recu', $msg, FILE_APPEND);
		$response = array();
		$response['msg'] = explode("\n", trim($msg));
		// On vire les caractères de mise en forme à défaut de les gérer :)
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
