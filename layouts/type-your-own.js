(function() {
"use strict";
VideoProof.registerLayout('type-your-own', {
	'controls': {
		'Text': '<input type="text" id="custom-text" name="text" value="Type your own">'
	},
	'init': function(proof) {

		var selectGlyphs = document.getElementById('select-glyphs');
		var showExtended = document.getElementById('show-extended-glyphs');

		setTimeout(function() {
			selectGlyphs.disabled = true;
			showExtended.disabled = false;
		});
		
		function fitToSpace() {
			if (proof.textContent.trim().length === 0) {
				return;
			}

			//VideoProof.setWidest();
			
			var winHeight = window.innerHeight - 96;
			var gridBox = proof.getBoundingClientRect();
			var gridHeight = gridBox.height;
			var fullWidth = gridBox.width;
			var fontsize = parseFloat(getComputedStyle(proof).fontSize);
	
			while (gridHeight < winHeight && proof.scrollWidth <= fullWidth) {
				fontsize *= 1.5;
				proof.style.fontSize = Math.floor(fontsize) + 'px';
				gridHeight = proof.getBoundingClientRect().height;
			}
	
			while (gridHeight > winHeight || proof.scrollWidth > fullWidth) {
				fontsize *= 0.9;
				proof.style.fontSize = Math.floor(fontsize) + 'px';
				gridHeight = proof.getBoundingClientRect().height;
				if (fontsize < 24) {
					break;
				}
			}

			//VideoProof.unsetWidest();
		}
		
		function updateProof() {
			proof.textContent = document.getElementById('custom-text').value;
			if (showExtended.checked) {
				var chars = Array.from(proof.textContent.trim());
				var seen = {};
				var extended = "";
				chars.forEach(function(c) {
					if (c in seen) {
						return;
					}
					seen[c] = true;
					if (c in window.glyphsets._extended) {
						extended += window.glyphsets._extended[c];
					}
				});
				if (extended.length) {
					var span = document.createElement('span');
					span.className = 'extended-chars';
					span.textContent = extended;
					proof.appendChild(span);
				}
				fitToSpace();
			} else {
				//fit to width up to window height
				proof.style.whiteSpace = 'nowrap';
				fitToSpace();
				proof.style.whiteSpace = '';
			}
		}

		$('#custom-text').on('keyup.typeyourown input.typeyourown', updateProof).trigger('change');
		$('#show-extended-glyphs').on('change.typeyourown', updateProof).trigger('change');
		$(document).on('videoproof:fontLoaded.typeyourown', updateProof);
	},
	'deinit': function(proof) {
		$('#custom-text').off('.typeyourown');
		$('#show-extended-glyphs').off('.typeyourown');
		$(document).off('.typeyourown');
		document.getElementById('select-glyphs').disabled = false;
	}
});
})();
