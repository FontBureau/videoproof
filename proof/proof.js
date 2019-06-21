document.addEventListener('DOMContentLoaded', function() {
	"use strict";
	
	var head = document.getElementsByTagName('head')[0];
	var script;

	var temp; //general use
	
	var controls = $('#controls');
	var proof = $('#proof-grid');
	var glyphselect = $('#select-glyphs');
	
	function getGlyphString() {
		var groupSet = glyphselect.val().split('::');
		var glyphset;

		if (groupSet.length > 1) {
			if (groupSet[1] in window.glyphsets[groupSet[0]]) {
				glyphset = window.glyphsets[groupSet[0]][groupSet[1]];
			} else if (groupSet[1] === 'concat') {
				glyphset = [];
				$.each(window.glyphsets[groupSet[0]], function(label, glyphs) {
					glyphset.push(glyphs);
				});
				glyphset = glyphset.join('').trim();
			}
		} else {
			glyphset = window.glyphsets[groupSet[0]];
		}

		return glyphset;
	}
	
	function filterGlyphs() {
		var glyphset = getGlyphString();
		
		var showall = !glyphset;
		var showglyphs = {};
		
		if (glyphset) {
			Array.from(glyphset).forEach(function(c) {
				showglyphs[c] = true;
			});
		}
		proof.find('span').each(function() {
			var c = this.textContent;
			if (showall || showglyphs[c]) {
				this.style.display = '';
			} else {
				this.style.display = 'none';
			}
		});
		TNTools.doGridSize();
	}
	
	function populateGrid(font) {
		var gid;
		proof.empty();
		for (gid in font.tables.cmap.glyphIndexMap) {
			proof.append('<span>' + String.fromCodePoint(gid) + '</span>');
		}
		TNTools.slidersToElement();
		filterGlyphs();
	}
	
	$('#select-font')	.on('change', function() {
		var fonturl = $(this).val();
		proof.html('<span style="font-size:1rem">Loading…</span>');

		if (window.fontInfo[fonturl] && window.fontInfo[fonturl].fontobj) {
			populateGrid(window.fontInfo[fonturl].fontobj);
		} else {
			var url = '/fonts/' + fonturl + '.woff';
			window.opentype.load(url, function (err, font) {
				if (err) {
					alert(err);
					return;
				}
				window.fontInfo[fonturl].fontobj = font;
				populateGrid(font);
			});
		}
	});
	
	$('#select-glyphs').on('change', function() {
		//do some clever hiding and showing
		
		filterGlyphs();
	});
});