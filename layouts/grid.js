document.addEventListener('DOMContentLoaded', function() {
	"use strict";
	
	var proof = $('#the-proof');

	function populateGrid() {
		var glyphset = VideoProof.getGlyphString();

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
			proof.append('<span>' + c + '</span>');
		});

		VideoProof.doGridSize();
	}
	
	$('#select-mode').on('change', function() {
		if (this.value === 'grid') {
			setTimeout(populateGrid);
			$(document).on('videoproof:fontLoaded.grid', populateGrid);
			$('#select-glyphs').on('change.grid', populateGrid);
			$('#show-extended-glyphs').on('change.grid', populateGrid);
			var resizeTimeout;
			$(window).on('resize.grid', function() {
				if (resizeTimeout) {
					clearTimeout(resizeTimeout);
				}
				resizeTimeout = setTimeout(VideoProof.doGridSize, 500);
			}).trigger('resize');
		} else {
			$(document).off('.grid');
			$('#select-glyphs').off('.grid');
			$('#show-extended-glyphs').off('.grid');
			$(window).off('.grid');
		}
	});

});