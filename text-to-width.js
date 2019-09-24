/*
 * TEXT-TO-WIDTH.JS
 *
 * Fits text into elements by picking words from a list that you provide.
 *
 * Uses Bram Stein's FontFaceObserver: https://github.com/bramstein/fontfaceobserver/
 *
 * Usage:
 * 
 * TextToWidth({
 *   //specifying defaults is optional.
 *   'defaults': { 
 *     wordList: '/path/to/words.txt', 
 *     allowRepeats: false, 
 *     separator: ' ', 
 *     testString: 'BESbswy',
 *     wordLength: 0.8 // 0.0 to 1.0: preference for choosing single long words over multiple short ones
 *   },
 *   // CSS selector: specific options
 *   '.selector-1': { wordList: '/special/words.txt' },
 *   '.selector-2': {} //leave empty to just use the defaults
 * });
 * 
 * The only option that must be specified is wordList. 
 * This can be an array of strings, or a URL to a text file containing one word on each line.
 * 
 * CHANGELOG:
 * 2019-06-14: Remove jQuery dependency; add ability to deal with ::first-letter variants
 * 2018-05-31: Separate elements into sets based on font-family and text-transform values. Eliminate empty words from lists.
 * 2018-05-18: Update FontFaceObserver to 2.0.13
 * 2018-05-03: Put localStorage accesses inside try/catch in case it's not available
 *
 * © 2015–2019 Chris Lewis <chris@chrislewis.codes> All rights reserved. 
 */

