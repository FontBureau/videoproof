<?php
namespace TypeNetwork\VideoProof;
require_once(__DIR__ . "/videoproof.inc");

$videoproof = new VideoProof();
?>
<!DOCTYPE html>
<html lang="en" id="videoproof">
	<head>
		<meta charset="utf-8">
		<title>Video Proof</title>
		<meta name="viewport" content="initial-scale=1,shrink-to-fit=no">
		<link rel="stylesheet" href="https://www.typenetwork.com/assets_content/css/reset.css">
		<link rel="stylesheet" href="https://www.typenetwork.com/assets_content/css/adobe-blank.css">
		<link rel="stylesheet" href="https://www.typenetwork.com/assets_content/css/fonts-momentum-sans.css">
		<link rel="stylesheet" href="https://www.typenetwork.com/assets_content/css/style.css">
		<link rel="icon" type="image/png" href="./favicon-32x32.png" sizes="32x32">



		<script src="https://ajax.googleapis.com/ajax/libs/jquery/3.4.1/jquery.min.js"></script>

		<!--
		<script src="opentype.js/dist/opentype.min.js"></script>
		-->

		<!--
		Color pickers are supported in all browsers expect interent explorer.
		<script src="spectrum/spectrum.js"></script>
		<link rel="stylesheet" href="./spectrum/spectrum.css">
		-->

		<!--
		Not sure what this is supposed to do, but it triggers an error
		where  `const moreBtn = document.querySelector('.pop_button');`
		is null:
			"Uncaught TypeError: moreBtn is null"
		in: <anonymous> https://www.typenetwork.com/assets_content/js/functions.js:110

		<script src="https://www.typenetwork.com/assets_content/js/functions.js"></script>
		-->

		<script src="user-guide.js" defer></script>
		<!--
		<script src="text-to-width.js" defer></script>
		-->
		<style id='videoproof-keyframes'></style>
		<style id='videoproof-moar-animation'></style>

		<link rel="stylesheet" href="videoproof.css">
		<link rel="stylesheet" href="form-controls.css">

		<script src="videoproof.js" async type="module"></script>

		<?= $videoproof->pageHead(); ?>
	</head>
	<body>
		<div class="wrapper">
			<header class="header-global">
				<h1><a href="https://www.typenetwork.com/">Type Network</a></h1>
			</header>

			<nav class="nav-global">
				<a class="nav-global-reveal" href="#">Menu</a>
				<ul>
<!--
					<li><a class="nav-home-link" href="https://www.typenetwork.com/">Home</a></li>
					<li><a href="http://store.typenetwork.com">Fonts</a></li>
					<li><a href="https://www.typenetwork.com/news" >News</a></li>
					<li><a href="https://www.typenetwork.com/gallery" >Gallery</a></li>
-->
				</ul>
			</nav>

			<nav class="nav-user">
				<a class="nav-user-reveal" href="#">Menu</a>
				<ul>
<!--
					<li><a href="http://store.typenetwork.com/account/licenses" class="nav-user-account"></a></li>
					<li><a href="http://store.typenetwork.com/account/favorites" class="nav-user-favorites"></a></li>
					<li><a href="http://store.typenetwork.com/cart" class="nav-user-cart"></a></li>
-->
				</ul>
			</nav>

			<!-- SIDEBAR! -->
			<aside class="content-filters">
				<a class="content-filters-close" href="#">Close</a>

				<form id='controls'>
					<input id="comment-store" name="comment" type="hidden" />

					<?= $videoproof->selectFont() ?>
					<?= $videoproof->selectMode() ?>
					<?= $videoproof->selectGlyphGroup() ?>

					<ul id='layout-specific-controls'>
					</ul>

					<div id='colors'>
						<label for='foreground'>FG</label>
						<input type='color' id='foreground' name='foreground' value='#000000'>
						<button type='button' id='fg-bg-invert'>⇄</button>
						<label for='background'>BG</label>
						<input type='color' id='background' name='background' value='#FFFFFF'>
					</div>

					<?= $videoproof->animationKeyframes() ?>

					<h3>Meta</h3>
					<ul>
<!-- 						<li><a id="bookmark" href="?">Bookmark these settings</a></li> -->
						<li><a href="/" id='reset'>Reset to font defaults</a></li>
						<?php /* don't print this if not PHP */
							print "<li><a href='updatefonts.php' id='grab-new-fonts' title='Last updated " . $videoproof->lastFontUpdate() . "'>Grab latest font files</a></li>";
						?>
						<li><a href="#view-intro" onclick="videoproofViewIntroHints(); return false;" title="Show the interactive introduction guide">Show introduction</a></li>
					</ul>
				</form>

			</aside>

			<div class="content-main">
				<a class="content-options-show-filters" href="#">Sidebar</a>

				<?= $videoproof->animationControls(); ?>
				<output id='aniparams'>This animation will eat your CPU alive (depending on browser), so it doesn’t auto-start. Ready? <span id='first-play'>▶️</span></output>

				<div id="comment-box">
					Leave a comment here, it will be shared together with the page link.<br />
					<textarea></textarea>
				</div>

				<div id='the-proof'></div>

				<footer class="footer-global">
					<ul>
						<li><a href="//www.typenetwork.com/about">About Type Network</a></li>
						<li><a href="https://github.com/TypeNetwork/videoproof">Source code on GitHub</a></li>
						<li><a href="https://github.com/TypeNetwork/videoproof/issues">Bug reports &amp; feature&nbsp;requests</a></li>
					</ul>
				</footer>
			</div> <!-- content-main -->
		</div> <!-- wrapper -->
	</body>
</html>
