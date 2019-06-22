<?php
namespace TypeNetwork\TypeTools;

class TypeTools {
	public $fontinfo;
	private $slidercount = 0;
	
	private $tools = array(
// 		'typespec' => "Ramp", 
		'proof' => "Array",
// 		'waterfall' => "Waterfall",
//		'grid' => "Grid",
		'logopogo' => "Input", 
	);
	
	private $registeredAxes = array('opsz', 'wdth', 'wght', 'ital', 'slnt', 'grad', 'GRAD');
	
	private $glyphsets = array(
		'Latin Uppercase' => [
			'A-Z' => 'ABCDEFGHIJKLMNOPQRSTUVWXYZ&',
			'Extended' => 'ÀÁÂÃÄÅĀĂǺȀȂẠẢẤẦẨẪẬẮẰẲẴẶĄÆǼÇĆĈĊČĎÐĐǄÈÉÊËĒĔĖĘĚȄȆẸẺẼẾỀỂỄỆƏÞĜĞĠĢǦĤĦÌÍÎÏĨĪĬĮİȈȊỈỊĲĴĶĹĻĽĿŁǇÑŃŅŇŊǊÒÓÔÕÖŌŎŐƠǪȌȎȪȬȰỌỎỐỒỔỖỘỚỜỞỠỢØǾŒÙÚÛÜŔŖŘȐȒŚŜŞŠȘẞŢŤȚŦŨŪŬŮŰŲƯȔȖỤỦỨỪỬỮỰŴẀẂẄÝŶŸȲỲỴỶỸŹŻŽ', // /IJacute
			'Mixed case' => 'ǅǈǋǉ',

/*
			'A' => 'ÀÁÂÃÄÅĀĂǺȀȂẠẢẤẦẨẪẬẮẰẲẴẶÆǼ',
			'C' => 'ÇĆĈĊČ',
			'D' => 'ĎÐĐǄǅ',
			'E' => 'ÈÉÊËĒĔĖĘĚȄȆẸẺẼẾỀỂỄỆÆǼŒ',
			'G' => 'ĜĞĠĢǦ',
			'H' => 'ĤĦ',
			'I' => ' ÌÍÎÏĨĪĬĮİȈȊỈỊĲǉǇǊ', // /IJacute 
			'J' => 'ĴĲ', // /IJacute
			'K' => 'Ķ',
			'L' => 'ĹĻĽĿŁǇǈ',
			'N' => 'ÑŃŅŇŊǊǋ',
			'O' => 'ÒÓÔÕÖŌŎŐƠǪȌȎȪȬȰỌỎỐỒỔỖỘỚỜỞỠỢØǾŒ',
			'P' => 'Þ',
			'R' => 'ŔŖŘȐȒ',
			'S' => 'ŚŜŞŠȘẞ',
			'T' => 'ŢŤȚŦ',
			'U' => 'ÙÚÛÜŨŪŬŮŰŲƯȔȖỤỦỨỪỬỮỰ',
			'W' => 'ŴẀẂẄ',
			'Y' => 'ÝŶŸȲỲỴỶỸ',
			'Z' => 'ŹŻŽǄ',
*/
		],
		'Latin Lowercase' => [
			'a–z' => 'abcdefghijklmnopqrstuvwxyz',
			'extended' => 'àáâãäåāăąǻȁȃạảấầẩẫậắằẳẵặæǽçćĉċčďđǆèéêëēĕėęěȅȇẹẻẽếềểễệəþﬀﬁﬂﬃﬄĝğġģǧĥħıĩīĭįȉȋỉịìíîïĳȷĵķĸĺļľŀłðñńņňŉŋǌòóôõöōŏőơǫȍȏȫȭȱọỏốồổỗộớờởỡợøǿœŕŗřȑȓśŝşšșßţťțŧùúûüũūŭůűųưȕȗụủứừửữựŵẁẃẅýÿŷȳỳỵỷỹźżž', // /f_f_ij /f_ij /idotaccent /ijacute
			'superiors' => 'ªº',
			
/*
			'a' => 'àáâãäåāăąǻȁȃạảấầẩẫậắằẳẵặæǽ',
			'c' => 'çćĉċč',
			'd' => 'ďđǆð',
			'e' => 'èéêëēĕėęěȅȇẹẻẽếềểễệəæǽœ',
			'f' => 'ﬀﬁﬂﬃﬄ', // /f_f_ij /f_ij ',
			'g' => 'ĝğġģǧ',
			'h' => 'ĥħ',
			'i' => 'ıĩīĭįȉȋỉịìíîïĳﬁﬃ', // /idotaccent /ijacute /f_ij /f_f_ij',
			'j' => 'ȷĵǉĳǌǈ', ///f_ij  /f_f_ij
			'k' => 'ķĸ',
			'l' => 'ĺļľŀłﬂﬄ',
			'n' => 'ñńņňŉŋǌ',
			'o' => 'òóôõöōŏőơǫȍȏȫȭȱọỏốồổỗộớờởỡợøǿœ',
			'p' => 'þ',
			'r' => 'ŕŗřȑȓ',
			's' => 'śŝşšșß',
			't' => 'ţťțŧ',
			'u' => 'ùúûüũūŭůűųưȕȗụủứừửữự',
			'w' => 'ŵẁẃẅ',
			'y' => 'ýÿŷȳỳỵỷỹ',
			'z' => 'źżžǅ',
*/
		],
		'Figures' => [
			'default figures' => '0123456789',
			'proportional' => ['chars' => '0123456789', 'feature' => 'pnum'],
			'tabular' => ['chars' => '0123456789', 'feature' => 'tnum'],
			'lining' => ['chars' => '0123456789', 'feature' => 'lnum'],
			'oldstyle' => ['chars' => '0123456789', 'feature' => 'onum'],
			'extended figures' => '⁰¹²³⁴⁵⁶⁷⁸⁹⅛⅙⅕¼⅓⅜⅖½⅗⅔⅝¾⅘⅚⅞%‰',
		],
		'Monetary' => [
			'Latin $' => '$¢£¥',
			'World ¤' => '₡₣₤₦₧₩₫€ƒ₭₱₲₵₹₺₼₽¤',
		],
		'Symbols' => [
			'Latin punctuation' => ',-.:;…∙·!¡?¿–—―‐',
			'Latin reference' => '*§¶†‡•',
			'Latin quotation' => '"\'“”‚„‹›«»′″',
			'Latin parenthetical' => '()[]{}',
			'Latin math' => '+÷×−±<>≤≥≈≠=^~¬∕­/',
			'Latin commercial' => '®©™#@⁒ʹʺ/\¦|_№⟨⟩µ⁄',
		],
		'Accents' => [
			'Latin encoded' => '`¨¯°´ˆˇ˘˙˚˛˜˝‘’¸ʼ',
			'Latin combining' => 'ˉ̧̨̛̣̤̦̮̱̀́̂̃̄̆̇̈̉̊̋̌̏̑',
		],
	);
	
