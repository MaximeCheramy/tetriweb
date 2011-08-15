<?php
/*
 * Generates the hello message for the specified nickname.
 */ 
function hello_msg($nickname) {
	global $server_addr;

	$ip = $server_addr;
	$s = "tetrisstart $nickname 1.13";
	$h = str_split($ip[0]*54 + $ip[1]*41 + $ip[2]*29 + $ip[3]*17);
	$dec = rand(0, 255);
	$encrypted = sprintf("%02X", $dec & 0xFF);

	for ($i = 0; $i < strlen($s); $i++) {
		$dec = (($dec + ord($s[$i])) % 255) ^ ord($h[$i % count($h)]);
		$encrypted .= sprintf("%02X", $dec & 0xFF);
	}

	return $encrypted;
}

class ClientsList {
	private $clients;
	private $tmp_clients;

	/*
	 * Creates a new clients list.
	 */
	function __construct() {
		$this->clients = array();
		$this->tmp_clients = 0;
	}

	/*
	 * Gets a client from his id.
	 */
	public function get($c_id) {
		return $this->clients[$c_id];
	}

	/*
	 * Adds a new temp client to the clients list.
	 */
	public function add_tmp_client($data) {
		$this->clients['tmp_'.(++$this->tmp_clients)] = new Client($data);
	}

	/*
	 * Removes the given temp client from the clients list.
	 */
	public function delete_tmp_client($c_id) {
		unset($this->clients[$c_id]);
		$this->tmp_clients--;
	}

	/*
	 * Copies a client (e.g., a temp client becomes a "real" client
	 * after he got a playernum from the tetrinet server).
	 */
	public function copy($src_id, $dst_id) {
		$this->clients[$dst_id] = $this->clients[$src_id];
	}

	/*
	 * Checks if the given client exists.
	 */
	public function exists($c_id) {
		return isset($this->clients[$c_id]);
	}

	/*
	 * Disconnects a client from the tetrinet server
	 * and deletes him from the clients list.
	 */
	public function disconnect($c_id) {
		$this->get($c_id)->disconnect();
		unset($this->clients[$c_id]);
	}

	/*
	 * Closes the given socket (read or write) for client $c_id.
	 * If $c_id was a tmp client, delete him.
	 */
	public function close_socket($c_id, $type) {
		$this->get($c_id)->close_socket($type);
		if (preg_match('#^tmp_#', $c_id)) {
			$this->delete_tmp_client($c_id);
		}
	}

	/*
	 * Checks for timeouts and disconnects dead clients.
	 */
	public function handle_timeouts() {
		global $logger;
		foreach ($this->clients as $pnum => $client) {
			if (!preg_match('#^tmp_#', $pnum)) {
				if (!$client->pong && time() > $client->last_ping + TIMEOUT) {
					// Timeout: disconnect client
					$logger->write(INFO, "Client $pnum has timed out (time ".time().") !");
					$client->disconnect();
				} elseif (time() > $client->last_ping + PING_INTERVAL) {
					// Ping client if he's reachable, otherwise his return will be considered as a pong.
					if ($client->can_write()) {
						$logger->write(INFO, "Pinging client $pnum (time ".time().")");
						$client->send_message("ping");
					} else {
						$logger->write(INFO, "Could not ping client $pnum (time ".time()."), his return will be considered as a pong.");
					}
					$client->last_ping = time();
					$client->pong = false;
				}
			}
		}
	}

	/*
	 * Returns an array of all active sockets:
	 * - the socket which is accepting new connections
	 * - sockets connected to the tetrinet server
	 * - sockets connected to clients who want to read from server
	 * - sockets connected to clients who want to write to server
	 */
	public function getAllSockets($s_in) {
		$socks = array($s_in);
		foreach ($this->clients as $client) {
			if (isset($client->s_server)) {
				$socks[] = $client->s_server;
			}
			if (isset($client->s_read)) {
				$socks[] = $client->s_read;
			}
			if (isset($client->s_write)) {
				$socks[] = $client->s_write;
			}
		}
		return $socks;
	}

	/*
	 * Gets the type (server, client_read, client_write) and the id of the client
	 * associated with a given socket.
	 */
	public function getSocketInfo($s) {
		$type = $client = null;
		foreach ($this->clients as $c_id => $client) {
			if (isset($client->s_server) && $s == $client->s_server) {
				$type = 'server';
				$client = $c_id; 
				break;
			}
			if (isset($client->s_read) && $s == $client->s_read) {
				$type = 'client_read';
				$client = $c_id;
				break;
			}
			if (isset($client->s_write) && $s == $client->s_write) {
				$type = 'client_write';
				$client = $c_id;
				break;
			}
		}

		return array($type, $client);
	}
}

class Client {
	public $c_id;
	public $nickname;
	public $s_server;
	public $s_read;
	public $s_write;
	public $server_buffer;
	public $pending_messages;
	public $last_ping;
	public $pong;

