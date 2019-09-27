(function() {
"use strict";
VideoProof.registerLayout('composition', {
	'rapBracket': true,
	'controls': {
		'Size': '<label><input type="radio" name="composition-size" value="small" checked> Small</label> <label><input type="radio" name="composition-size" value="large"> Large</label>',
	},
	'init': function(proof) {
		var sizecontrols = $('input[name="composition-size"]');
		var paragraphs, pangrams;
		
		function getChunks(src, num) {
			if (isNaN(num) || num <= 0) {
				num = 1;
			}
			
			var result = [];
			var i, j;
			for (i=0; i<num; i++) {
				result.push(src[Math.floor(Math.random() * src.length)]);
			}
			return result;
		}
		var getChunk = getChunks;
		
		Promise.all([
			new Promise(function(resolve, reject) {
				$.ajax('/texts/paragraphs.txt', {
					'success': function(data) {
						paragraphs = data.trim().split(/\n\n+/);
						resolve();
					},
					'error': reject
				});
			}),
			new Promise(function(resolve, reject) {
				$.ajax('/texts/pangrams.txt', {
					'success': function(data) {
						pangrams = data.trim().split(/\n+/);
						resolve();
					},
					'error': reject
				});
			})
		]).then(function() {
			sizecontrols.on('change', function() {
				
				function doTTW() {
					TextToWidth({'.large-container .pane label': {'wordList': '/texts/pangram-words.txt'}});
				}
				
				var wrapper, p, cb, label;
				function addPara(el, txt, cls, size, parent) {
					p = document.createElement(el);
					if (cls) { p.className = cls; }
					if (size) { p.style.fontSize = size + 'pt' };
					var input = document.createElement('input');
					input.type = 'radio';
					input.name = 'para-select';
					input.id = 'para-' + Math.round(1000000*Math.random()) + '-' + txt.length;
					var label = document.createElement('label');
					label.textContent = txt;
					label.setAttribute('for', input.id);
					//project gutenberg uses underscores for italics
					label.innerHTML = label.innerHTML.replace(/(^|\s)_([^_]+)_(,|\s|$)/g, '$1$2$3'); //'$1<i>$2</i>$3');
					p.appendChild(input);
					p.appendChild(label);
					(parent || wrapper).appendChild(p);
				}
				
				proof.textContent = "";
				if (this.value === 'small') {
					wrapper = document.createElement('div');
					wrapper.className = 'small-container';
					
					addPara('p', getChunks(pangrams, 3).join(". ") + ".", 'pull-quote');

					[16, 10, 14, 9, 12, 8].forEach(function(size) {
						addPara('p', getChunk(paragraphs), null, size);
					});
					
					proof.appendChild(wrapper);
				} else {
					wrapper = document.createElement('div');
					wrapper.className = 'large-container';

					['regular', 'bold'].forEach(function(weight) {
						var pane = document.createElement('div');
						pane.className = 'pane ' + weight;
	
						['h1', 'h2', 'h3', 'h4', 'h5'].forEach(function(h) {
							addPara(h, '', null, null, pane);
						});
						
						wrapper.appendChild(pane);
					});

					proof.appendChild(wrapper);

					setTimeout(doTTW, 500);
				}
			});
			sizecontrols.filter(':checked').trigger('change');
			
			//select text blocks
			proof.addEventListener('change', function() {
				var para = document.querySelector('input[name="para-select"]:checked').parentNode;
				$('#the-proof.animation-target').removeClass('animation-target');
				$(para).addClass('animation-target');
				VideoProof.bracketRap(para);
			});
			if (!document.querySelector('input[name="para-select"]:checked')) {
				document.querySelector('input[name="para-select"]').checked = true;
				proof.trigger('change');
			}
		}).catch(function(e) {
			console.log(e);
			alert("Error loading composition text file(s)");
		});
	},
	'deinit': function(proof) {
	}
});
})();
