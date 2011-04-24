<?php
define('BUFFER_LEN', 1024);
define('PING_INTERVAL', 10);
define('TIMEOUT', 5);

$port = 1234;
$server_addr = 'localhost';
$server_port = 31457;

$clients = array();
$data_in = array();
$tmp_clients = 0;

$s_in = socket_create(AF_INET, SOCK_STREAM, 0);
socket_set_option($s_in, SOL_SOCKET, SO_REUSEADDR, 1);
socket_bind($s_in, 0, $port);
socket_listen($s_in);

function hello_msg($nickname) {
	global $server_addr;

	$ip = $server_addr;
	$s = "tetrisstart $nickname 1.13";
	$h = str_split($ip[0]*54 + $ip[1]*41 + $ip[2]*29 + $ip[3]*17);
	$dec = rand(0, 255);
	$encrypted = sprintf("%02X", $dec & 0xFF);

	for($i = 0; $i < strlen($s); $i++) {
		$dec = (($dec + ord($s[$i])) % 255) ^ ord($h[$i % count($h)]);
		$encrypted .= sprintf("%02X", $dec & 0xFF);
	}

	echo "Hello msg for $nickname : $encrypted\n";
	
	return $encrypted;
}

function getAllSockets() {
	global $s_in, $clients;

	$socks = array($s_in);
	foreach($clients as $client) {
		if(isset($client['s_server'])) {
			$socks[] = $client['s_server'];
		}
		if(isset($client['s_client_read'])) {
			$socks[] = $client['s_client_read'];
		}
		if(isset($client['s_client_write'])) {
			$socks[] = $client['s_client_write'];
		}
	}
	return $socks;
}

function getSocketInfo($s, &$type, &$client) {
	global $clients;

	foreach($clients as $c_id => $client) {
		if(isset($client['s_server']) && $s == $client['s_server']) {
			$type = 'server';
			$client = $c_id; 
			break;
		}
		if(isset($client['s_client_read']) && $s == $client['s_client_read']) {
			$type = 'client_read';
			$client = $c_id;
			break;
		}
		if(isset($client['s_client_write']) && $s == $client['s_client_write']) {
			$type = 'client_write';
			$client = $c_id;
			break;
		}
	}
}