(function() {
	"use strict";

	var START = Date.now();
	var ttwDebug = window.location.search.indexOf('debug') >= 0;
	var ttwRefresh = window.location.search.indexOf('refresh') >= 0;
	
	// css properties that define a unique font situation
	var ttwFontProperties = ['font-family', 'font-style', 'font-weight', 'font-variant', 'font-feature-settings', 'font-stretch', 'text-transform', 'text-rendering', 'letter-spacing', 'font-variation-settings'];
	var ttwBackupWordRE = /^\d+:::/;
	
	//handy polyfills and utility functions
	
	// forEach on nodes, from MDN
	if (window.NodeList && !NodeList.prototype.forEach) {
	    NodeList.prototype.forEach = function (callback, thisArg) {
	        thisArg = thisArg || window;
	        for (var i = 0; i < this.length; i++) {
	            callback.call(thisArg, this[i], i, this);
	        }
	    };
	}
	
	// and why not forEach for objects
	// do NOT use Object.prototype here as it does not play nice with jQuery http://erik.eae.net/archives/2005/06/06/22.13.54/
	if (!Object.forEach) {
	    Object.forEach = function(o, callback) {
	        Object.keys(o).forEach(function(k) {
	            callback(o[k], k);
	        });
	    };
	}
	
	// jQuery-style addClass/removeClass are not canon, but more flexible than ClassList
	if (!HTMLElement.prototype.hasClass) {
	    HTMLElement.prototype.hasClass = function(str) {
	        var el = this;
	        var words = str.split(/\s+/);
	        var found = true;
	        words.forEach(function(word) {
	            found = found && el.className.match(new RegExp("(^|\\s)" + word + "($|\\s)"));
	        });
	        return !!found;
	    };
	}
	
	var spacere = /\s{2,}/g;
	if (!HTMLElement.prototype.addClass) {
	    HTMLElement.prototype.addClass = function(cls) {
	        this.className += ' ' + cls;
	        this.className = this.className.trim().replace(spacere, ' ');
	        return this;
	    };
	}
	
	if (!HTMLElement.prototype.removeClass) {
	    HTMLElement.prototype.removeClass = function(cls) {
	        var i, words = cls.split(/\s+/);
	        if (words.length > 1) {
	            for (var i=0; i < words.length; i++) {
	                this.removeClass(words[i]);
	            }
	        } else {
	            var classre = new RegExp('(^|\\s)' + cls + '($|\\s)', 'g');
	            while (classre.test(this.className)) {
	                this.className = this.className.replace(classre, ' ').trim().replace(spacere, '');
	            }
	        }
	        return this;
	    };
	}
	
	if (!HTMLElement.prototype.toggleClass) {
	    HTMLElement.prototype.toggleClass = function(cls) {
	        this[this.hasClass(cls) ? 'removeClass' : 'addClass'](cls);
	    };
	}
	
	//synthetic events
	if (!HTMLElement.prototype.trigger) {
	    HTMLElement.prototype.trigger = function(type) {
	        var evt;
	        if (typeof window.Event === "function"){ 
	            evt = new Event(type, {'bubbles': true});
	        } else { 
	            evt = document.createEvent('Event');
	            evt.initEvent(type, true, true);
	        }
	        return this.dispatchEvent(evt);
	    };
	}
	
	// closest, from MDN
	if (!Element.prototype.matches) {
	    Element.prototype.matches = Element.prototype.msMatchesSelector || 
	                                Element.prototype.webkitMatchesSelector;
	}
	
	if (!Element.prototype.closest) {
	    Element.prototype.closest = function(s) {
	        var el = this;
	        if (!document.documentElement.contains(el)) return null;
	        do {
	            if (el.matches(s)) return el;
	            el = el.parentElement || el.parentNode;
	        } while (el !== null && el.nodeType === 1); 
	        return null;
	    };  
	}
	
	// not in the spec, but seems weird to be able to do it on elements but not text nodes
	if (!Node.prototype.closest) {
	    Node.prototype.closest = function(s) {
	        return this.parentNode && this.parentNode.closest(s);
	    }
	}
	
	// my own invention
	if (!RegExp.escape) {
	    RegExp.escape= function(s) {
	        return s.replace(/[\-\/\\\^\$\*\+\?\.\(\)\|\[\]\{\}]/g, '\\$&');
	    };
	}
	
	
	
	//like jQuery function
	window.doOnReady = function(func, thisArg) {
	    if (thisArg) {
	        func = func.bind(thisArg);
	    }
	    if (document.readyState === 'loading') {
	        document.addEventListener('DOMContentLoaded', func);
	    } else {
	        func();
	    }
	}
	
	// shortcuts to get dimensions of element minus padding, equivalent to jQuery width() and height()
	if (!Element.prototype.contentWidth) {
	    Element.prototype.contentWidth = function() {
	        var fullwidth = this.getBoundingClientRect().width;
	        var css = getComputedStyle(this);
	        return fullwidth - parseFloat(css.paddingLeft) - parseFloat(css.paddingRight);
	    };
	}
	
	if (!Element.prototype.contentHeight) {
	    Element.prototype.contentHeight = function() {
	        var fullheight = this.getBoundingClientRect().height;
	        var css = getComputedStyle(this);
	        return fullheight - parseFloat(css.paddingTop) - parseFloat(css.paddingBottom);
	    };
	}
	
	
	if (!HTMLFormElement.prototype.serialize) {
	    HTMLFormElement.prototype.serialize = function() {
	        var form = this;
	        var req = [];
	        form.querySelectorAll('input:enabled').forEach(function(input) {
	            if ((input.type === 'checkbox' || input.type === 'radio') && !input.checked) {
	                return;
	            }
	            req.push(encodeURIComponent(input.name) + '=' + encodeURIComponent(input.value));
	        });
	
	        form.querySelectorAll('select:enabled').forEach(function(select) {
	            var options = select.querySelectorAll('option:checked');
	            if (options) {
	                options.forEach(function(opt) {
	                    req.push(encodeURIComponent(select.name) + '=' + encodeURIComponent(opt.value));
	                });
	            }
	        });
	        return req.join("&");
	    };
	}
	
	
	window.doAjax = function(url, options) {
	    var xhr = new XMLHttpRequest();
	    if (options.complete) {
	        xhr.addEventListener("load", function() { options.complete(xhr); });
	    }
	    xhr.open(options.method || 'GET', url);
	    
	    if (options.data) {
	        if (!options.headers) {
	            options.headers = {};
	        }
	        options.headers['Content-type'] = 'application/x-www-form-urlencoded';
	    }
	    
	    if (options.headers) {
	        Object.forEach(options.headers, function (v, k) {
	            xhr.setRequestHeader(k, v);
	        });
	    }
	    xhr.send(options.data);
	};
	
	
	// END POLYFILLS
	
	
	function status() {
		if (!ttwDebug) {
			return;
		}
		
		var args = [(Date.now()-START)/1000];
		for (var i=0, l=arguments.length; i<l; i++) {
			args.push(arguments[i]);
		}

		console.log.apply(console, args);
	}

	function elementFontProps(el) {
		var props = {};

		var css = getComputedStyle(el);
		ttwFontProperties.forEach(function(prop, i) {
			props[prop] = css[prop];
		});

		//see if there's different props for first letter
		css = getComputedStyle(el, '::first-letter');
		ttwFontProperties.forEach(function(prop, i) {
			if (props[prop] !== css[prop]) {
				props[prop + "::first-letter"] = css[prop];
			}
		});

		if (props['font-stretch'] === '100%') {
			props['font-stretch'] = 'normal';
		}

		if (props['font-stretch::first-letter'] === '100%') {
			props['font-stretch::first-letter'] = 'normal';
		}

		return props;
	}


	function initTextToWidth() {
		var ttwFontsLoaded = {};
		var ttwFontElements = {};
		var ttwTimeouts = [];
	
		var ttwSettings = {
			'wordList': null, //this must be set to something by the client
			'separator': ' ',
			'testString': null, //what FFO measures to test if font has loaded
			'allowRepeats': false,
			'wordLength': 0.8
		};
		
		//word list will be sorted by word length as rendered in one of the requested fonts
		var ttwWordList = [], ttwOrigWordList = [], ttwBackupWords = [], ttwExclusiveWords = {}, ttwWordIndex = {};
		var ttwWordListLoaded = false;
		var ttwWordListSorted = false;
		var ttwBackupWordsDirty = false;
	
		//each unique font in the requested elements will have its own measuring-stick element
		var ttwRuler, ttwRulerMaster = document.querySelector('#text-to-width-ignore-me');
		function resetRuler() {
			ttwRulerMaster.innerHTML = '<span id="ttw_ruler"></span>';
			ttwRuler = document.getElementById('ttw_ruler');
		}
		
		function getWordRulers() {
			return ttwRulerMaster.querySelectorAll('span:not(#ttw_ruler)');
		}
		
		var firstLetterStyleElement = document.getElementById('first-letter-style-element');
		if (!ttwRulerMaster) {
			var temp;
			temp = document.createElement('style');
			temp.textContent = '#text-to-width-ignore-me { display:block;position:absolute;visibility:hidden;right:101%;top:0;overflow:hidden;width:1px;height:1px; } #text-to-width-ignore-me > span { display:inline-block;white-space:nowrap;padding:0 !important;' + ttwFontProperties.join(':inherit;') + ':inherit;outline:1px solid blue; }';
			document.head.appendChild(temp);
			
			firstLetterStyleElement = document.createElement('style');
			firstLetterStyleElement.id = 'first-letter-style-element';
			firstLetterStyleElement.textContent = "#text-to-width-ignore-me.first-letter > span::first-letter {}";
			document.head.appendChild(firstLetterStyleElement);
			
			ttwRulerMaster = document.createElement('div');
			ttwRulerMaster.id = 'text-to-width-ignore-me';
			document.body.appendChild(ttwRulerMaster);
		}
		resetRuler();
	
		//jQuery set of elements to fit text into
		var ttwElementString = null;
		var ttwElements = [];
	
		function getTextWidth(text) {
			var w = null;
			if (typeof w === 'number') {
				return w;
			} else {
				ttwRuler.textContent = text;
				w = ttwRuler.clientWidth;
				return w;
			}
		}
	
		function uniqueFontKey(obj) {
			if (typeof obj === 'string') {
				return obj;
			}
			
			var props = [];
			Object.forEach(obj, function(value, prop) {
				if (/^font-(family|style|weight|stretch)/.test(prop)) {
					props.push(prop + ':' + (RegExp.$1 ==='family' ? getFirstFamily(value) : value));
				}
			});
			return props.join(';');
		}
		
		function sortBackupWords() {
			status("sortBackupWords start");
			ttwBackupWords.sort(function(a, b) {
				return parseInt(a) - parseInt(b);
			});
			ttwBackupWordsDirty = false;
			status("sortBackupWords end");
		}
		
		function handleFirstLetterVariants(fontprops) {
			//see if we have to add any first-letter variants to the stylesheet;
			var firstLetterVariants = [];
			var flRe = /::first-letter$/;
			Object.forEach(fontprops, function(v, k) {
				var flk = k.replace(flRe, '');
				if (flk !== k) {
					firstLetterVariants.push(flk + ': ' + v);
				}
			});
			if (firstLetterVariants.length) {
				firstLetterStyleElement.textContent = firstLetterStyleElement.textContent.replace(/\{.*\}/, '{ ' + firstLetterVariants.join('; ') + ' }');
				ttwRulerMaster.addClass('first-letter');
			} else {
				ttwRulerMaster.removeClass('first-letter');
			}
		}
		
		function sortWordList(el) {
			if (!ttwWordListLoaded) {
				return;
			}
			
			//setting individual words in ttwRuler was very slow;
			// so we slam all the words into the measurer at once and then just compare numbers		
			var fontprops = elementFontProps(el);
			var lsKey;
	
			if (ttwSettings.wordList) {
				try {
					lsKey = ttwSettings.wordList;
					Object.forEach(fontprops, function(v, k) {
						lsKey += ';' + k + ':' + (k === 'font-family' ? getFirstFamily(v) : v);
					});
					lsKey = 'swl:' + stringHash(lsKey);			  
					if ('localStorage' in window && lsKey in window.localStorage && !ttwRefresh) {
						ttwOrigWordList = window.localStorage[lsKey].split("\n");
						TTW.resetWordList();
						ttwWordListSorted = true;
						return;
					}
				} catch (e) {}
			}
	
			status("sortWordList start", fontprops, ttwOrigWordList.length);
	
			resetRuler();

			handleFirstLetterVariants(fontprops);

			Object.forEach(fontprops, function(v, k) { ttwRulerMaster.style[k] = v; });
			ttwRulerMaster.style.fontSize = '100px';
			ttwOrigWordList.forEach(function(word, index) {
				var span = document.createElement('span');
				span.textContent = word;
				ttwRulerMaster.appendChild(span);

				if (ttwDebug) {
					ttwRulerMaster.appendChild(document.createElement('br'));
				}
			});
			
			var thespans = getWordRulers();
			
			var keepwords = [];
			var wordwidths = {};
			thespans.forEach(function(el) {
				 if (el.offsetWidth > 0) {
					keepwords.push(el.textContent);
					wordwidths[el.textContent] = el.offsetWidth;
				 }
			});

			ttwOrigWordList = keepwords;

			ttwOrigWordList.sort(function(a, b) {
				return wordwidths[a] - wordwidths[b];
			});
	
			try {
				if (lsKey && 'localStorage' in window) {
					window.localStorage[lsKey] = ttwOrigWordList.join("\n");
				}
			} catch(e) {}
	
			//resetRuler();
	
			TTW.resetWordList();
			ttwWordListSorted = true;
			
/*
			var wordnumbers = [];
			ttwOrigWordList.forEach(function(word) {
				wordnumbers.push(word.replace(/ /g, ' ') + " " + wordwidths[word]);
			});
			document.querySelector('#sorted').textContent = wordnumbers.join("\n");
			document.querySelector('#sorted').style.color = 'blue';
*/
			
			status("sortWordList end");
		}
		
		function wordPostProcessing(index, word) {
			if (ttwSettings.allowRepeats) {
				return;
			}
			
			ttwWordList.splice(index,1);
			ttwBackupWords.push(index + ':::' + word);
			ttwBackupWordsDirty = true;
			
			//remove "piped alternates" from the word list
			if (word in ttwExclusiveWords) {
				var backass = {};
				ttwWordList.forEach(function(word, index) {
					backass[word] = index;
				});
				var indexes = [];
				Object.forEach(ttwExclusiveWords[word], function(word, ignore) {
					if (word in backass) {
						indexes.push(backass[word]);
					}
				});
				indexes.sort();
				//remove words from the list in reverse order, to not screw up the indexes
				for (var i=indexes.length-1; i>=0; i--) {
					ttwWordList.splice(indexes[i],1);
				}
			}
		}
		
		function getRandomWord(maxindex) {
			var index, word, length = maxindex || ttwWordList.length;
			if (length) {
				index = Math.floor(Math.random()*length);
				word = ttwWordList[index];
				wordPostProcessing(index, word);
				return word;
			} else {
				length = ttwBackupWords.length;
				if (length > 0) {
					return ttwBackupWords[Math.floor(Math.random()*ttwBackupWords.length)].replace(ttwBackupWordRE, '');
				} else {
					return "";
				}
			}
		}
	
		function fillElementWithText(el) {
			if (!ttwWordListLoaded) {
				return "";
			}
			
			//status("getText start");
			
			var fullwidth = el.contentWidth();
			var css = getComputedStyle(el);
			var size = parseFloat(css.fontSize);

			var fontprops = elementFontProps(el);

			Object.forEach(fontprops, function(v, k) { ttwRulerMaster.style[k] = v; });
			ttwRulerMaster.style.fontSize = size + 'px';
			
			ttwRulerMaster.removeClass('first-letter');
			resetRuler();

			var middle = ttwSettings.wordLength;
			var shortest = getTextWidth(ttwOrigWordList[0]);
			var longest = getTextWidth(ttwOrigWordList[ttwOrigWordList.length-1]);
			var median = getTextWidth(ttwOrigWordList[Math.floor(ttwOrigWordList.length*middle)]);
			var kindashort = getTextWidth(ttwOrigWordList[Math.floor(ttwOrigWordList.length*0.1)]);
			var sepwidth = getTextWidth(ttwOrigWordList[0] + ttwSettings.separator + ttwOrigWordList[0]) - shortest*2;

			var remainingwidth = fullwidth;
			var text = '', space = '', trytext, tryspace;
	
			handleFirstLetterVariants(fontprops);

			while (remainingwidth > sepwidth + median) {
				trytext = text + space + getRandomWord(remainingwidth < longest ? ttwWordList.length*middle : null);
				tryspace = fullwidth - getTextWidth(trytext);
				if (tryspace >= sepwidth + kindashort) {
					text = trytext;
					remainingwidth = tryspace;
					space = ttwSettings.separator;
				}
			}
	
			//once we get here, we just have to choose one final word
			var basetext = text;
			function fillLastWord(wordlist) {
				if (wordlist === ttwBackupWords && ttwBackupWordsDirty) {
					sortBackupWords();
				}
		
				var start = 0, end = wordlist.length, index, word, found=false;
				var lastindex, lastword;
				
				while (end > start) {
					//zero in on correct word width
					index = Math.floor(start+(end-start)/2);
					word = wordlist[index].replace(ttwBackupWordRE, '');
	
					remainingwidth = fullwidth - getTextWidth(basetext + space + word);
					
					if (false) {
						console.log(start, index, end, basetext + space + word, remainingwidth);
					}
		
					if (remainingwidth < 0.01 * fullwidth) {
						//need to pick a shorter word
						if (index === 0) {
							//if there is no shorter word, give up
							return false;
						}
						end = index;
					} else {
						//need to pick a longer word
						start = index+1;
						lastindex = index;
						lastword = word;
						if (remainingwidth <= 0) {
							break;
						}
					}
				}
		
				if (lastword) {
					if (wordlist === ttwWordList) {
						wordPostProcessing(lastindex, lastword);
					}
					return basetext + space + lastword;
				}
				
				return false;
			}
			
			var result = fillLastWord(ttwWordList) || fillLastWord(ttwBackupWords) || text;
			//status("getText end: " + result);
			return result;
			
			//randomize order
/*
			var words = text.split(' ');
			if (words.length > 1) {
				for(var j, x, i = words.length; i; j = Math.floor(Math.random() * i), x = words[--i], words[i] = words[j], words[j] = x);
			}
			return words.join(' ');
*/
		}
		
		function stringHash(s) {
			//adapted from http://stackoverflow.com/a/7616484
			var hash = 0;
			for (var i = 0, len = s.length; i < len; i++) {
				hash = ((hash << 5) - hash + s.charCodeAt(i)) | 0;
			}
			return hash;
		}
		
		function getFirstFamily(family) {
			return family.replace(/,.+/, '').trim().replace(/^['"]/, '').replace(/['"]$/, '');
		}
		
		var TTW = {};
		
		TTW.allowRepeats = function(yes) {
			ttwSettings.allowRepeats = !!yes;
			return TTW;
		};
		
		TTW.setSeparator = function(sep) {
			ttwSettings.separator = sep;
			return TTW;
		};
		
		TTW.setTestString = function(s) {
			ttwSettings.testString = s;
			return TTW;
		};
		
		TTW.setWordLength = function(s) {
			ttwSettings.wordLength = Math.min(1.0, s);
			return TTW;
		};
		
		TTW.getSettings = function() {
			return JSON.parse(JSON.stringify(ttwSettings));
		}
		
		TTW.setWordList = function(wordlist) {
			if (typeof wordlist === 'string') {
				//cache wordlist in localstorage
				var key = 'owl:' + wordlist;
				ttwSettings.wordList = wordlist;
				
				try {
					if ('localStorage' in window && key in window.localStorage && !ttwRefresh) {
						TTW.setWordList(window.localStorage[key].split("\n"));
						return TTW;
					}
				} catch (e) {
				}

				status("setWordList fetch", wordlist);
				doAjax(ttwSettings.wordList, {
					'complete': function(xhr) {
						var data = xhr.responseText;
						//remove commented lines
						data = data.replace(/^\/\/.+$/mg, '').replace(/(^|\n)\/\*[^]*?\*\/($|\n)/g, '\n');
						//remove extra newlines
						data = data.replace(/[\r\n]+/g, '\n').trim();
						try {
							window.localStorage[key] = data;
						} catch (e) {}
						TTW.setWordList(data.split("\n"));
					}
				});
				return TTW;
			}
			
			status("setWordList real");
			
			//drop any words that are empty or zero width
			ttwOrigWordList = [];
			var nonwhitespace = /\S/;
			wordlist.forEach(function(word, i) {
				 if (nonwhitespace.test(word)) {
					  ttwOrigWordList.push(word);
				 }
			});
			ttwExclusiveWords = {};

			var i, len = ttwOrigWordList.length;
			for (i=0; i < len; i++) {
				var word = ttwOrigWordList[i];
				var pipes = word.split('|');
				if (pipes.length === 1) {
					continue;
				}
	
				Object.forEach(pipes, function(word, ignore) {
					ttwExclusiveWords[word] = pipes;
				});
	
				//replace pipe version with individual words
				ttwOrigWordList.splice.apply(ttwOrigWordList,[i, 1].concat(pipes));
				
				//now skip over the words we just added
				i += pipes.length-1;
				len += pipes.length-1;
			}
			
			TTW.resetWordList()
			ttwWordListSorted = false;
			ttwWordListLoaded = true;
	
			//just in case this was called after setElements, run it
			TTW.update();
			
			return TTW;
		};
	
		TTW.resetWordList = function() {
			status("resetWordList");
			ttwWordList = ttwOrigWordList.slice(); //clone
			ttwBackupWords = [];
		};
		
		TTW.updateElement = function(el) {
			if (!ttwWordListLoaded) {
				return;
			}
			if (!ttwWordListSorted) {
				sortWordList(el);
			}
			el.textContent = fillElementWithText(el);
		};
	
		TTW.update = function() {
			if (!ttwWordListLoaded) {
				return;
			}
			status("update");
			TTW.resetWordList();
			ttwTimeouts.forEach(function(timeout, index) {
				clearTimeout(timeout);
			});
			ttwTimeouts = [];
	
			Object.forEach(ttwFontsLoaded, function(ignore, fontkey) {
				ttwFontElements[fontkey].forEach(function(el, index) {
					ttwTimeouts.push(setTimeout(function() { 
						TTW.updateElement(el);
					}, 0));
				});
			});
		};
		
		//window resize calls this, which sets a slight delay to avoid a million stacked-up calls
		var ttwResizeTimeout, lastWindowWidth=window.innerWidth;
		TTW.updateDelayed = function() {
			if (window.innerWidth === lastWindowWidth) {
				return;
			}
			ttwResizeTimeout && clearTimeout(ttwResizeTimeout);
			ttwResizeTimeout = setTimeout(TTW.update, 400);
		};
	
		TTW.start = function() {
			status("start");
			ttwElements.forEach(function(el) {
				//el.textContent = '';
				//TTW.updateElement(el);
				var fontprops = elementFontProps(el);
				var fontkey = uniqueFontKey(fontprops);
				if (fontkey in ttwFontElements) {
					ttwFontElements[fontkey].push(el);
					if (ttwFontsLoaded[fontkey]) {
						el.removeClass('font-loading');
						el.addClass('font-loaded');
						TTW.updateElement(el);
					} else {
						el.addClass('font-loading');
					}
				} else {
					ttwFontElements[fontkey] = [el];
					el.addClass('font-loading');
					status("ffo start", fontkey);
					var ffo = new FontFaceObserver(getFirstFamily(fontprops['font-family']), {
						'weight': fontprops['font-weight'],
						'style': fontprops['font-style'],
						'stretch': fontprops['font-stretch']
					});
					var onload = function() {
						status("ffo loaded", fontkey);
						ttwFontsLoaded[fontkey] = true;
						ttwFontElements[fontkey].forEach(function(el, index) {
							el.removeClass('font-loading');
							el.addClass('font-loaded');
							TTW.updateElement(el);
						});
					};
					var onfail = function() {
						status("ffo failed", fontkey); 
						ttwFontsLoaded[fontkey] = true;
						ttwFontElements[fontkey].forEach(function(el, index) {
							el.removeClass('font-loading');
							el.addClass('font-failed');
							TTW.updateElement(el);
						});
					}
					ffo.load(ttwSettings.testString).then(onload, onfail);
				}
			});
		};
		
		TTW.setElements = function(elements) {
			if (elements === ttwElementString) {
				return TTW;
			}
			if (typeof elements === 'string') {
				ttwElementString = elements;
				ttwElements = document.querySelectorAll(elements);
			} else if (window.jQuery && elements instanceof jQuery) {
				ttwElements = elements.get();
			} else if ('length' in elements) {
				ttwElements = elements;
			} else {
				ttwElements = [];
			}
			status("setElements")

			ttwElements.forEach(function(el) { el.addClass('managed-by-text-to-width'); });

			doOnReady(TTW.start);
			window.removeEventListener('resize', TTW.updateDelayed);
			window.addEventListener('resize', TTW.updateDelayed);
			
			return TTW;
		};
	
		return TTW;
	}
	
	if (!window.FontFaceObserver) {
/* Font Face Observer v2.0.13 - © Bram Stein. License: BSD-3-Clause */(function(){'use strict';var f,g=[];function l(a){g.push(a);1==g.length&&f()}function m(){for(;g.length;)g[0](),g.shift()}f=function(){setTimeout(m)};function n(a){this.a=p;this.b=void 0;this.f=[];var b=this;try{a(function(a){q(b,a)},function(a){r(b,a)})}catch(c){r(b,c)}}var p=2;function t(a){return new n(function(b,c){c(a)})}function u(a){return new n(function(b){b(a)})}function q(a,b){if(a.a==p){if(b==a)throw new TypeError;var c=!1;try{var d=b&&b.then;if(null!=b&&"object"==typeof b&&"function"==typeof d){d.call(b,function(b){c||q(a,b);c=!0},function(b){c||r(a,b);c=!0});return}}catch(e){c||r(a,e);return}a.a=0;a.b=b;v(a)}}
function r(a,b){if(a.a==p){if(b==a)throw new TypeError;a.a=1;a.b=b;v(a)}}function v(a){l(function(){if(a.a!=p)for(;a.f.length;){var b=a.f.shift(),c=b[0],d=b[1],e=b[2],b=b[3];try{0==a.a?"function"==typeof c?e(c.call(void 0,a.b)):e(a.b):1==a.a&&("function"==typeof d?e(d.call(void 0,a.b)):b(a.b))}catch(h){b(h)}}})}n.prototype.g=function(a){return this.c(void 0,a)};n.prototype.c=function(a,b){var c=this;return new n(function(d,e){c.f.push([a,b,d,e]);v(c)})};
function w(a){return new n(function(b,c){function d(c){return function(d){h[c]=d;e+=1;e==a.length&&b(h)}}var e=0,h=[];0==a.length&&b(h);for(var k=0;k<a.length;k+=1)u(a[k]).c(d(k),c)})}function x(a){return new n(function(b,c){for(var d=0;d<a.length;d+=1)u(a[d]).c(b,c)})};window.Promise||(window.Promise=n,window.Promise.resolve=u,window.Promise.reject=t,window.Promise.race=x,window.Promise.all=w,window.Promise.prototype.then=n.prototype.c,window.Promise.prototype["catch"]=n.prototype.g);}());

(function(){function l(a,b){document.addEventListener?a.addEventListener("scroll",b,!1):a.attachEvent("scroll",b)}function m(a){document.body?a():document.addEventListener?document.addEventListener("DOMContentLoaded",function c(){document.removeEventListener("DOMContentLoaded",c);a()}):document.attachEvent("onreadystatechange",function k(){if("interactive"==document.readyState||"complete"==document.readyState)document.detachEvent("onreadystatechange",k),a()})};function r(a){this.a=document.createElement("div");this.a.setAttribute("aria-hidden","true");this.a.appendChild(document.createTextNode(a));this.b=document.createElement("span");this.c=document.createElement("span");this.h=document.createElement("span");this.f=document.createElement("span");this.g=-1;this.b.style.cssText="max-width:none;display:inline-block;position:absolute;height:100%;width:100%;overflow:scroll;font-size:16px;";this.c.style.cssText="max-width:none;display:inline-block;position:absolute;height:100%;width:100%;overflow:scroll;font-size:16px;";
this.f.style.cssText="max-width:none;display:inline-block;position:absolute;height:100%;width:100%;overflow:scroll;font-size:16px;";this.h.style.cssText="display:inline-block;width:200%;height:200%;font-size:16px;max-width:none;";this.b.appendChild(this.h);this.c.appendChild(this.f);this.a.appendChild(this.b);this.a.appendChild(this.c)}
function t(a,b){a.a.style.cssText="max-width:none;min-width:20px;min-height:20px;display:inline-block;overflow:hidden;position:absolute;width:auto;margin:0;padding:0;top:-999px;white-space:nowrap;font-synthesis:none;font:"+b+";"}function y(a){var b=a.a.offsetWidth,c=b+100;a.f.style.width=c+"px";a.c.scrollLeft=c;a.b.scrollLeft=a.b.scrollWidth+100;return a.g!==b?(a.g=b,!0):!1}function z(a,b){function c(){var a=k;y(a)&&a.a.parentNode&&b(a.g)}var k=a;l(a.b,c);l(a.c,c);y(a)};function A(a,b){var c=b||{};this.family=a;this.style=c.style||"normal";this.weight=c.weight||"normal";this.stretch=c.stretch||"normal"}var B=null,C=null,E=null,F=null;function G(){if(null===C)if(J()&&/Apple/.test(window.navigator.vendor)){var a=/AppleWebKit\/([0-9]+)(?:\.([0-9]+))(?:\.([0-9]+))/.exec(window.navigator.userAgent);C=!!a&&603>parseInt(a[1],10)}else C=!1;return C}function J(){null===F&&(F=!!document.fonts);return F}
function K(){if(null===E){var a=document.createElement("div");try{a.style.font="condensed 100px sans-serif"}catch(b){}E=""!==a.style.font}return E}function L(a,b){return[a.style,a.weight,K()?a.stretch:"","100px",b].join(" ")}
A.prototype.load=function(a,b){var c=this,k=a||"BESbswy",q=0,D=b||3E3,H=(new Date).getTime();return new Promise(function(a,b){if(J()&&!G()){var M=new Promise(function(a,b){function e(){(new Date).getTime()-H>=D?b():document.fonts.load(L(c,'"'+c.family+'"'),k).then(function(c){1<=c.length?a():setTimeout(e,25)},function(){b()})}e()}),N=new Promise(function(a,c){q=setTimeout(c,D)});Promise.race([N,M]).then(function(){clearTimeout(q);a(c)},function(){b(c)})}else m(function(){function u(){var b;if(b=-1!=
f&&-1!=g||-1!=f&&-1!=h||-1!=g&&-1!=h)(b=f!=g&&f!=h&&g!=h)||(null===B&&(b=/AppleWebKit\/([0-9]+)(?:\.([0-9]+))/.exec(window.navigator.userAgent),B=!!b&&(536>parseInt(b[1],10)||536===parseInt(b[1],10)&&11>=parseInt(b[2],10))),b=B&&(f==v&&g==v&&h==v||f==w&&g==w&&h==w||f==x&&g==x&&h==x)),b=!b;b&&(d.parentNode&&d.parentNode.removeChild(d),clearTimeout(q),a(c))}function I(){if((new Date).getTime()-H>=D)d.parentNode&&d.parentNode.removeChild(d),b(c);else{var a=document.hidden;if(!0===a||void 0===a)f=e.a.offsetWidth,
g=n.a.offsetWidth,h=p.a.offsetWidth,u();q=setTimeout(I,50)}}var e=new r(k),n=new r(k),p=new r(k),f=-1,g=-1,h=-1,v=-1,w=-1,x=-1,d=document.createElement("div");d.dir="ltr";t(e,L(c,"sans-serif"));t(n,L(c,"serif"));t(p,L(c,"monospace"));d.appendChild(e.a);d.appendChild(n.a);d.appendChild(p.a);document.body.appendChild(d);v=e.a.offsetWidth;w=n.a.offsetWidth;x=p.a.offsetWidth;I();z(e,function(a){f=a;u()});t(e,L(c,'"'+c.family+'",sans-serif'));z(n,function(a){g=a;u()});t(n,L(c,'"'+c.family+'",serif'));
z(p,function(a){h=a;u()});t(p,L(c,'"'+c.family+'",monospace'))})})};"object"===typeof module?module.exports=A:(window.FontFaceObserver=A,window.FontFaceObserver.prototype.load=A.prototype.load);}());
	}
	
	var totalGroups = 0;
	window.TextToWidth = function(sets) {
		if (typeof sets !== 'object') {
			return;
		}

		var defaults = {};
		if ('defaults' in sets) {
			defaults = sets.defaults;
			delete sets.defaults;
		}

		var readySetGo = function() {
			Object.forEach(sets, function(options, selector) {
				if (typeof options !== 'object') {
					options = {};
				}
				
				//make sure different font settings get different word sorts
				var groupedElements = {};
				document.querySelectorAll(selector).forEach(function(el) {
					var props = elementFontProps(el);
					var key = [];
					//most fonts will not have significant *relative* word length changes between different settings
					// so we only differentiate on major things like all-caps
					['font-family', 'text-transform'].forEach(function(rule, i) {
						var firstLetterVariant = rule + "::first-letter";
						key.push(rule + ':' + props[rule]);
						if (firstLetterVariant in props) {
							key.push(firstLetterVariant + ":" + props[firstLetterVariant]);
						}
					});
					key = key.join(';');
					if (!(key in groupedElements)) {
						groupedElements[key] = [];
					}
					groupedElements[key].push(el);
				});

				Object.forEach(groupedElements, function(elements, k) {
					++totalGroups;
					status("Element group: " + k + " (" + elements.length + ")");
					var ttw = initTextToWidth();
					
					var updateOption = function(v, k) {
						var setter = 'set' + k.charAt(0).toUpperCase() + k.substr(1);
						switch(k) {
						case 'allowRepeats':
							ttw.allowRepeats(v);
							break;
						default:
							if (typeof ttw[setter] === 'function') {
								ttw[setter](v);
							}
							break;
						}
					};

					Object.forEach(defaults, function(v, k) {
						if (!(k in options)) {
							updateOption(v, k);
						}
					});
					
					Object.forEach(options, updateOption);

					ttw.setElements(elements);
				});
			});
			status("Total groups: " + totalGroups);
		};

		doOnReady(readySetGo);

		//(new FontFaceObserver('Blank')).load().then(readySetGo, readySetGo);
	};
})();
