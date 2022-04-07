<?php
namespace TypeNetwork\VideoProof;

class VideoProof {
	public $fontinfo;

	private $tools = array(
// 		'typespec' => "Ramp",
		'grid' => "Array",
// 		'waterfall' => "Waterfall",
//		'grid' => "Grid",
		'type-your-own' => "Input",
		'contextual' => "Contextual",
		'composition' => "Composition",
	);

	private $registeredAxes = array('opsz', 'wdth', 'wght'); //, 'ital', 'slnt', 'grad', 'GRAD');

	private $glyphsets;

	public static function requireLogin($user, $password) {
		if (!isset($_SERVER['PHP_AUTH_USER']) || $_SERVER['PHP_AUTH_USER'] !== $user || $_SERVER['PHP_AUTH_PW'] !== $password) {
			header('HTTP/1.1 401 Unauthorized');
			header('WWW-Authenticate: Basic realm="TN Video Proof"');
			echo 'Varfontnügen';
			exit;
		}
	}

	function __construct() {
		// $this->glyphsets = yaml_parse_file(__DIR__ . '/glyph-groups.yaml');
		$this->glyphsets = json_decode(file_get_contents(__DIR__ . '/glyph-groups.json'), true);
		$this->axesFile = __DIR__ . "/fonts/axes.json";
		if (!file_exists($this->axesFile)) {
			$this->axesFile = __DIR__ . "/fonts/example-axes.json";
		}

		$this->fontinfo = json_decode(file_get_contents($this->axesFile));
		$this->fontinfo = get_object_vars($this->fontinfo);
		ksort($this->fontinfo);

		$specific_font = false;
		if (isset($_SERVER['HTTP_HOST']) and preg_match('/^(.+)-videoproof\./', $_SERVER['HTTP_HOST'], $matches)) {
			$specific_font = strtolower($matches[1]);
		}

		foreach ($this->fontinfo as $filebase => $axes) {
			if ($specific_font) {
				if (strpos(strtolower($filebase), $specific_font) !== 0) {
					unset($this->fontinfo[$filebase]);
					continue;
				}
			}

			if (!isset($axes->wght) || !isset($axes->wdth)) {
				unset($this->fontinfo[$filebase]);
				continue;
			}

			#take off dev stuff from the end of the filename
			//$fontname = preg_replace('/(?:[Vv]\d+|[Aa]lpha|[Bb]eta)?-VF$/', '', $filebase);
			//$fontname = preg_replace('/(?:[Vv]\d+)?-VF$/', '', $filebase);
			$fontname = preg_replace('/-VF$/', '', $filebase);

			#separate into words
			$fontname = preg_replace('/(?<=[a-z])[_-]?(?=[A-Z])/', ' ', $fontname);

			//figure out axis order
			$order = array();

			if (isset($axes->order)) {
				if (!$order) {
					$order = $axes->order;
				}
				unset($axes->order);
			}

			if (isset($axes->instances)) {
				unset($axes->instances);
			}

			if (in_array('instances', $order)) {
				$order = array_diff($order, array('instances'));
			}

			//sanity check on axis order
			foreach ($order as $oaxis) {
				if (!isset($axes->$oaxis)) {
					$order = array();
					break;
				}
				foreach (get_object_vars($axes) as $k => $v) {
					if (!in_array($k, $order)) {
						$order = array();
						break;
					}
				}
			}

			if (!$order) {
				$order = array_keys(get_object_vars($axes));
				usort($order, function($a, $b) {
					//registered, then lowercase, then alphabetic
					// i.e. wght, wdth, opsz, XOPQ, XTRA, YOPQ, YTRA
					$aRegistered = in_array($a, $this->registeredAxes);
					$bRegistered = in_array($b, $this->registeredAxes);
					$aLower = preg_match('/[a-z]/', $a);
					$bLower = preg_match('/[a-z]/', $b);
					if ($aRegistered and !$bRegistered) return -1;
					if ($bRegistered and !$aRegistered) return 1;
					if ($aLower and !$bLower) return -1;
					if ($bLower and !$aLower) return 1;
					if ($a < $b) -1;
					if ($a > $b) 1;
					return 0;
				});
			}

			$this->fontinfo[$filebase] = (object)array(
				'name' => $fontname,
				'axes' => $axes,
				'axisOrder' => $order,
			);
		}
	}

	public function pageHead() {
                print "\n<script>\n"
                . "// With this pattern it's save to load the controller javascript asyncronously.\n"
                . "if(!window.remoteFonts)\n"
                . "     window.remoteFonts = [];\n"
                . "window.remoteFonts.push(\n";
                // push all fonts at once to make it clear which
                // font to put into the UI (the first font).
                foreach ($this->fontinfo as $filebase => $info) {
                    print "'    ./fonts/". $filebase .".woff',\n";
                }
                print ");\n</script>\n";

		foreach ($this->fontinfo as $filebase => $info) {
			print <<<EOD
			<style>
				@font-face {
					font-family: "$filebase-VP";
					src: url("./fonts/$filebase.woff") format("woff");
					font-weight: 100 900;
				}
			</style>
EOD;
		}

		foreach ($this->tools as $tool => $name) {
			print "<link rel='stylesheet' href='layouts/$tool.css'>\n";
		}

		print "<script>\n";
		print "var fontInfo = " . json_encode($this->fontinfo) . ";\n";
		print "var registeredAxes = " . json_encode($this->registeredAxes) . ";\n";
		print "var glyphsets = " . json_encode($this->glyphsets, JSON_UNESCAPED_UNICODE) . ";\n";
		print "</script>\n";

		//foreach ($this->tools as $tool => $name) {
		//	print "<script src='layouts/$tool.js'></script>\n";
		//}

		return "";
	}

