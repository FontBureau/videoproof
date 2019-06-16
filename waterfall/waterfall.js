$(function() {
	"use strict";

	var temp; //general use
	
	var controls = $('#controls');
	var waterfall = $('#waterfallll');
	
	controls.on('change input', function(evt) {
		var size = $('#edit-size');
		var toSize = $('#edit-to-size');
		if (evt.type !== 'change') {
			//don't update for keystrokes
			return;
		}
		if (this.name === 'size') {
			if (parseInt(size.val()) > parseInt(toSize.val())) {
				toSize.val(size.val()).trigger('change');
				return;
			}
		} else if (this.name === 'to-size') {
			if (parseInt(size.val()) > parseInt(toSize.val())) {
				size.val(toSize.val()).trigger('change');
				return;
			}
		}
		
		var sentence = waterfall.children('li').first().text() || 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz1234567890';
		
		waterfall.empty();
		
		var i, l, li;
		for (i=parseInt(size.val()), l=parseInt(toSize.val()); i<=l; i++) {
			li = document.createElement('li');
			li.textContent = sentence;
			li.style.fontSize = i + 'pt';

			li.setAttribute('data-size', i);
			li.contentEditable = 'true';
			waterfall.append(li);
		}
	});
	
	waterfall.on('keyup', function(evt) {
		var li = $(evt.target).closest('li');
		waterfall.find('li').not(li).text(li.text());
	});
});
