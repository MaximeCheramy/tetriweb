<?php
define('ERR', 1);
define('WARN', 2);
define('INFO', 3);

class Logger {
	private $fd;
	private $rep_in  = array('SEPARATOR', 'LF');
	private $rep_out = array('<hr />', '<br />');

	function __construct($filename) {
		$this->fd = fopen($filename, 'a');
	}

	function __destruct() {
		fclose($this->fd);
	}

	public function write($level, $msg) {
		$date = date('Y-m-d H:i:s');
		switch ($level) {
			case ERR:
				$color = 'red';
				$level_str = 'ERROR';
				break;
			case WARN:
				$color = 'orange';
				$level_str = 'WARNING';
				break;
			case INFO:
				$color = 'blue';
				$level_str = 'INFO';
				break;
			default:
				$color = 'black';
				$level_str = '???';
		}
		$level_str = "<span style=\"font-weight: bold; color:$color\">$level_str</span>";
		$msg = str_replace($this->rep_in, $this->rep_out, $msg);
		fwrite($this->fd, "[$date] [$level_str] $msg<br />");
	}

	public function write_separator() {
		fwrite($this->fd, "<hr />");
	}
}
?>