	public function selectMode() {
	?>
		<div>
			<h3 class="inline"><label for="select-layout">Layout:</label></h3>
			<select name="mode" id='select-layout'>
<?php foreach ($this->tools as $tool => $name): ?>
				<option value="<?= $tool ?>"><?= $name ?></option>
<?php endforeach ?>
			</select>
		</div>
	<?php
		return "";
	}

	public function selectFont($label="Font") {
	?>
		<div id='select-font-container'>
			<h3 class="inline"><label for="select-font">Family:</label></h3>
			<select name="font" id='select-font'>
<?php foreach ($this->fontinfo as $filebase => $info): ?>
				<option value="<?= $filebase ?>"<?php if ($info->name === 'Amstelvar Roman') print " selected"; ?>><?= $info->name ?></option>
<?php endforeach ?>
			</select>
			<a id='add-your-own-button' style='white-space:nowrap' title="…or drag a font file onto the window">+ Add your own</a>
		</div>
<!--
		<div>
			<h3 class="inline"><label for="select-instance">Style:</label></h3>
			<select name="instance" id='select-instance' aria-label="Instance">
			</select>
		</div>
-->
	<?php
		return "";
	}

	public function color($name='color', $color='black', $label='') {
		if (!$label) {
			$label = ucfirst($name);
		}
	?>
		<div class='color'>
			<label><input type='color' id='<?= $name ?>' name='<?= $name ?>' value='<?= $color ?>'> <?= $label ?></label>
		</div>
	<?php
		return "";
	}

	public function selectGlyphGroup() {
		print <<<EOD
		<div id='select-glyphs-container'>
			<h3 class="inline"><label for="select-glyphs">Glyphs:</label></h3>
			<select id='select-glyphs' name='glyph-group'>
				<optgroup label="All">
					<option value='all-gid' select>All by GlyphID</option>
					<option value='all-groups'>All by group</option>
				</optgroup>
EOD;

print "<!-- ";
var_dump($this->glyphsets);
print " -->";

		$showgroup = function($name, $group, $optgroup=false, $extended='') use (&$showgroup) {
			if ($name[0] === '_') {
				return;
			}
			if (is_array($group)) {
				if (isset($group['_default']) and isset($group['_extended'])) {
					$showgroup($name, $group['_default'], $optgroup, $group['_extended']);
				} else {
					if ($optgroup) {
						print "</optgroup>";
					}
					print "<optgroup label='$name'>";
					foreach ($group as $nn => $gg) {
						$showgroup(is_array($gg) && !isset($gg['_default']) ? "$name $nn" : $nn, $gg, true);
					}
					print "</optgroup>";
				}
			} else {
				print '<option value="' . htmlspecialchars($group) . '"';
				if (!is_string($extended)) {
					$extended = "";
				}

				for ($i=0, $l=mb_strlen($group); $i < $l; $i++) {
					$c = mb_substr($group, $i, 1);
					if (isset($this->glyphsets['_extended'][$c])) {
						$extended .= $this->glyphsets['_extended'][$c];
					}
				}

				if ($extended) {
					print ' data-extended="' . htmlspecialchars($extended) . '"';
				}
				print ">$name</option>";
			}
		};

		foreach ($this->glyphsets as $n => $g) {
			$showgroup($n, $g);
		}

		print <<<EOD
				<option value='misc'>None of the above</option>
			</select>
			<div>
				<input id='show-extended-glyphs' type='checkbox' name='extended'> <label for='show-extended-glyphs'>Show Extended</label>
			</div>
		</div>
EOD;
		return "";
	}

	public function animationControls() {
?>
		<div id='animation-controls'>
			<button type='button' class='beginning' title="Go to start">⏮</button>
			<button type='button' class='back' title="Previous keyframe">⏪</button>
			<button type='button' class='play-pause' title="Play/Pause">⏯</button>
			<button type='button' class='forward' title="Next keyframe">⏩</button>
			<button type='button' class='end' title="Go to end">⏭</button>
<!--
			<input type='range' min="0" max="100" step="0.1" id='animation-scrub' value='0'>
			<label for='animation-scrub'>0</label>
-->
		</div>

		<div id='animation-duration-container'>
			<label for='animation-duration'>Full cycle</label>
			<input id='animation-duration' type='number' min="1" step="1" value="60">sec
		</div>
<?php
		return "";
	}

	public function animationKeyframes() {
?>
		<div id='keyframes-display-container'>
			<label>Keyframes</label>
			<ul id='keyframes-display' class='sidebar-list'>
			</ul>

			<label>But wait, there’s more</label>
			<ul id='moar-axes-display' class='sidebar-list'>
			</ul>
		</div>
<?php
		return "";
	}

	public function lastFontUpdate() {
		$now = time();
		$then = filemtime($this->axesFile);
		$date = date("M j", $then);
		$time = date("H:i", $then);
		$diff = $now - $then;
		if ($diff < 60) {
			return $diff == 1 ? "just now" : "$diff seconds ago";
		}
		$diff = floor($diff/60);
		if ($diff < 60) {
			return $diff == 1 ? "1 minute ago" : "$diff minutes ago";
		}
		$diff = floor($diff/24);
		if ($diff < 24) {
			return $diff == 1 ? "1 hour ago" : "$diff hours ago";
		}
		if ($diff < 48) {
			return "yesterday $time";
		}
		return $date;
	}
}