while(true) {
	$r = getAllSockets();
	$w = null;
	$e = null;
	if(false === socket_select($r, $w, $e, NULL)) {
		echo "socket_select() failed : " . socket_strerror(socket_last_error()) . "\n";	
	}
	foreach($r as $s) {
		if($s == $s_in) {
			// Arrivée client
			echo "Arrivée d'un client...\n";
			$s_client_read = socket_accept($s_in);
			$msg = array();
			$clients['tmp_'.(++$tmp_clients)] = compact('s_client_read', 'msg');
		}
		else {
			$type = $client = null;
			getSocketInfo($s, $type, $client);
			if($type == 'server') {
				// Message du serveur
				$msg = socket_read($s, BUFFER_LEN);
				if(empty($msg)) {
					// Déconnecté par serveur
					echo "Le client $client s'est fait jarrter par le serveur.\n";
					socket_close($clients[$client]['s_server']);
					if(isset($clients[$client]['s_client_read'])) {
						socket_close($clients[$client]['s_client_read']);
					}
					if(isset($clients[$client]['s_client_write'])) {
						socket_close($clients[$client]['s_client_write']);
					}
					unset($clients[$client]);
				}
				else {
					$msg = str_replace(chr(0xFF), "\n", $msg);
					echo "Message du serveur pour le client $client : '$msg'.\n";
					if(isset($clients[$client]['s_client_read'])) {
						echo "Envoi de '$msg' au client $client...\n";
						socket_write($clients[$client]['s_client_read'], $msg."\n");
            // Le client va de toutes façons fermer la connexion, donc on la ferme aussi pour ne pas avoir à attendre le prochain tour de boucle pour être au courant
            socket_close($clients[$client]['s_client_read']);
            unset($clients[$client]['s_client_read']);
					}
					else {
						echo "Stockage de '$msg' pour le client $client...\n";
						array_push($clients[$client]['msg'], $msg);
					}
				}
			}
			elseif($type == 'client_read' || $type == 'client_write') {
				// Message d'un client
				$msg = @socket_read($s, BUFFER_LEN, PHP_NORMAL_READ);
				$msg = trim($msg, "\r\n");
				if(empty($msg)) {
					// Déconnexion du client
					echo "Le client $client ($type) s'est déconnecté.\n";
					socket_close($clients[$client]['s_'.$type]);
					unset($clients[$client]['s_'.$type]);
					if(preg_match('#^tmp_#', $client)) {
						$tmp_clients--;
					}
				}
        elseif($msg == 'pong') {
          // PONG !
          echo "Client $pnum PONG !\n";
          $clients[$client]['pong'] = true;
        }
        elseif($msg == 'disconnect') {
          // Demande de déconnexion
          echo "Le client $client a quitté le jeu.\n";
          socket_close($clients[$client]['s_server']);
					if(isset($clients[$client]['s_client_read'])) {
						socket_close($clients[$client]['s_client_read']);
					}
					if(isset($clients[$client]['s_client_write'])) {
						socket_close($clients[$client]['s_client_write']);
					}
					unset($clients[$client]);
        }
				elseif(preg_match('#^tmp_#', $client)) {
					if(preg_match('#^connect ([A-Za-z0-9-_]+)$#', $msg, $results)) {
						// Nouveau client
						echo "Nouveau client !\n";
						$pseudo = $results[1];
						// Connexion au serveur et récupération du numéro de client
						$s_server = socket_create(AF_INET, SOCK_STREAM, 0);
						if (socket_connect($s_server, $server_addr, $server_port)) {
							socket_write($s_server, hello_msg($pseudo).chr(0xFF));
							$c_id = 0;
							do {
								$msg = socket_read($s_server, BUFFER_LEN);
								// Connexion refusée (pseudo déjà pris par exemple)
								if(empty($msg)) {
									echo "Connexion refusée par le serveur.\n";
									break;
								}
								else {
									echo "Message du serveur : $msg\n";
									$tb_msg = explode(chr(0xFF), trim($msg, "\xFF"));
									print_r($tb_msg);
									foreach($tb_msg as $msg) {
										if(preg_match('#^playernum ([0-9]+)$#', $msg, $results)) {
											echo "Recup playernum : $msg\n";
											$c_id = $results[1];
										}
										else {
											echo "Stockage : $msg...\n";
											array_push($clients[$client]['msg'], $msg);
										}
									}
								}
							} while(!$c_id);

							// Connexion acceptée
							if($c_id) {	
								socket_write($s, "playernum $c_id\n");
								$clients[$c_id] = $clients[$client];
								$clients[$c_id]['s_server'] = $s_server;
								$clients[$c_id]['last_ping'] = time();
								$clients[$c_id]['pong'] = true;
								unset($clients[$c_id]['s_client_read']); // On va fermer la connexion plus bas
							}
							else {
								socket_write($s, implode("\n", $clients[$client]['msg'])."\n");
							}

							// Dans tous les cas, suppression du client temporaire et fermeture socket (on n'enverra rien d'autre sur cette connexion) 
							unset($clients[$client]);
							$tmp_clients--;
							socket_close($s);
						}
					}
					elseif(preg_match('#^(read|write) ([0-9]+)$#', $msg, $results)) {
						// Retour d'un client
						$rw = $results[1];
						$c_id = $results[2];
						if(isset($clients[$c_id])) {
							echo "Retour du client $c_id ($rw)\n";
							$clients[$c_id]['s_client_'.$rw] = $s;

							if($rw == 'read') {
								/*while(!empty($clients[$c_id]['msg'])) {
									echo "Envoi...\n";
									socket_write($s, array_shift($clients[$c_id]['msg'])."\n");
								}*/
								if(!empty($clients[$c_id]['msg'])) {
									echo "Envoi de messages en attente : ".implode("\n", $clients[$c_id]['msg'])."\n";
									socket_write($s, implode("\n", $clients[$c_id]['msg'])."\n");
                  if (in_array('ping', $clients[$c_id]['msg'])) {
                    echo "DELAYED REPING SENT TO $c_id ".time()."\n";
                  }
									$clients[$c_id]['msg'] = array();
                  // Le client va de toutes façons fermer la connexion, donc on la ferme aussi pour ne pas avoir à attendre le prochain tour de boucle pour être au courant
                  socket_close($clients[$c_id]['s_client_read']);
                  unset($clients[$c_id]['s_client_read']);
								}
							}
						}
						else {
							echo "Demande de retour du client $c_id qui n'existe pas.\n";
							socket_close($s);
						}
						unset($clients[$client]);
						$tmp_clients--;
					}
				}
				else {
					echo "Message du client $client : '$msg'.\n";
					socket_write($clients[$client]['s_server'], $msg.chr(0xFF));
				}
			}
			else {
				// Erreur.
			}
		}
	}

  // Check for timeouts
  foreach($clients as $pnum => $client) {
    if(isset($client['last_ping'])) {
      //echo "PNUM $pnum : last ping {$client['last_ping']}, pong ".(int)$client['pong'].", time ".time()."\n";
      if(!$client['pong'] && time() > $client['last_ping'] + TIMEOUT) {
        echo "DISCONNECT $pnum ".time()."\n";
        // Disconnect client
        socket_close($client['s_server']);
        if(isset($client['s_client_read'])) {
          socket_close($client['s_client_read']);
        }
        if(isset($client['s_client_write'])) {
          socket_close($client['s_client_write']);
        }
        unset($clients[$pnum]);
      }
      elseif($client['last_ping'] < (time() - PING_INTERVAL)) {
        if (isset($clients[$pnum]['s_client_read'])) {
          // Ping client
          echo "REPING $pnum ".time()."\n";
          socket_write($clients[$pnum]['s_client_read'], "ping\n");
          $clients[$pnum]['last_ping'] = time();
          $clients[$pnum]['pong'] = false;
          socket_close($clients[$pnum]['s_client_read']);
          unset($clients[$pnum]['s_client_read']);
        }
        else {
          // Add ping to message queue
          echo "REPING (delayed) $pnum ".time()."\n";
          array_push($clients[$pnum]['msg'], "ping");
          $clients[$c_id]['last_ping'] = time();
          $clients[$c_id]['pong'] = false;
        }
      }
    }
  }
}
?>
