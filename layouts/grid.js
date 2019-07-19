document.addEventListener('DOMContentLoaded', function() {
	"use strict";
	
	var proof = $('#grid .proof-grid');

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
			proof.append('<span>' + c + '</span>');
		});
		
		TNTools.slidersToElement();
		TNTools.doGridSize();
	}
	
	$(document).on('videoproof:fontLoaded', populateGrid);
	$('#select-glyphs').on('change', populateGrid);
	$('#show-extended-glyphs').on('change', populateGrid);
});