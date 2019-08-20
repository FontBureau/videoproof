$(document).on('videoproof:fontLoaded', function() {
	"use strict";
	
	function viewedAlready() {
		if (window.location.hash === '#view-intro') {
			return false;
		}
		try {
			return window.localStorage.getItem('user-guide') === 'viewed';
		} catch (e) {
			//sometimes localStorage is blocked by security settings. try cookies
			return document.cookie.indexOf('userguide=viewed') >= 0;
		}
	}
	
	function setViewed() {
		try {
			window.localStorage.setItem('user-guide', 'viewed');
		} catch (e) {
			document.cookie = "userguide=viewed;max-age=31536000;path=/";
		}
	}

	function setup(force) {
		if (viewedAlready() && !force) {
			return Promise.reject();
		}

		if ('introJs' in window) {
			return Promise.resolve();
		}

		return Promise.all([
			new Promise(function(r1) {
				var link = document.createElement('link');
				link.rel = "stylesheet";
				link.href = "/intro.js/introjs.css";
				link.addEventListener('load', r1);
				document.head.insertBefore(link, document.getElementById('typetools-main-css'))
			}),
	
			new Promise(function(r2) {
				var link = document.createElement('link');
				link.rel = "stylesheet";
				link.href = "/user-guide.css";
				link.addEventListener('load', r2);
				document.head.insertBefore(link, document.getElementById('typetools-main-css'))
			}),
	
			new Promise(function(r3) {
				var script = document.createElement('script');
				script.src="/intro.js/intro.js";
				script.addEventListener('load', r3);
				document.head.appendChild(script);
			})
		]);
	}
	
	function viewHints(force) {
		setup(force).then(function() {
			var intro = introJs();
			intro.setOptions({
				'scrollToElement': false,
				'steps': [
					{
						'intro': "Welcome to Video Proof! This is a tool for type designers and users to quickly explore the design space of <a href='https://medium.com/variable-fonts/https-medium-com-tiro-introducing-opentype-variable-fonts-12ba6cd2369'>OpenType variable fonts</a> in a variety of settings."
					}, {
						'element': document.getElementById('select-font-container'),
						'intro': "Choose from a selection of Open Source fonts, or drag-and-drop your own TTF, OTF, or WOFF file onto the window to load your own variable font."
					}, {
						'element': document.getElementById('select-glyphs-container'),
						'intro': "Choose a set of characters/glyphs to view. Glyph lists will fit themselves into the available window space."
					}, {
						'element': document.getElementById('keyframes-display-container'),
						'intro': "Video Proof will automatically build a “tour” through the font’s design space, using the <a href='https://docs.microsoft.com/en-us/typography/opentype/spec/dvaraxisreg#registered-axis-tags'>registered axes</a> of weight, width, slant, italic, and optical size. Extra axes will appear below, if present, with their own mini-tours. Click any keyframe to jump to that spot in the tour."
					}, {
						'element': document.getElementById('animation-controls'),
						'intro': "Use these animation controls to naviagate the design-space tour. Forward and back controls jump to next/previous keyframes listed in the sidebar."
		/*
					}, {
						'element': document.getElementById('meta-stuff-container'),
						'intro': "Options to show various output information about the currently configured axes."
		*/
					}
				]
			});
			intro.start();
			setViewed();
		}).catch(function() {
			//already viewed
		});
	}
	
	window.videoproofViewIntroHints = function() {
		viewHints(true);
	};
});