document.addEventListener('DOMContentLoaded', function() {
	"use strict";
	
	var proof = document.getElementById('the-proof');

	$('#select-mode').on('change', function() {
		if (this.value === 'type-your-own') {
			proof.textContent = "Type your own";
			proof.setAttribute('contenteditable', '');
		} else {
			proof.removeAttribute('contenteditable');
		}
	});

});