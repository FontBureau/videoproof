document.addEventListener('DOMContentLoaded', function() {
	"use strict";
	
	var proof = $('#the-proof');

	function populateGrid() {
		var glyphset = TNTools.getGlyphString();

/*
		if (typeof glyphset === 'object' && glyphset.chars && glyphset.feature) {
			proof.css('font-feature-settings', '"' + glyphset.feature + '" 1');
			glyphset = glyphset.chars;
		} else {
			proof.css('font-feature-settings', '');
		}
*/

		proof.empty();
		Array.from(glyphset).forEach(function(c) {
			proof.append('<span>H' + c + 'H</span>');
		});

		TNTools.doGridSize();
	}
	
	$('#select-mode').on('change', function() {
		if (this.value === 'contextual') {
			setTimeout(populateGrid);
			$(document).on('videoproof:fontLoaded.contextual', populateGrid);
			$('#select-glyphs').on('change.contextual', populateGrid);
			$('#show-extended-glyphs').on('change.contextual', populateGrid);
			var resizeTimeout;
			$(window).on('resize.contextual', function() {
				if (resizeTimeout) {
					clearTimeout(resizeTimeout);
				}
				resizeTimeout = setTimeout(TNTools.doGridSize, 500);
			}).trigger('resize');
		} else {
			$(document).off('.contextual');
			$('#select-glyphs').off('.contextual');
			$('#show-extended-glyphs').off('.contextual');
			$(window).off('.contextual');
		}
	});

});