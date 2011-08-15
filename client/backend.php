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

require_once('backend.inc.php');
require_once('../log.inc.php');
fix_magic_quotes();
set_time_limit(0);

define('PROXY_HOST', 'localhost');
define('PROXY_PORT', 1234);

$logger = new Logger('log_backend.html');

// Client doesn't want to connect and didn't give his playernum: bad request
if (empty($_GET['connect']) && empty($_GET['pnum'])) {
  header('HTTP/1.1 400 Bad Request');
  die();
}

// Connect to proxy
$sock = socket_create(AF_INET, SOCK_STREAM, 0);
if (!socket_connect($sock, PROXY_HOST, PROXY_PORT)) {
  header('HTTP/1.1 500 Internal Server Error');
  die();
}

// Connect to tetrinet server through the proxy
if (!empty($_GET['connect'])) {
  $pseudo = $_GET['connect'];
  $logger->write(INFO, "CONNECT from new client ($pseudo)"); 
  socket_write($sock, "connect $pseudo\n");
  $msg = read_messages($sock);
  socket_close($sock);
  
  $logger->write(INFO, "[proxy >>> $pseudo] $msg");
  $logger->write_separator();

  // Extract playernum from the response
  $response = array();
  $data = explode(' ', trim($msg), 2);
  if($data[0] == 'playernum') {
    $response['pnum'] = (int)$data[1];
  } else {
    $response['error'] = $data[1];
  }

  // Output response
  die(json_encode($response));
}

// Read from or write to proxy
if (!empty($_GET['pnum'])) {
  $pnum = (int)$_GET['pnum'];

  if(isset($_GET['send'])) {
    // Send a message (write)
    $logger->write(INFO, "WRITE from client $client");
    $send = $_GET['send'];
    socket_write($sock, "write $pnum\n");
    socket_write($sock, $send."\n");
    socket_close($sock);
    $logger->write(INFO, "[client $client >>> proxy] $send");
    $logger->write_separator();
    die();
  } else {
    // Read from tetrinet server through the proxy
    $logger->write(INFO, "READ from client $client");
    socket_write($sock, "read $pnum\n");
    $msg = read_messages($sock);
    socket_close($sock);

    if (empty($msg)) {
      // Connection closed by the proxy: something is wrong
      header('HTTP/1.1 410 Gone');
      die();
    }

    $logger->write(INFO, "[proxy >>> client $client] $msg");
    $logger->write_separator();
    
    // Output received messages
    $response = array();
    $response['msg'] = explode("\n", trim($msg));
    format_messages($response['msg']);
    die(json_encode($response));
  }
}

// Close the connection to the proxy
socket_close($sock);
?>
