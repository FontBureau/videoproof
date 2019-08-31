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
			var result = [];
			var i, j;
			for (i=0; i<num; i++) {
				result.push(src[Math.floor(Math.random() * src.length)]);
			}
			return result;
		}
		
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
				var p;
				proof.textContent = "";
				if (this.value === 'small') {
					p = document.createElement('p');
					p.className = 'pull-quote';
					p.textContent = getChunks(pangrams, 3).join(". ");
					proof.appendChild(p);

					p = document.createElement('p');
					p.textContent = getChunks(pangrams, 20).join(". ");
					proof.appendChild(p);

					getChunks(paragraphs, 2).forEach(function(paragraph) {
						p = document.createElement('p');
						p.textContent = paragraph;
						p.innerHTML = p.innerHTML.replace(/(^|\s)_([^_]+)_(\s|$)/g, '$1<i>$2</i>$3');
						proof.appendChild(p);
					});
					
					p = document.createElement('p');
					p.className = 'caption';
					p.textContent = getChunks(pangrams, 2).join(". ");
					proof.appendChild(p);
				} else {
					p = document.createElement('h1');
					p.textContent = getChunks(pangrams, 1)[0].split(' ').slice(0, 3).join(" ");
					proof.appendChild(p);

					p = document.createElement('h2');
					p.textContent = getChunks(pangrams, 1)[0];
					proof.appendChild(p);

					p = document.createElement('h3');
					p.textContent = getChunks(pangrams, 3).join(". ");
					proof.appendChild(p);
				}
			});
			sizecontrols.filter(':checked').trigger('change');
		}).catch(function(e) {
			alert("Error loading composition text file(s)");
		});
	},
	'deinit': function(proof) {
	}
});
})();
