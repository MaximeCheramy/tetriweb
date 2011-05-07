<?php
/**
 * This file is part of TetriWeb.
 *
 * TetriWeb is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * TetriWeb is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 * 
 * You should have received a copy of the GNU General Public License
 * along with TetriWeb.  If not, see <http://www.gnu.org/licenses/>.
 */

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

function disconnect_client($client) {
  global $clients;

  socket_close($clients[$client]['s_server']);
  if(isset($clients[$client]['s_client_read'])) {
    socket_close($clients[$client]['s_client_read']);
  }
  if(isset($clients[$client]['s_client_write'])) {
    socket_close($clients[$client]['s_client_write']);
  }
  unset($clients[$client]);
}

function parse_server_message($msg, $client) {
  global $clients; 

  $clients[$client]['server_buffer'] .= $msg;
  $messages = explode(chr(0xFF), $clients[$client]['server_buffer']);
  $clients[$client]['server_buffer'] = array_pop($messages);
  $msg = implode("\n", $messages);

  return $msg;
}

function send_message($msg, $client) {
  global $clients;

  echo "Envoi de '$msg' au client $client...\n";
  socket_write($clients[$client]['s_client_read'], $msg."\n");
  // Le client va de toutes façons fermer la connexion, donc on la ferme aussi pour ne pas avoir à attendre le prochain tour de boucle pour être au courant
  socket_close($clients[$client]['s_client_read']);
  unset($clients[$client]['s_client_read']);
}

function send_pending_messages($client) {
  global $clients;

  if(!empty($clients[$client]['msg'])) {
    $pending_messages = implode("\n", $clients[$client]['msg']);
    echo "Envoi de messages en attente : $pending_messages\n";
    send_message($pending_messages, $client);
    if (in_array('ping', $clients[$client]['msg'])) {
      echo "DELAYED REPING SENT TO $client ".time()."\n";
    }
    $clients[$client]['msg'] = array();
  }
}

function remove_tmp_client($client) {
  global $clients, $tmp_clients;
            
  unset($clients[$client]);
  $tmp_clients--;
}

function get_playernum($s_server, $client, &$c_id, &$server_buffer) {
  global $clients;

  $c_id = 0;
  $server_buffer = '';
  do {
    $msg = socket_read($s_server, BUFFER_LEN);
    // Connexion refusée (pseudo déjà pris par exemple)
    if(empty($msg)) {
      echo "Connexion refusée par le serveur.\n";
      break;
    }
    else {
      echo "Message du serveur : $msg\n";
      $server_buffer .= $msg;
      $tb_msg = explode(chr(0xFF), $server_buffer);
      $server_buffer = array_pop($tb_msg);
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
}

function handle_timeouts() {
  global $clients;

  foreach($clients as $pnum => $client) {
    if(isset($client['last_ping'])) {
      //echo "PNUM $pnum : last ping {$client['last_ping']}, pong ".(int)$client['pong'].", time ".time()."\n";
      if(!$client['pong'] && time() > $client['last_ping'] + TIMEOUT) {
        echo "DISCONNECT $pnum ".time()."\n";
        disconnect_client($pnum);
      }
      elseif($client['last_ping'] < (time() - PING_INTERVAL) && !in_array('ping', $clients[$pnum]['msg'])) {
        // Ping client...
        if (isset($clients[$pnum]['s_client_read'])) {
          // ... now !
          echo "REPING $pnum ".time()."\n";
          socket_write($clients[$pnum]['s_client_read'], "ping\n");
          socket_close($clients[$pnum]['s_client_read']);
          unset($clients[$pnum]['s_client_read']);
        }
        else {
          // ... when he comes back
          echo "REPING (delayed) $pnum ".time()."\n";
          array_push($clients[$pnum]['msg'], "ping");
        }
        $clients[$pnum]['last_ping'] = time();
        $clients[$pnum]['pong'] = false;
      }
    }
  }
}
?>
