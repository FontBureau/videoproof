$(function() {
	"use strict";

	var head = document.getElementsByTagName('head')[0];
	var script;

	var temp; //general use
	
	var controls = $('#controls');
	var proof = $('#proof-grid');
	
	function populateGrid(font) {
		var gid;
		for (gid in font.tables.cmap.glyphIndexMap) {
			proof.append('<span>' + String.fromCodePoint(gid) + '</span>');
		}
		TNTools.slidersToElement();
		TNTools.doGridSize();
	}
	
	$('#select-font')	.on('change', function() {
		var font = $(this).val();
		proof.empty();

		if (font.match(/^custom-/) && window.fontInfo[font] && window.fontInfo[font].fontobj) {
			populateGrid(window.fontInfo[font].fontobj);
		} else {
			//this seems to be causing race conditions, so wait a second to be sure the font is loaded
			setTimeout(function() {
				var url = '/fonts/' + font + '.woff';
				window.opentype.load(url, function (err, font) {
					if (err) {
						alert(err);
						return;
					}
					populateGrid(font);
				});
			}, 500);
		}
	});
});