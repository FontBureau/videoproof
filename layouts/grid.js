(function() {
"use strict";
VideoProof.registerLayout('grid', {
	'init': function(proof) {
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
	
			proof.innerHTML = "<span>" + Array.from(glyphset).join("</span><span>") + "</span>";
	
			VideoProof.doGridSize();
		}

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
		});
	},
	'deinit': function(proof) {
		$(document).off('.grid');
		$('#select-glyphs').off('.grid');
		$('#show-extended-glyphs').off('.grid');
		$(window).off('.grid');
	}
});
})();
