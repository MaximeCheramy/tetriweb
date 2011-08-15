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
declare(ticks = 1);

require_once('log.inc.php');
require_once('clients.inc.php');

define('BUFFER_LEN', 1024);
define('PING_INTERVAL', 20);
define('TIMEOUT', 10);
define('LISTEN_PORT', 1234);
define('SERVER_ADDR', 'localhost');
define('SERVER_PORT', 31457);

function sig_handler($signo) {
  global $s_in;
  echo "Graceful stop.\n";
  switch ($signo) {
    case SIGINT:
      socket_close($s_in);
      exit;
      break;
  }
}

// Setup signal handler
pcntl_signal(SIGINT, "sig_handler");

// Open a socket and listen for connections
$s_in = socket_create(AF_INET, SOCK_STREAM, 0);
socket_set_option($s_in, SOL_SOCKET, SO_REUSEADDR, 1);
socket_bind($s_in, 0, LISTEN_PORT);
socket_listen($s_in);

$clients = new ClientsList();
$logger = new Logger('log_proxy.html');

while (true) {
  // Check traffic on all the sockets using select()
  $r = $clients->getAllSockets($s_in);
  $w = null;
  $e = null;

  if (false === socket_select($r, $w, $e, NULL)) {
    $logger->write(ERR, "socket_select() failed : " . socket_strerror(socket_last_error()));
  }

  foreach ($r as $s) {
    $logger->write_separator();
    if ($s == $s_in) {
      // Incoming client
      $logger->write(INFO, "Incoming client...");
      $s_read = socket_accept($s_in);
      $clients->add_tmp_client(compact('s_read'));
    } else {
      list($type, $client) = $clients->getSocketInfo($s);
      if ($type == 'server') {
        // Message(s) from server
        $msg = socket_read($s, BUFFER_LEN);
	$logger->write(INFO, "Server input for client $client: '$msg'");
        if (strlen($msg) == 0) {
          // Server closed the connection
          $logger->write(WARN, "Client $client has been disconnected by the server.");
          $clients->disconnect($client);
        } else {
          // Relay the messages to the client
          $msg = $clients->get($client)->parse_server_message($msg);
          $logger->write(INFO, "Server messages for client $client: '$msg'");
          if (strlen($msg) > 0) {
            if ($clients->get($client)->can_write()) {
              $clients->get($client)->send_message($msg);
            } else {
              $logger->write(INFO, "Storing '$msg' for client $client...");
              $clients->get($client)->enqueue_message($msg);
            }
          }
        }
      } elseif($type == 'client_read' || $type == 'client_write') {
        // Message(s) from client
        $msgsocket = @socket_read($s, BUFFER_LEN, PHP_NORMAL_READ);
        $msg = trim($msgsocket, "\r\n");
        if (empty($msgsocket)) {
          $logger->write(INFO, "Client $client ($type) has disconnected.");
          $clients->close_socket($client, $type);
        } elseif ($msg == 'pong') {
          $logger->write(INFO, "Client $client PONG !");
          $clients->get($client)->pong();
        } elseif ($msg == 'disconnect') {
          $logger->write(INFO, "Client $client has quitted the game.");
          $clients->disconnect($client);
        } elseif (preg_match('#^tmp_#', $client)) {
          if (preg_match('#^connect ([A-Za-z0-9-_]+)$#', $msg, $results)) {
            // New client
            $pseudo = $results[1];
            $logger->write(INFO, "New client ($pseudo) !");
            // Connect to tetrinet server and get playernum
            if ($clients->get($client)->connect()) {
              $clients->get($client)->proxy_message(hello_msg($pseudo));
              if ($c_id = $clients->get($client)->get_playernum()) {
                // Connection accepted, store new client
                $logger->write(INFO, "$pseudo got playernum $c_id.");
                $clients->copy($client, $c_id);
		$clients->get($c_id)->set_nick($pseudo);
                // Send the client his playernum 
                $clients->get($c_id)->send_message("playernum $c_id");
              } else {
                // Connection refused: send all the messages received from server to the client, he will figure out the reason of the failure
                $clients->get($client)->send_message(implode("\n", $clients->get($client)->get_server_messages()));
              }
              // Clear temp client
              $clients->delete_tmp_client($client);
            } else {
              $logger->write(ERR, "Unable to connect to tetrinet server. Stopping.");
              exit(1);
            }
          } elseif (preg_match('#^(read|write) ([0-9]+)$#', $msg, $results)) {
            // Returning client
            $rw = $results[1];
            $c_id = $results[2];
            // Do we know this client ?
            if ($clients->exists($c_id)) {
              $logger->write(INFO, "Client $c_id came back ($rw)");
              $clients->get($c_id)->update_socket($rw, $s);
              // If he wants to read from server, send him all pending messages
              if ($rw == 'read') {
                $clients->get($c_id)->send_pending_messages();
              }
              // Client is alive
              $clients->get($c_id)->pong();
            } else {
              $logger->write(WARN, "Unknown client ($c_id) wanted to come back ($rw).");
              socket_close($s);
            }
            // Clear temp client
            $clients->delete_tmp_client($client);
          } else {
            $logger->write(WARN, "Ignoring unknown command '$msg' from temp client $c_id.");
          }
        } else {
          $logger->write(INFO, "Message from client $client: '$msg'");
          $clients->get($client)->proxy_message($msg);
        }
      } else {
        $logger->write(ERR, "Should not reach here: unknown socket type.");
      }
    }
  }

  // Check for timeouts
  $clients->handle_timeouts();
}
?>
