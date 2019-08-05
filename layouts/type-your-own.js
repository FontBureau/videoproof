(function() {
"use strict";
VideoProof.registerLayout('type-your-own', {
	'controls': {
		'Text': '<input type="text" id="custom-text" name="text" value="Type your own">'
	},
	'init': function(proof) {
		
		function updateProof() {
			proof.textContent = document.getElementById('custom-text').value;
			if (document.getElementById('show-extended-glyphs').checked) {
				var chars = Array.from(proof.textContent.trim());
				var seen = {};
				var extended = "";
				chars.forEach(function(c) {
					if (c in seen) {
						return;
					}
					seen[c] = true;
					if (c in window.glyphsets._extended) {
						extended += " " + window.glyphsets._extended[c];
					}
				});
				if (extended.length) {
					var span = document.createElement('span');
					span.className = 'extended-chars';
					span.textContent = extended;
					proof.appendChild(span);
				}
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
	}
});
})();
