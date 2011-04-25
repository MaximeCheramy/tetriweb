<?php
require_once('proxy.inc.php');

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
          disconnect_client($client);
        }
        else {
          $msg = parse_server_message($msg, $client);
          echo "Message(s) du serveur pour le client $client : '$msg'.\n";
          if(isset($clients[$client]['s_client_read'])) {
            send_message($msg, $client);
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
          echo "Client $client PONG !\n";
          $clients[$client]['pong'] = true;
        }
        elseif($msg == 'disconnect') {
          // Demande de déconnexion
          echo "Le client $client a quitté le jeu.\n";
          disconnect_client($client);
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
              get_playernum($s_server, $client, $c_id, $server_buffer);

              // Connexion acceptée
              if($c_id) {
                // Stockage nouveau client
                $clients[$c_id] = $clients[$client];
                $clients[$c_id]['s_server'] = $s_server;
                $clients[$c_id]['last_ping'] = time();
                $clients[$c_id]['pong'] = true;
                $clients[$c_id]['server_buffer'] = $server_buffer;
                
                send_message("playernum $c_id", $c_id);
              }
              else {
                // Envoi de tous les messages envoyés par le serveur au client, il se débrouillera pour retrouver la raison de l'échec de connexion dedans
                send_message(implode("\n", $clients[$client]['msg']), $client);
              }

              remove_tmp_client($client);
            }
            else {
              // TODO: erreur.
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
                send_pending_messages($c_id);
              }
            }
            else {
              echo "Demande de retour du client $c_id qui n'existe pas.\n";
              socket_close($s);
            }
            remove_tmp_client($client);
          }
        }
        else {
          echo "Message du client $client : '$msg'.\n";
          socket_write($clients[$client]['s_server'], $msg.chr(0xFF));
        }
      }
      else {
        // TODO: erreur.
      }
    }
  }

  // Check for timeouts
  handle_timeouts();
}
?>
