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

/*
 * Disables magic quotes at runtime.
 * @see http://php.net/manual/en/security.magicquotes.disabling.php
 */
function fix_magic_quotes() {
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
}

/*
 * Reads from a socket until it reaches a delimiter.
 * This is because messages are carried by TCP which is stream-oriented.
 */
function read_messages($sock) {
  $buf = '';
  do {
    $msg = socket_read($sock, 1024*1024); // blocking
    $buf .= $msg;
  } while (!empty($msg) && substr($buf, -1) != "\n");
  return $buf;
}

/*
 * Formats messages received from tetrinet server.
 * TODO: handle special characters instead of clearing them!
 */
function format_messages(&$messages) {
  foreach ($messages as &$msg) {
    $new_msg = '';
    $msg = trim($msg);
    for ($i = 0; $i < strlen($msg); $i++) {
      if (ord($msg[$i]) >= 32) {
        $new_msg .= $msg[$i];
      }
    }
    $msg = $new_msg;
  }
}