	/*
	 * Creates a new client.
	 */
	function __construct($data) {
		$defaults = array(
			'c_id' => null,
			'nickname' => null,
			's_server' => null,
			's_read' => null,
			's_write' => null,
			'server_buffer' => '',
			'pending_messages' => array(),
			'last_ping' => time(),
			'pong' => true,
		);
		$attributes = array_merge($defaults, $data);
		foreach ($attributes as $key => $val) {
			$this->{$key} = $val;
		}
	}

	/*
	 * Determines whether we can send a message to the client
	 * (i.e., if the we have a "read" socket opened with this client)
	 */
	public function can_write() {
		return isset($this->s_read);
	}

	/*
	 * Disconnects a client from the proxy and the tetrinet server by closing
	 * all the sockets opened with him.
	 */
	public function disconnect() {
		socket_close($this->s_server);
		if (isset($s_read)) {
			socket_close($this->s_read);
			$this->s_read = null;
		}
		if (isset($s_write)) {
			socket_close($this->s_write);
			$this->s_write = null;
		}
	}

	/*
	 * Sends a message to a client.
	 * The client will close the connection after receiving the message, so we
	 * close the socket on our side to avoid waiting for the next loop iteration
	 * to know that the client has disconnected.
	 */
	public function send_message($msg) {
		global $logger;
		$logger->write(INFO, "Sending '$msg' to client {$this->c_id}...");
		socket_write($this->s_read, $msg."\n");
		socket_close($this->s_read);
		$this->s_read = null;
	}

	/*
	 * Sends all pending messages to a client when he comes back.
	 */
	public function send_pending_messages() {
		global $logger;
		if (!empty($this->pending_messages)) {
			$_pending_messages = implode("\n", $this->pending_messages);
			$logger->write(INFO, "Sending pending messages to client {$this->c_id}: $_pending_messages\n");
			$this->send_message($_pending_messages);
			$this->pending_messages = array();
		}
	}

	/*
	 * Enqueues a message that will be delivered to the client at his next reconnection.
	 */
	public function enqueue_message($msg) {
		array_push($this->pending_messages, $msg);
	}

	/*
	 * Proxies a message from the client to the tetrinet server.
	 */
	public function proxy_message($msg) {
		socket_write($this->s_server, $msg.chr(0xFF));
	}

	/*
	 * Marks the client as alive.
	 */
	public function pong() {
		$this->pong = true;
	}

	/*
	 * Reassembles the bits of messages received by the tetrinet server to
	 * deliver complete messages to the client. Remaining bits are stored
	 * in a buffer. This is necesseray because TCP is stream-oriented and
	 * does not preserve the boundaries between the messages.
	 */
	public function parse_server_message($msg) {
		$this->server_buffer .= $msg;
		$messages = explode(chr(0xFF), $this->server_buffer);
		$this->server_buffer = array_pop($messages);

		return implode("\n", $messages);
	}

	/*
	 * Closes the given socket (read or write).
	 */
	public function close_socket($type) {
		if ($type == 'client_read') {
			socket_close($this->s_read);
			$this->s_read = null;
		} else if ($type == 'client_write') {
			socket_close($this->s_write);
			$this->s_write = null;
		}
	}

	/*
	 * Updates the given socket (read or write), e.g. when client comes back.
	 */
	public function update_socket($type, $s) {
		if ($type == 'read') {
			$this->s_read = $s;
		} else if ($type == 'write') {
			$this->s_write = $s;
		}
	}

	/*
	 * Sets the client's nickname on the tetrinet server.
	 */
	public function set_nick($nickname) {
		$this->nickname = $nickname;
	}

	/*
	 * Opens a connection to the tetrinet server for the client.
	 */
	public function connect() {
		$this->s_server = socket_create(AF_INET, SOCK_STREAM, 0);
		return socket_connect($this->s_server, SERVER_ADDR, SERVER_PORT);
	}

	/*
	 * Gets the playernum of the client from the tetrinet server.
	 */
	function get_playernum() {
		global $logger;
		$c_id = 0;
		$this->server_buffer = '';
		do {
			$msg = socket_read($this->s_server, BUFFER_LEN);
			// Connection refused (e.g., nickname already in use)
			if (empty($msg)) {
				$logger->write(WARN, "Connection refused by the tetrinet server.");
				break;
			} else {
				$logger->write(INFO, "Message from server: $msg");
				$this->server_buffer .= $msg;
				$tb_msg = explode(chr(0xFF), $this->server_buffer);
				$this->server_buffer = array_pop($tb_msg);
				foreach ($tb_msg as $msg) {
					if (preg_match('#^playernum ([0-9]+)$#', $msg, $results)) {
						$c_id = $results[1];
						$logger->write(INFO, "Server has given playernum $c_id");
					} else {
						array_push($this->pending_messages, $msg);
					}
				}
			}
		} while(!$c_id);

		if ($c_id) {
			$this->c_id = $c_id;
		}

		return $c_id;
	}
}
?>
