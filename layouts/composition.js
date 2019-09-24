(function() {
"use strict";
VideoProof.registerLayout('composition', {
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
					TextToWidth({'.large-container .pane > *': {'wordList': '/texts/pangram-words.txt'}});
				}
				
				var wrapper, p;
				proof.textContent = "";
				if (this.value === 'small') {
					wrapper = document.createElement('div');
					wrapper.className = 'small-container';
					
					p = document.createElement('p');
					p.className = 'pull-quote';
					p.textContent = getChunks(pangrams, 3).join(". ") + ".";
					wrapper.appendChild(p);

					[16, 10, 14, 9, 12, 8].forEach(function(size) {
						var paragraph = getChunk(paragraphs);
						p = document.createElement('p');
						p.style.fontSize = size + 'pt';
						p.textContent = paragraph;
						//project gutenberg uses underscores for italics
						p.innerHTML = p.innerHTML.replace(/(^|\s)_([^_]+)_(,|\s|$)/g, '$1$2$3'); //'$1<i>$2</i>$3');
						wrapper.appendChild(p);
					});
					
					proof.appendChild(wrapper);
				} else {
					wrapper = document.createElement('div');
					wrapper.className = 'large-container';

					['regular', 'bold'].forEach(function(weight) {
						var pane = document.createElement('div');
						pane.className = 'pane ' + weight;
	
						['h1', 'h2', 'h3', 'h4', 'h5'].forEach(function(h) {
							pane.appendChild(document.createElement(h));
						});
						
						wrapper.appendChild(pane);
					});

					proof.appendChild(wrapper);

					setTimeout(doTTW, 500);
				}
			});
			sizecontrols.filter(':checked').trigger('change');
		}).catch(function(e) {
			console.log(e);
			alert("Error loading composition text file(s)");
		});
	},
	'deinit': function(proof) {
	}
});
})();
