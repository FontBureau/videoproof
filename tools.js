(function() {
	"use strict";

	var temp;
	
	var controls
	
	function fvsToAxes(fvs) {
		if (!fvs) {
			return {};
		}
		if (typeof fvs === 'string') {
			fvs = fvs.split(/, */);
		}
		var axes = {};
		$.each(fvs, function(i, setting) {
			var k, v;
			if (temp = setting.match(/["'](....)['"]\s+([\-\d\.]+)/)) {
				k = temp[1];
				v = parseFloat(temp[2]);
				axes[k] = v;
			}
		});
		return axes;
	}
	
	function axesToFVS(axes) {
		var clauses = [];
		$.each(axes, function(k, v) {
			if (k.length !== 4) {
				return;
			}
			clauses.push('"' + k + '" ' + v);
		});
		if (clauses.length === 0) {
			return "normal";
		} else {
			return clauses.join(", ");
		}
	}

	function slidersToElement() {
		roundInputs();

		var styleEl = $('#style-general');
		var selector = '.variable-demo-target';
		
		var rules = [];
		
		var size = Math.round($('#edit-size').val());
		var leading = Math.round($('#edit-leading').val());
		var foreground = $('#foreground').length && $('#foreground').spectrum('get').toString();
		var background = $('#background').length && $('#background').spectrum('get').toString();

		rules.push('font-family: "' + fontInfo[$('#select-font').val()].name + ' Demo"');
		
		if (size) {
			rules.push("font-size: " + size + 'pt');
		}
		
		if (leading) {
			rules.push("line-height: " + leading + 'pt');
		}
		
		if (background) {
			rules.push('background-color: ' + background);
		}

		if (foreground) {
			rules.push('color: ' + foreground);
		}
		
		if ((temp=$('input[name=alignment]')).length) {
			rules.push("text-align: " + (temp.filter(':checked').val() || 'left'));
		}
		
		// update the actual CSS
		styleEl.text('\n' 
			+ selector + ' {\n\t' + rules.join(';\n\t') + ';\n}\n'
		);
	}
	
	function roundInputs() {
		controls.find('#edit-size, #edit-to-size, #edit-leading').each(function() {
			this.value = Math.round(parseFloat(this.value) * 1000) / 1000;
		});
	}
	
	function calculateKeyframes(font) {
		//O(3^n)? this might get ugly
		var keyframes = [];
		
		//represent each frame as a trinary number: 000, 001, 002, 010, 011, 012…
		// 0 is axis min, 1 is axis default, 2 is axis max
		// some combinations might be skipped if the min/max is the default
		var current = 0;
		var axesMDM = [];
		var raxisPresent = [];
		$.each(registeredAxes, function(index, axis) {
			if (axis in font.axes) {
				raxisPresent.push(axis);
				axesMDM.push([font.axes[axis].min, font.axes[axis].default, font.axes[axis].max]);
			}
		});

		var permutations = [];
		var i, maxperms, j, l;
		var raxisCount = raxisPresent.length;
		var perm, filler;
		for (i=0, maxperms = Math.pow(3, raxisCount); i < maxperms; i++) {
			current = i.toString(3);
			filler = raxisCount - current.length;
			perm = [];
			for (j=0; j<filler; j++) {
				perm.push(axesMDM[j][0]);
			}
			for (j=0, l=current.length; j<l; j++) {
				perm.push(axesMDM[filler+j][current[j]]);
			}
			permutations.push(perm);
		}

		$.each(permutations, function(i, perm) {
			$.each(raxisPresent, function(j, axis) {
				perm[j] = '"' + axis + '" ' + perm[j];
			});
			permutations[i] = perm.join(', ');
		});
		
		return permutations;
	}

	var videoproofOutputInterval, videoproofActiveTarget;
	function startAnimation() {
		var output = document.getElementById('aniparams');
		var timestamp = $('label[for=animation-scrub]');
		var scrub = $('#animation-scrub')[0];
		var mode = $('#select-mode')[0];

		$('html').removeClass('paused');
		videoproofOutputInterval = setInterval(function() {
			var css = videoproofActiveTarget ? getComputedStyle(videoproofActiveTarget) : {};
			var percent = parseFloat(css.outlineOffset);
			var bits = [
				mode.options[mode.selectedIndex].textContent,
				css ? css.fontVariationSettings.replace(/"|(\.\d+)/g, '') : ""
			];
			output.textContent = bits.join(": ");
			scrub.value = percent;
			timestamp.text(Math.round(percent));
			if (percent == 100) {
				resetAnimation();
			}
		}, 100);
	}
	
	function stopAnimation() {
		$('html').addClass('paused');
		if (videoproofOutputInterval) {
			clearInterval(videoproofOutputInterval);
			videoproofOutputInterval = null;
		}
	};

	function setupAnimation() {
		$('#animation-controls button.play-pause').on('click', function() {
			videoproofOutputInterval ? stopAnimation() : startAnimation();
		});
		
		$('#animation-duration').on('change input', function() {
			$('.variable-demo-target').css('animation-duration', this.value + 's');
		}).trigger('change');

		$('#first-play').css('cursor', 'pointer').on('click', startAnimation);
	}

	function resetAnimation() {
		stopAnimation();
		
		var keyframes = calculateKeyframes(fontInfo[$('#select-font').val()]);
		
		//close the loop
		var perstep = 100 / keyframes.length;
		$('#animation-duration').val(keyframes.length * 2).trigger('change');
		keyframes.push(keyframes[0]);
		$.each(keyframes, function(i, axes) {
			var percent = Math.round(10*(perstep * i))/10;
			keyframes[i] = percent + '% { font-variation-settings: ' + axes + '; outline-offset: ' + percent + 'px; }';
		});
		document.getElementById('videoproof-keyframes').textContent = "@keyframes videoproof {\n" + keyframes.join("\n") + "}";
		
		$('.variable-demo-target').css('animation-name', 'none');
		setTimeout(function() {
			$('.variable-demo-target').css('animation-name', '');
			stop();
		}, 100);
	}

	
	function handleFontChange(font) {
		var spectropts = {
			'showInput': true,
			'showAlpha': true,
			'showPalette': true,
			'showSelectionPalette': true,
			'localStorageKey': 'spectrum',
			'showInitial': true,
			'chooseText': 'OK',
			'cancelText': 'Cancel',
			'preferredFormat': 'hex'
		};

		spectropts.color = $('#foreground').attr('value');
		$('#foreground').spectrum(spectropts);

		spectropts.color = $('#background').attr('value');
		$('#background').spectrum(spectropts);
		
		$('head style[id^="style-"]').empty().removeData();
		$('input[type=checkbox]').each(function() {
			this.checked = this.hasAttribute('checked');
			$(this).trigger('change');
		});
		$('#align-left').prop('checked',true);
		
		resetAnimation();
	}

	function addCustomFont(fonttag, url, format, font) {
		var info = {
			'name': font.getEnglishName('fontFamily'),
			'axes': {},
			'axisOrder': [],
			'fontobj': font
		};
		if ('fvar' in font.tables && 'axes' in font.tables.fvar) {
			$.each(font.tables.fvar.axes, function(i, axis) {
				info.axes[axis.tag] = {
					'name': 'name' in axis ? axis.name.en : axis.tag,
					'min': axis.minValue,
					'max': axis.maxValue,
					'default': axis.defaultValue
				};
				info.axisOrder.push(axis.tag);
			});
		}
		
		window.font = font;

		$('head').append('<style>@font-face { font-family:"' + info.name + ' Demo"; src: url("' + url + '") format("' + format + '"); }</style>');

		window.fontInfo[fonttag] = info;
		var optgroup = $('#custom-optgroup');
		var option = document.createElement('option');
		option.value = fonttag;
		option.innerHTML = info.name;
		option.selected = true;
		if (!optgroup.length) {
			$('#select-font').wrapInner('<optgroup label="Defaults"></optgroup>');
			optgroup = $('<optgroup id="custom-optgroup" label="Your fonts"></optgroup>').prependTo($('#select-font'));
		}
		optgroup.append(option);

		setTimeout(function() { $('#select-font').trigger('change') });
	}

	function addCustomFonts(files) {
		$.each(files, function(i, file) {
			var reader = new FileReader();
			var mimetype, format;
			if (file.name.match(/\.[ot]tf$/)) {
				mimetype = "application/font-sfnt";
				format = "opentype";
			} else if (file.name.match(/\.(woff2?)$/)) {
				mimetype = "application/font-woff";
				format = RegExp.$1;
			} else {
				alert(file.name + " not a supported file type");
				return;
			}
			var blob = new Blob([file], {'type': mimetype});
			reader.addEventListener('load', function() {
				var datauri = this.result;
				window.opentype.load(datauri, function(err, font) {
					if (err) {
						console.log(err);
						return;
					}
					var fonttag = 'custom-' + file.name.replace(/(-VF)?\.\w+$/, '');
					addCustomFont(fonttag, datauri, format, font);
				});
			});
			reader.readAsDataURL(blob);
		});
	}
	

	function tnTypeTools() {
		return {
			'customFonts': {},
			'clone': function(obj) { return JSON.parse(JSON.stringify(obj)); },
			'slidersToElement': slidersToElement,
			'handleFontChange': handleFontChange,
			'fvsToAxes': fvsToAxes,
			'axesToFVS': axesToFVS,
			'addCustomFonts': addCustomFonts,
			'addCustomFont': addCustomFont,
			'resetAnimation': resetAnimation
		};
	}
	
	$(function() {
		controls = $('#controls');
		$('head').append("<style id='style-general'></style>");
		$('#mode-sections > sections').each(function() {
			var styleid = 'style-' + this.id;
			if ($('#' + styleid).length === 0) {
				$('head').append("<style id='" + styleid + "'></style>");
			}
		});

		$('#select-mode').on('change', function(evt) {
			var newActiveSection = $('#mode-sections > #' + this.value);
			$('#mode-sections > section').hide();
			newActiveSection.show();
			videoproofActiveTarget = newActiveSection.find('.variable-demo-target').get(0);
			$('label[for="edit-to-size"], #edit-to-size')[this.value === 'waterfall' ? 'show' : 'hide']();
			$('input[name=size]').val(this.value==='waterfall' ? 18 : 36).trigger('change');
			$('input[name="to-size"]').val(72).trigger('change');
		});

		$('#select-font').on('change', function(evt) {
			if (TNTools.handleFontChange($(this).val()) === false) {
				return;
			}
		});

		controls.on('change input', 'input[type=range], input[type=number]', function(evt) {
			var constrained = Math.max(this.min || -Infinity, Math.min(this.max || Infinity, this.value));
			if (this.type === 'range' && this.name === 'size') {
				var leading = parseFloat($('#edit-leading').val());
				var oldval = parseFloat($(this).data('oldval'));
			}
			TNTools.slidersToElement();
		});

		$("input[type=radio]").on('change', function() { TNTools.slidersToElement(); });
		$('#foreground, #background').on('move.spectrum change.spectrum hide.spectrum', function() { TNTools.slidersToElement(); });

		$('#reset').on('click', function() {
			$('#select-font').trigger('change');
			return false;
		});
		
		$('#add-your-own-button').on('click', function(evt) {
			$('#custom-fonts')[0].click();
			return false;
		});

		$('#custom-fonts').on('change', function() {
			addCustomFonts(this.files);
		});
		
		$('#foreground, #background').on('click', function() {
			//clicking color labels fires the real control and not the spectrum picker
			$(this).spectrum('toggle');
			return false;
		});
		
		var dragging = false;
		$('body').on('dragover', function(evt) {
			if (dragging) return false;
			dragging = true;
			evt.originalEvent.dataTransfer.dropEffect = 'copy';
			$('body').addClass('dropzone');
			return false;
		}).on('dragleave', function(evt) {
			if (evt.target !== document.body) {
				return;
			}
			dragging = false;
			$('body').removeClass('dropzone');
			return false;
		}).on('dragend', function(evt) {
			$('body').removeClass('dropzone');
			dragging = false;
			return false;
		}).on('drop', function(evt) {
			addCustomFonts(evt.originalEvent.dataTransfer.files);
			$(this).trigger('dragend');
			return false;
		});
	});
	
	window.TNTools = tnTypeTools();

	$(window).on('load', function() {
		setTimeout(function() {
			var showSidebar = $('a.content-options-show-filters');
			if (showSidebar.is(':visible')) {
				showSidebar.click();
			}
			
			setupAnimation();
			
			$('#select-mode').trigger('change');
			$('#select-font').trigger('change');
		},100);
	});
})();