	public static function requireLogin($user, $password) {
		if (!isset($_SERVER['PHP_AUTH_USER']) || $_SERVER['PHP_AUTH_USER'] !== $user || $_SERVER['PHP_AUTH_PW'] !== $password) {
			header('HTTP/1.1 401 Unauthorized');
			header('WWW-Authenticate: Basic realm="TN Type Tools"');
			echo 'Varfontnügen';
			exit;
		}	
	}

	function __construct() {
		$this->fontinfo = json_decode(file_get_contents("{$_SERVER['DOCUMENT_ROOT']}/fonts/axes.json"));
		$this->fontinfo = get_object_vars($this->fontinfo);
		ksort($this->fontinfo);
			
		$specific_font = false;
		if (preg_match('/^(.+)-var\./', $_SERVER['HTTP_HOST'], $matches)) {
			$specific_font = strtolower($matches[1]);
		}
		
		foreach ($this->fontinfo as $filebase => $axes) {
			if ($specific_font) {
				if (strpos(strtolower($filebase), $specific_font) !== 0) {
					unset($this->fontinfo[$filebase]);
					continue;
				}
			} else if ($this->excludeFonts and preg_match('/^(' . implode('|', $this->excludeFonts) . ')/', $filebase)) {
				unset($this->fontinfo[$filebase]);
				continue;
			}
			
/*
			if (!isset($axes->wght) || !isset($axes->wdth)) {
				unset($this->fontinfo[$filebase]);
				continue;
			}
*/
	
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

	public function pageHead($title) {
	?>
<!DOCTYPE html>
<html lang="en" id="typetools">
	<head>
		<meta charset="utf-8">
		<title><?= $title ?></title>
		<meta name="viewport" content="initial-scale=1,shrink-to-fit=no">
		<link rel="stylesheet" href="https://www.typenetwork.com/assets_content/css/reset.css">
		<link rel="stylesheet" href="https://www.typenetwork.com/assets_content/css/adobe-blank.css">
		<link rel="stylesheet" href="https://www.typenetwork.com/assets_content/css/fonts-momentum-sans.css">
		<link rel="stylesheet" href="https://www.typenetwork.com/assets_content/css/style.css">
		<link rel="icon" type="image/png" href="/favicon-32x32.png" sizes="32x32">
		<script src="https://ajax.googleapis.com/ajax/libs/jquery/3.3.1/jquery.min.js"></script>
		<script src="/opentype.js/dist/opentype.min.js"></script>
		<script src="/spectrum/spectrum.js"></script>
		<link rel="stylesheet" href="/spectrum/spectrum.css">

		<style id='videoproof-keyframes'></style>
		
		<style>
<?php foreach ($this->fontinfo as $filebase => $info): ?>
			@font-face {
				font-family: "<?= $filebase ?>-VP";
				src: url("/fonts/<?= $filebase ?>.woff") format("woff");
				font-weight: 100 900;
			}
<?php endforeach; ?>
		</style>
		<link rel="stylesheet" href="tools.css">
		<link rel="stylesheet" href="form-controls.css">
<?php foreach ($this->tools as $tool => $name): ?>
		<link rel="stylesheet" href="<?= $tool ?>/<?= $tool ?>.css">
<?php endforeach; ?>
		<script>
			var fontInfo = <?= json_encode($this->fontinfo) ?>;
			var registeredAxes = <?= json_encode($this->registeredAxes) ?>;
			var glyphsets = <?= json_encode($this->glyphsets) ?>;
		</script>
		<script src="https://www.typenetwork.com/assets_content/js/functions.js"></script>
		<script src="tools.js"></script>
<?php foreach ($this->tools as $tool => $name): ?>
		<script src="<?= $tool ?>/<?= $tool ?>.js"></script>
<?php endforeach; ?>
	</head>
	<body>
		<div class="wrapper">
			<header class="header-global">
				<h1><a href="https://www.typenetwork.com/">Type Network</a></h1>
			</header>
		
			<nav class="nav-global">
				<a class="nav-global-reveal" href="#">Menu</a>
				<ul>
					<li><a class="nav-home-link" href="https://www.typenetwork.com/">Home</a></li>
					<li><a href="http://store.typenetwork.com">Fonts</a></li>
					<li><a href="https://www.typenetwork.com/news" >News</a></li>
					<li><a href="https://www.typenetwork.com/gallery" >Gallery</a></li>
				</ul>
			</nav>
			
			<nav class="nav-user">
				<a class="nav-user-reveal" href="#">Menu</a>
				<ul>
					<li><a href="http://store.typenetwork.com/account/licenses" class="nav-user-account"></a></li>
					<li><a href="http://store.typenetwork.com/account/favorites" class="nav-user-favorites"></a></li>
					<li><a href="http://store.typenetwork.com/cart" class="nav-user-cart"></a></li>
				</ul>
			</nav>
			
			<?= $this->pageSidebar() ?>
			
			<div class="content-main">
				<a class="content-options-show-filters" href="#">Sidebar</a>
				<output id='aniparams'>This animation will eat your CPU alive (depending on browser), so it doesn’t auto-start. Ready? <span id='first-play'>▶️</span></output>

<?php
		return "";
	}

	public function pageSidebar() {
?>
			<aside class="content-filters">
				<a class="content-filters-close" href="#">Close</a>

				<form id='controls'>
					<?= $this->selectMode() ?>
					<?= $this->selectFont() ?>

					<div id='alignment-color'>
						<label for='foreground'>Foreground</label>
						<div class='color'><input type='color' id='foreground' name='foreground' value='black'></div>
						<label for='background'>Background</label>
						<div class='color'><input type='color' id='background' name='background' value='white'></div>
					</div>
					
					<?= $this->animationControls(); ?>

					<ul id='axis-inputs'>
					</ul>
					<?= $this->metaLinks() ?>
				</form>

			</aside>
<?php
		return "";
	}
	
	public function pageSections() {
		print "<div id='mode-sections'>";
		foreach ($this->tools as $tool => $name) {
			print "<section id='$tool'>";
			include("$tool/$tool.php");
			print "</section>";
		}
// 		print "<div id='css-output'></div>";
		print "</div>";
		return "";
	}
	
	public function pageFoot() {
?>
				<footer class="footer-global">
					<ul>
						<li><a href="//www.typenetwork.com/about">About Type Network</a></li>
						<li><a href="//www.typenetwork.com/about#subscribe">Subscribe to the Newsletter</a></li>
						<li><a href="//www.typenetwork.com/support">Help and Support</a></li>
					</ul>
					<p>&copy; Type Network <?= date("Y") ?>. All rights reserved.</p>
				</footer>
			</div> <!-- content-main -->
		</div> <!-- wrapper -->
	</body>
</html>
<?php
		return "";
	}
	
	public function selectMode() {
	?>
		<div>
			<h3 class="inline"><label for="select-mode">Layout:</label></h3>
			<select name="mode" id='select-mode'>
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
		<div>
			<h3 class="inline"><label for="select-font">Family:</label></h3>
			<select name="font" id='select-font'>
<?php foreach ($this->fontinfo as $filebase => $info): ?>
				<option value="<?= $filebase ?>"<?php if ($info->name === 'Amstelvar Roman') print " selected"; ?>><?= $info->name ?></option>
<?php endforeach ?>
			</select>
			<input type='file' name='custom-fonts' id='custom-fonts'>
			<a id='add-your-own-button' href='#add-your-own' style='white-space:nowrap' title="…or drag a font file onto the window">+ Add your own</a>
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
	
	public function sizeLeading($size, $leading, $min=8, $max=96) {
	?>
		<div id='size-leading'>
			<label for='edit-size'>Size:</label>
			<input type="number" name='size' id='edit-size' min='<?= $min ?>' max='<?= $max ?>' value='<?= $size ?>'>
			<label for='edit-to-size' style='display:none'>to</label>
			<input type="number" name='to-size' style='display:none' id='edit-to-size' min='<?= $min ?>' max='<?= $max ?>' value='<?= $size ?>'>
			<label for='edit-leading'>Leading:</label>
			<input type="number" name='leading' id='edit-leading' min='<?= $min ?>' max='<?= ($max*2) ?>' value='<?= $leading ?>'>
		</div>
	<?php
		return "";
	}
	
	public function slider($options=array()) {
		if (!is_array($options)) {
			$options = array(
				'id' => $options,
				'name' => $options,
			);
		}
		++$this->slidercount;
		if (empty($options['id'])) {
			$options['id'] = "slider-{$this->slidercount}";
		}
		if (empty($options['name'])) {
			$options['name'] = "slider-{$this->slidercount}";
		}
		if (empty($options['label'])) {
			$options['label'] = ucfirst($options['name']);
		}
	?>
		<div class='slider'>
			<label for="input-<?= $options['id'] ?>"><?= $options['label'] ?></label>
			<input type='number' id="edit-<?= $options['id'] ?>" name='<?= $options['name'] ?>' min='<?= isset($options['min']) ? $options['min'] : 1 ?>' max='<?= isset($options['max']) ? $options['max'] : 1000 ?>' value='<?= isset($options['default']) ? $options['default'] : 500 ?>'>
			<input type='range' id="input-<?= $options['id'] ?>" name='<?= $options['name'] ?>' min='<?= isset($options['min']) ? $options['min'] : 1 ?>' max='<?= isset($options['max']) ? $options['max'] : 1000 ?>' value='<?= isset($options['default']) ? $options['default'] : 500 ?>' step='<?= isset($options['step']) ? $options['step'] : 1 ?>'>
		</div>
	<?php
		return "";
	}
	
	public function animationControls() {
?>
		<div>
			<h3 class="inline"><label for="select-glyphs">Glyphs:</label></h3>
			<select name="glyphs" id='select-glyphs'>
				<option value='all'>All</option>
<?php foreach ($this->glyphsets as $group => $sets): ?>
	<?php if (is_array($sets)): ?>
				<optgroup label="<?= $group ?>">
	<?php foreach ($sets as $k => $glyphset): ?>
					<option value="<?= "$group::$k" ?>"><?= $k ?></option>
	<?php endforeach; ?>
	<?php if (count($sets) > 1): ?>
					<option value="<?= "$group::concat" ?>">All <?=$group?></option>
	<?php endif; ?>
				</optgroup>
	<?php else: ?>
		<option value="<?= "$group" ?>"><?= $group ?></option>
	<? endif; ?>
<?php endforeach ?>
				<optgroup label="Orphans">
					<option value="orphans">None of the above</option>
				</optgroup>
			</select>
		</div>

		<div id='animation-controls'>
			<button type='button' class='beginning' title="Go to start">⏮</button>
			<button type='button' class='back' title="Previous keyframe">⏪</button>
			<button type='button' class='play-pause' title="Play/Pause">⏯</button>
			<button type='button' class='forward' title="Next keyframe">⏩</button>
			<button type='button' class='end' title="Go to end">⏭</button>
			<input type='range' min="0" max="100" step="0.1" id='animation-scrub' value='0'>
			<label for='animation-scrub'>0</label>
		</div>
		
		<label>Keyframes</label>
		<ul id='keyframes-display'>
		</ul>
		
		<label for='animation-duration'>Full cycle</label>
		<input id='animation-duration' type='number' min="1" step="1" value="60">sec
<?php
		return "";
	}
	
	public function lastFontUpdate() {
		$now = time();
		$then = filemtime("{$_SERVER['DOCUMENT_ROOT']}/fonts/axes.json");
		$date = date("j M", $then);
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
		return "$date $time";
	}
	
	public function metaLinks() {
		return;
	?>
		<h3>Meta</h3>
		<ul>
			<!-- <p><a id="bookmark" href="?">Bookmark these settings</a></p> -->
			<li><a href="/" id='reset'>Reset to font defaults</a></li>
<!-- 			<li><a href="/updatefonts.php" id='grab-new-fonts' title="Last updated <?= $this->lastFontUpdate() ?>">Grab latest font files</a></li> -->
		</ul>
	<?php
		return "";
	}
}