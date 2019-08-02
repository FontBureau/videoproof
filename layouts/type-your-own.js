(function() {
"use strict";
VideoProof.registerLayout('type-your-own', {
	'init': function(proof) {
		
		function updateProof() {
			$(proof).find('span.extended-chars').remove();
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

		proof.textContent = "Type your own";
		proof.setAttribute('contenteditable', '');
		proof.setAttribute('spellcheck', 'false');
		
		$(proof).on('keyup input', updateProof);
		$('#show-extended-glyphs').on('change', updateProof).trigger('change');
	},
	'deinit': function(proof) {
		proof.removeAttribute('contenteditable');
	}
});
})();
