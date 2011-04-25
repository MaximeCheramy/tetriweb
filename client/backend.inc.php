<?php
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

function read_messages($sock) {
  $buf = '';
  do {
    $msg = socket_read($sock, 1024*1024); // blocking
    $buf .= $msg;
  } while (!empty($msg) && substr($buf, -1) != "\n");
  return $buf;
}

function format_messages(&$messages) {
  // On vire les caractères de mise en forme à défaut de les gérer :)
  foreach($messages as &$msg) {
    $new_msg = "";
    $msg = trim($msg);
    for($i = 0; $i < strlen($msg); $i++) {
      if(ord($msg[$i]) >= 32) {
        $new_msg .= $msg[$i];
      }
    }
    $msg = $new_msg;
  }
}
