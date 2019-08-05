(function() {
"use strict";
VideoProof.registerLayout('contextual', {
	'sizeToSpace': true,
	'controls': {
		'Pad': '<select id="contextual-pad" name="pad"><option value="auto-short">Auto short</option><option value="auto-long">Auto long</option><option>HH?HH</option><option>HH?HOHO?OO</option><option>nn?nn</option><option>nn?nono?oo</option><option>A?A</option><option>?A?</option></select>',
		'Custom pad': '<input type="text" maxlength="2" id="contextual-custom-pad" name="custom-pad" value="">'
	},
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
	
			var ucre = /[A-Z]/;
			var lcre = /[a-z]/;
			var numre = /\d/;
			
			function isGeneral(c, re) {
				if (re.test(c)) { return true; }
				var isExt = false;
				$.each(glyphsets._extended, function(k, v) {
					if (re.test(k) && v.indexOf(c) >= 0) {
						isExt = true;
						return false;
					}
				});
				return isExt;
			}
			
			function isUppercase(c) {
				return isGeneral(c, ucre);
			}

			function isLowercase(c) {
				return isGeneral(c, lcre);
			}

			function isNumeric(c) {
				return isGeneral(c, numre);
			}

			var autopad = $('#contextual-pad').val();
			var custompad = $('#contextual-custom-pad').val();
			var words = [];
			Array.from(glyphset).forEach(function(c) {
				if (custompad.length) {
					words.push(custompad + c + custompad);
				} else switch (autopad) {
					case 'auto-short':
						if (isNumeric(c)) {
							words.push("00" + c + "00");
						} else if (isLowercase(c)) {
							words.push("nn" + c + "nn");
						} else {
							words.push("HH" + c + "HH");
						}
						break;
					case 'auto-long':
						if (isNumeric(c)) {
							words.push("00" + c + "0101" + c + "11");
						} else if (isLowercase(c)) {
							words.push("nn" + c + "nono" + c + "oo");
						} else {
							words.push("HH" + c + "HOHO" + c + "OO");
						}
						break;
					default:
						words.push(autopad.replace(/\?/g, c));
				}
			});
			proof.textContent = words.join(" ");
			VideoProof.sizeToSpace();
		}

		setTimeout(populateGrid);
		$(document).on('videoproof:fontLoaded.contextual', populateGrid);
		$('#select-glyphs').on('change.contextual', populateGrid);
		$('#show-extended-glyphs').on('change.contextual', populateGrid);
		$('#contextual-pad').on('change', function() { 
			$('#contextual-custom-pad').val('');
		});
		$('#layout-specific-controls').on('input.contextual change.contextual', populateGrid);
	},
	'deinit': function(proof) {
		$(document).off('.contextual');
		$('#select-glyphs').off('.contextual');
		$('#show-extended-glyphs').off('.contextual');
		$('#layout-specific-controls').off('.contextual');
	}
});
})();
