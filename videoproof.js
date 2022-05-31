/* jshint browser: true, esversion: 8, laxcomma: true, laxbreak: true */

import opentype from './opentype.js/dist/opentype.module.js';

import grid from './layouts/grid.js';
import typeYourOwn from './layouts/type-your-own.js';
import contextual from './layouts/contextual.js';
import composition from './layouts/composition.js';

var layouts = {
    grid: grid,
    'type-your-own': typeYourOwn,
    contextual: contextual,
    composition: composition
};

    var temp;
    var currentFont;

    function cssStringEscape(s) {
        //for e.g. input[value="arbitrary string"]
        return s.replace(/[\n\\"\\']/g, function (c) { return '\\' + c.charCodeAt(0).toString(16); });
    }

    function fvsToAxes(fvs) {
        if (!fvs) {
            return {};
        }
        if (typeof fvs === 'string') {
            fvs = fvs.split(/, */);
        }
        var axes = {};
        $.each(fvs, function(i, setting) {
            var k, v
              , temp = setting.match(/["'](....)['"]\s+([\-\d\.]+)/)
              ;
            if (temp) {
                k = temp[1];
                v = parseFloat(temp[2]);
                axes[k] = v;
            }
        });
        return axes;
    }

    function getTimestamp() {
        var css = getComputedStyle(animTarget);
        var percent = parseFloat(css.outlineOffset);
        var offset = percent / 100 * parseFloat(document.getElementById('animation-duration').value);
        return currentKeyframe ? -parseFloat(css.animationDelay) : offset;
    }

    function updateURL() {
        // Only acts on #controls, that's why layout mode:composition is
        // not serialized. Similarly, animation-duration is not serialized,
        // but it also has no "name" attribute.
        // In composition mode, however, the interface can recall and
        // reload the keyframe settings for the diferent elements.
        var settings = $('#controls').serializeArray();

        //and other things outside the main form
        settings.push({'name': 'timestamp', 'value': getTimestamp()});

        if (moarAxis) {
            settings.push({'name': 'moar', 'value': moarAxis + ' ' + fvsToAxes(getComputedStyle(animTarget).fontVariationSettings)[moarAxis]});
        }

        var url = [];
        settings.forEach(function(setting) {
            url.push(setting.name.replace(/^select-/, '') + '=' + encodeURIComponent(setting.value));
        });
        window.history.replaceState({}, '', '?' + url.join('&'));
    }

    function axesToFVS(axes) {
        var clauses = [];

        //workaround Safari default-opsz bug
        //   FIXME: does this still exist? Would be nice to have a reference
        //          link to this.
        try {
            // FIXME: Why would this thow an error? Maybe because the
            // font has no opsz?
            if ('opsz' in axes && axes.opsz == currentFont.axes.opsz['default']) {
                axes.opsz = currentFont.axes.opsz['default'] + 0.1;
            }
        } catch (e) {}

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
        var styleEl = $('#style-general');
        // FIXME: stuff like this could go directly to element.style
        var selector = '#the-proof';

        var rules = [];

        var foreground = $('#foreground').val();
        var background = $('#background').val();

        rules.push('font-family: "' + $('#select-font').val() + '-VP"');

        if (background) {
            rules.push('background-color: ' + background);
        }

        if (foreground) {
            rules.push('color: ' + foreground);
        }

        // update the actual CSS
        styleEl.text('\n'
            + selector + ' {\n\t' + rules.join(';\n\t') + ';\n}\n'
        );
    }

    //find characters in the font that aren't in any of the defined glyph groups
    function getMiscChars() {
        var definedGlyphs = {};
        Array.from(getKnownGlyphs()).forEach(function(c) {
            definedGlyphs[c] = true;
        });
        var result = "";
        if (!currentFont || !currentFont.fontobj) {
            return result;
        }
        Object.keys(currentFont.fontobj.tables.cmap.glyphIndexMap).forEach(function(u) {
            var c = String.fromCodePoint(u);
            if (!(c in definedGlyphs)) {
                result += c;
            }
        });
        return result;
    }

    function getKnownGlyphs() {
        var glyphset = '';
        var addthing = function(thing) {
            switch (typeof thing) {
                case "string":
                    glyphset += thing;
                    break;
                case "object":
                    $.each(thing, function(k, v) {
                        addthing(v);
                    });
                    break;
            }
        };
        addthing(window.glyphsets);
        return glyphset;
    }

    function getAllGlyphs() {
        return getKnownGlyphs() + getMiscChars();
    }

    // impure
    function getGlyphString(glyphset, extended) {
        var input = document.querySelector('#select-glyphs :checked');

        if (typeof glyphset === 'string') {
            input = document.querySelector('#select-glyphs option[value="' + cssStringEscape(glyphset) + '"]');
        } else {
            input = document.querySelector('#select-glyphs :checked');
            glyphset = input.value;
        }

        if (typeof extended !== 'boolean') {
            extended = document.getElementById('show-extended-glyphs').checked;
        }

        if (extended && input.hasAttribute('data-extended')) {
            glyphset += input.getAttribute('data-extended');
        }

        var glyphsort = glyphset === 'all-gid' ? 'gid' : 'group';

        switch (glyphset) {
            case 'misc':
                glyphset = getMiscChars();
                break;
            case 'all-gid':
            case 'all-groups':
            default:
                glyphset = getAllGlyphs();
                break;
        }

        //and now sort them by the selected method
        if (!currentFont || !currentFont.fontobj) {
            return glyphset;
        }
        return _pure_getGlyphString(currentFont.fontobj, glyphsort, glyphset, extended);
    }

    function _pure_getGlyphString(fontobj, glyphsort, glyphset, extended) {
        var cmap = fontobj.tables.cmap.glyphIndexMap;
        var unicodes = [];
        var checkCmap = false;
        switch (glyphsort) {
            case 'gid': // sort by glyph ID
                unicodes = Object.keys(cmap);
                unicodes.sort(function(a, b) { return cmap[a] - cmap[b]; });
                unicodes.forEach(function(u, i) {
                    unicodes[i] = String.fromCodePoint(u);
                });
                break;
            case 'group': // sort by defined groups
                unicodes = Array.from(glyphset);
                checkCmap = true;
                break;
            case 'unicode':
            default: // sort by unicode
                unicodes = Object.keys(cmap);
                unicodes.sort(function(a, b) { return a-b; });
                unicodes.forEach(function(u, i) {
                    unicodes[i] = String.fromCodePoint(u);
                });
                break;
        }

        var temp = [];
        if (checkCmap) {
            unicodes.forEach(function(c) {
                if (c.codePointAt(0) in cmap) {
                    temp.push(c);
                }
            });
            unicodes = temp;
        }

        return unicodes.join('');
    }

    function sizeToSpace() {
        // In general I think this could be made quicker, as the size change
        // is linear because it doesn't change i.e. opsz when chahnging
        // font-size. Hence, we can change once to min-font-size and measure
        // then to max-font-size and measure, and then interpolate to
        // the size we want.


        //grow/shrink the font so it "fits" on the page
        var winHeight = window.innerHeight - 96;
        var gridBox = theProof.getBoundingClientRect();
        var gridHeight = gridBox.height;
        var fullWidth = gridBox.width;
        var fontsize = parseFloat(getComputedStyle(theProof).fontSize);
        var minFontSize = 24, maxFontSize = 144;

        // growing until
        //      first term:
        //          as in shrinking, this has the problem of surpassing
        //          maxFontSize :-(. However, it will be shrunken in the
        //          next loop.
        //      AND
        //      second term
        //          grid height must fit into "window.innerHeight - 96;"
        //          I can only speculate what evil kind of hardcoding the
        //          96 px is supposed to be...
        //          AND scrollWidth must be lower than getBoundingClientRect.width
        //          i.e. we want to avoid horizontal/x scroll
        //          THIS TERM as well will go just beyond the point until
        //          there is scrolling, hence the shrinking is required.
        //
        //          This will do one of both: gridHeight >= winHeight
        //                                    OR theProof.scrollWidth > fullWidth
        while (fontsize <= maxFontSize && (gridHeight < winHeight && theProof.scrollWidth <= fullWidth)) {
            fontsize *= 1.5;
            // apply font-size (floored?)
            theProof.style.fontSize = Math.floor(fontsize) + 'px';
            // after setting font-size, get new height of theProof/grid
            gridHeight = theProof.getBoundingClientRect().height;
        }

        // shrinking until
        //      first term:
        //          it's funny, when fontsize is just below minFontSize
        //          this will stop, so it will be smaller than minFontSize
        //          should be: fontsize = Math.max(minFontSize, fontsize * 09)
        //      AND
        //      second term:
        //          gridHeight must shrink below win-height, so we fit
        //          on page vertically.
        //          OR scroll width shrinks below getBoundingClientRect.width
        //          i.e. we stop when there's no more scrolling in the
        //          horizontal direction
        //
        //          This will do both:   gridHeight <= winHeight
        //                              AND theProof.scrollWidth <= fullWidth
        //          so if possible within min/max, it should fit on the page
        //          without scrolling, if I read this correctly.
        while (fontsize >= minFontSize && (gridHeight > winHeight || theProof.scrollWidth > fullWidth)) {
            fontsize *= 0.9;
            theProof.style.fontSize = Math.floor(fontsize) + 'px';
            gridHeight = theProof.getBoundingClientRect().height;
        }

        // and now, we clamp to min/max fontsize, could be earlier or:
        // theProof.style.fontSize = Math.min(maxFontSize, Math.max(minFontSize, Math.floor(fontsize)));

        if (fontsize < minFontSize) {
            theProof.style.fontSize = minFontSize + 'px';
        } else if (fontsize > maxFontSize) {
            theProof.style.fontSize = maxFontSize + 'px';
        }

        return fontsize;
    }

    function setWidest() {
        if (!currentFont) {
            return;
        }

        //disable the animation for a minute

        // one would think there's no way to override element.style properties
        // yet, still we're using !important. Which means the author has
        // no clue where and how the property is handled.
        theProof.style.animationName = 'none !important';

        //get the stuff as wide as possible
        var axes = currentFont.axes;
        var fvs = {};
        if ('wdth' in axes) {
            fvs.wdth = axes.wdth.max;
        }
        if ('wght' in axes) {
            fvs.wght = axes.wght.max;
        }
        if ('opsz' in axes) {
            fvs.opsz = axes.opsz.min;
        }

        theProof.style.fontVariationSettings = axesToFVS(fvs);
    }

    function unsetWidest() {
        //re-enable the animation and remove the wide settings
        theProof.style.removeProperty('font-variation-settings');
        theProof.style.removeProperty('animation-name');
    }

    // OK, I think this is to make the longest possible lines, that won't
    // break, even when wdth etc. go to their max values. it's interesting,
    // that this seems to be NOT working right now!
    // Ii IS WORKING, it's only applied in grid, nowhere else.
    // It doesn't work as expected, when applied to contextual, likely
    // because of the width set to the spans, which indeed stops "stuff"
    // from moving around, but since that is a more line based then grid
    // based view, it would be nice when the lines grow/and shrink.
    function fixLineBreaks() {
        var grid = document.querySelector('#the-proof.fixed-line-breaks');
        if (!grid) {
            return;
        }

        //reset
        grid.style.removeProperty('font-size');

        // OOF, this is bad style, meant to remove the divs
        // which represent/style the individual lines, but one should
        // not use regex to manipulate (or even read within) the DOM.
        grid.innerHTML = grid.innerHTML.replace(/<\/?div[^>]*>/g, '');

        // Setting the widest wdth/wght/opsz combination the font can
        // handle.
        setWidest();

        var fontsize = VideoProof.sizeToSpace();

        var lines = [], line = [], lastX = Infinity;
        $.each(grid.childNodes, function(i, span) {
            if (!span.tagName || span.tagName !== 'SPAN') {
                // In cases like this I must wonder who controls the
                // content! If we'd iterate grid.children we'd get only
                // elements and if we had control, we'd get only spans.
                // So why is there no control? I believe and hope there \
                // is actually control, but it's written with an insecure
                // style.
                return;
            }
            var box = span.getBoundingClientRect();
            if (box.width > 0) {
                // WHY would it already be set? If fontsize changes,
                // width should maybe change as well. OK, width is set
                // in em and in this case em scales linearly ...
                // but then again, why should it ever "move around"?
                // I hope I will learn the answers...
                if (!span.style.width) {
                    // hard-code the max width so it doesn't move around
                    // Maybe, for the "grid" view, this all could be
                    // simplified using css table, grid or flex layout.
                    // besides, the grid is not very strictly a grid,
                    // depending on glyph-widths columns align sloppily.
                    // It's not too bad though, because of min-width: 1em;
                    // for each element, but e.g. "Ǆ" can be wider than
                    // 1em.
                    span.style.width = (box.width / fontsize) + 'em';
                }
                if (box.left < lastX) {
                    // a line break
                    if (line && line.length) {
                        lines.push(line);
                    }
                    line = [];
                }
                // moves the cursor
                lastX = box.left;
            }
            line.push(span);
        });
        // keep the last line
        if (line && line.length) {
            lines.push(line);
        }

        lines.forEach(function(line) {
            var div = document.createElement('div');
            line.forEach(function(span) {
                div.appendChild(span);
            });
            grid.appendChild(div);
        });

        unsetWidest();
    }

    // definitely one of the evil global states
    // set by bracketRap in init of comosition, unset via
    // options of each other layout,
    var rapBracket = false;

    //acceptable ranges of various axes
    var rapTolerances = {};

/**
 * Array.from( cartesianProductGen([['a', 'b'], ['c', 'd']]) )
 * >>> [['a', 'c'], ['a', 'd'], ['b', 'c'], ['b', 'd']]
 *
 * No intermediate arrays are created.
 */
function* cartesianProductGen([head, ...tail]) {
    if(!head)
        yield [];
    else {
        // NOTE: the sequence of productGen(tail) could be stored
        // here as an intermediate array, but it may not improve
        // performance, as it's heavier on memory:
        // let products = [...productGen(tail)];
        for(let item of head)
            for(let prod of cartesianProductGen(tail))
                yield [item, ...prod];
    }
}

/**
 *  Just like Pythons zip.
 */
function* zip(...arrays) {
    let len = Math.min(...arrays.map(a=>a.length));
    for(let i=0;i<len;i++)
        yield arrays.map(a=>a[i]); // jshint ignore:line
}

function axisRangesForRapBracket(fontAxes, rapBracket, rapTolerances) {
    let axisRanges = {};
    console.log('"rapBracket":', rapBracket);
    // Composition @ small
    // {
    //     opsz: 19.919999999999998,
    //     wdth: 100,
    //     wght: 400
    // }
    // Composition @ large
    // {
    //     opsz: 63.99997499999999,
    //     wdth: 100,
    //     wght: 400
    // }

    console.log('"rapTolerances":', rapTolerances);
    // rapTolerances: acceptable ranges of various axes
    //
    // Composition @ small
    // In this case wdth will be multiplied while
    // wght will be added.
    // {
    //      wdth: Array [ 0.8, 1.2 ]
    //      wght: Array [ -100, 100 ]
    // }
    //
    // Composition @ large
    // Both will be added, this forces always min/max
    // instead of lower/upper.
    // {
    //         wdth: Array [ -100000000, 10000000 ]
    //         wght: Array [ -1000000, 10000000 ]
    //}

    // Here are generic tolerances, from the function bracketRap,
    // but they are never used because bracketRap is only called
    // in one position, and there always witht the tol argument.
    // rapTolerances = tol || {
    //     'opsz': [1, 1],
    //     'wght': [-100, +100],
    //     'wdth': [0.8, 1.2],
    //     'default': [0.5, 2.0]
    // };

    // tol is defined in composition like this:
    // var tol = currentSize === 'small'
    //                 ? { 'wght': [-100, +100], 'wdth': [0.8, 1.2] }
    //                 : { 'wght': [-1000000, +10000000], 'wdth': [-100000000, +10000000] };

    for(let [axis, pivot] of Object.entries(rapBracket)) {
        let  [tolMin, tolMax] = axis in rapTolerances
                                    ? rapTolerances[axis]
                                    : [1, 1]
          , min = fontAxes[axis].min
          , max = fontAxes[axis].max
          // Make the product if tolMin is netween 0 and 1 otherwise
          // make the sum. because it's the product for tolMin == 1
          // [tolMin, tolMax] = [1, 1] will create an identity function
          // as well as [tolMin, tolMax] = [0, 0] where addition
          // is used.
          // FIXME: I think this is VERY implicit and not at all
          //        clear in which case and why which mode is
          //        chosen
          , operation = tolMin > 0 && tolMin <= 1
                        ? (a, b)=>a * b
                        : (a, b)=>a + b
          , lower = operation(pivot, tolMin)
          , upper = operation(pivot, tolMax)
          ;
        axisRanges[axis] = {
            min: Math.max(min, lower),
            'default': pivot,
            max: Math.min(max, upper)
        };
    }
    return axisRanges;
}

    // TODO: rewrite this next!
    function calculateKeyframes(currentFont) {

        var axesMDM = []; // min-default-max
        var axesOrder = [];
        var axisRanges = (typeof rapBracket === 'object')
            // FIXME: rapBracket, rapTolerances are global
            ? axisRangesForRapBracket(currentFont.axes, rapBracket, rapTolerances)
            : currentFont.axes
            ;

        console.log('axisRanges:', axisRanges);

        // FIXME: registeredAxes is global
        for(let axis of registeredAxes) {
            // mdn stands for min-default-max, however, the order
            // is default-min-max expect for opsz.
            // FIXME: find out the reason behind this.
            if (!(axis in axisRanges)) {
                console.log(`axis ${axis} not in axisRanges`, axisRanges);
                continue;
            }
            axesOrder.push(axis);

            let mdmOrder = axis === 'opsz'
                    ? ['min', 'default', 'max']
                    : ['default', 'min', 'max']
              , axisRange = axisRanges[axis]
              , mdm = mdmOrder.filter(k=>{ // jshint ignore:line
                        // This was loosely adopted from previous code
                        // where I didn't understand the full reasoning
                        // but for the present examples it produces the
                        // same result and is much more consise.
                        if (k === 'default')
                            return true;
                        return (axisRange[k] !== axisRange['default']);
                    })
                    .map(k=>axisRange[k]) // jshint ignore:line
              ;
            axesMDM.push(mdm);
        }

        if (!axesOrder.length)
            return [];

        var fvsPerms = []
          , prev
          ;

        for(let axesValues of cartesianProductGen(axesMDM)) {
            let variationSettings = Object.fromEntries(zip(axesOrder, axesValues));
            // FIXME: axesToFVS could take just the result of the zip
            //        but it may get replaced entirely, so I leave it here
            //        for the time being.
            let fvs = axesToFVS(variationSettings);
            // FIXME: I currently think there should be no duplicates.
            if (fvs !== prev)
                fvsPerms.push(fvs);
            else
                console.warn(`Found a case of duplication: ${fvs}`);
            prev = fvs;
        }
        return fvsPerms;
    }

    function axisRound(axis, value) {
        var axisInfo, span, places, mult;
        try {
            axisInfo = currentFont.axes[axis];
            span = axisInfo.max - axisInfo.min;
            if (span > 100) {
                places = 0;
            } else if (span > 10) {
                places = 1;
            } else {
                places = 2;
            }
        } catch (e) {
            places = 0;
        }
        mult = Math.pow(10, places);
        return Math.round(mult * value) / mult;
    }

    var videoproofOutputInterval, theProof, animTarget, animationRunning = false;
    function animationUpdateOutput() {
        var output = document.getElementById('aniparams');
        var mode = $('#select-layout')[0];

        var css = animTarget ? getComputedStyle(animTarget) : {};

        var axes = fvsToAxes(css.fontVariationSettings);
        var outputAxes = [];
        $.each(registeredAxes, function(i, axis) {
            if (axis in axes) {
                outputAxes.push(axis + ' ' + axisRound(axis, axes[axis]));
            }
        });
        if (moarAxis) {
            outputAxes.push(moarAxis + ' ' + axisRound(moarAxis, axes[moarAxis]));
        }
        var bits = [
            currentFont.name,
            `${mode.options[mode.selectedIndex].textContent} (${mode.value})`,
            outputAxes.join(' ')
        ];
        output.textContent = bits.join(": ");
    }

    function startAnimation(anim) {
        animTarget = theProof.querySelector('.animation-target') || theProof;
        console.log('start', anim, Date.now());
        if (anim === 'moar') {
            $('html').addClass('moar');
        } else {
            $('html').removeClass('moar');
            updateAnimationParam('animation-name', typeof anim === 'string' ? anim : null);
            resetMoarAxes();
        }
        $('html').removeClass('paused');
        if (!videoproofOutputInterval) {
            videoproofOutputInterval = setInterval(animationUpdateOutput, 100);
        }
        animationRunning = true;
        currentKeyframe = null;
    }

    function stopAnimation() {
        console.log('stop', Date.now());
        animationRunning = false;
        $('html').addClass('paused');
        if (videoproofOutputInterval) {
            clearInterval(videoproofOutputInterval);
            videoproofOutputInterval = null;
        }
    }

    function jumpToTimestamp(timestamp) {
        animTarget = theProof.querySelector('.animation-target') || theProof;
        timestamp = parseFloat(timestamp);
        if (isNaN(timestamp)) {
            return;
        }
        if (timestamp < 0) {
            timestamp = -timestamp;
        }

        stopAnimation();

        updateAnimationParam('animation-delay', -timestamp + 's');
        animationNameOnOff();

        setTimeout(animationUpdateOutput);

        //need to do a bit of extra hoop jumping for the keyframe display
        $('#keyframes-display a').css('animation-name', 'none');
        setTimeout(function() {
            $('#keyframes-display a').css('animation-name', '');
        }, 100);
    }

    var currentKeyframe;
    function jumpToKeyframe(index) {
        console.log('jump');
        stopAnimation();
        resetMoarAxes();
        currentKeyframe = index;
        var duration = parseFloat($('#animation-duration').val());
        var ratio = index / currentKeyframes.length;
        var kfTime = ratio * duration;

        //set "timestamp" in animation, for resuming
        jumpToTimestamp(kfTime);

        //but the interpolation is imprecise, so also set the explicit FVS for the keyframe
        if (/font-variation-settings\s*:\s*([^;\}]+)/.test(currentKeyframes[index])) {
            updateAnimationParam('font-variation-settings', RegExp.$1);
        }

        updateURL();
    }

    function setupAnimation() {
        theProof = document.getElementById('the-proof');
        animTarget = theProof.querySelector('.animation-target') || theProof;
        $('#animation-controls button.play-pause').on('click', function() {
            if ($('html').hasClass('paused')) {
                startAnimation();
            } else {
                stopAnimation();
                updateURL();
            }
        });

        $('#animation-controls').find('button.back, button.forward').on('click', function() {
            if (!theProof || !currentKeyframes) {
                return;
            }
            var toIndex;
            if (typeof currentKeyframe === 'number') {
                toIndex = $(this).hasClass('back') ? currentKeyframe - 1 : currentKeyframe + 1;
            } else {
                var css = getComputedStyle(animTarget);
                var percent = parseFloat(css.outlineOffset);
                var exactIndex = percent / 100 * currentKeyframes.length;
                //if we're already on an index, go to the next int
                if (Math.abs(exactIndex - Math.round(exactIndex)) > 0.01) {
                    toIndex = Math[$(this).hasClass('back') ? 'floor' : 'ceil'](exactIndex);
                } else {
                    toIndex = $(this).hasClass('back') ? Math.round(exactIndex) - 1 : Math.round(exactIndex) + 1;
                }
            }
            if (toIndex < 0 || toIndex >= currentKeyframes.length) {
                toIndex = 0;
            }
            jumpToKeyframe(toIndex);
        });

        $('#animation-controls button.beginning').on('click', resetAnimation);
        $('#animation-controls button.end').on('click', function() {
            if (!theProof || !currentKeyframes) {
                return;
            }
            jumpToKeyframe(currentKeyframes.length - 1);
        });

        $('#animation-duration').on('change input', function() {
            updateAnimationParam('animation-duration', this.value + 's');
        }).trigger('change');

        $('#first-play').css('cursor', 'pointer').on('click', startAnimation);
    }

    var currentKeyframes;
    function animationNameOnOff() {
        console.log('onoff');
        updateAnimationParam('animation-name', 'none !important');
        setTimeout(function() {
            updateAnimationParam('animation-name', null);
            stopAnimation();
            setTimeout(animationUpdateOutput);
        }, 100);
    }

    function updateAnimationParam(k, v) {
        var style = $('style.' + k);
        if (!style.length) {
            $('head').append("<style class='" + k + "'></style>");
            style = $('style.' + k);
        }
        if (v === '' || v === null) {
            style.empty();
        } else {
            style.text('#the-proof, #the-proof .animation-target, #keyframes-display a { ' + k + ': ' + v + '; }');
        }
    }

    function resetAnimation() {
        console.log('reset');
        stopAnimation();

        if (!currentFont) {
            return;
        }

        var keyframes = currentKeyframes = calculateKeyframes(currentFont);
        console.log(`calculateKeyframes result:`, keyframes.slice());

        if(!keyframes.length) {
            // want to see the stack trace
            console.log('currentFont:', currentFont);
            throw new Error('keyframes is empty!');
        }
        var perstep = 100 / keyframes.length;
        // 2 seconds per keyframe!
        $('#animation-duration').val(keyframes.length * 2).trigger('change');
        updateAnimationParam('animation-delay', '0');
        var stepwise = [];

        var ul = document.getElementById('keyframes-display');
        ul.textContent = "";
        keyframes.forEach(function(fvs, i) {
            var prevPercent = Math.max(0, Math.round(10*(perstep * (i-1)))/10);
            var percent = Math.round(10*(perstep * i))/10;
            var nextPercent = Math.min(100, Math.round(10*(perstep * (i+1)))/10);

            //add display listing
            var li = document.createElement('li');
            var a = document.createElement('a');
            a.textContent = fvs.replace(/"|(\.\d+)/g, '');
            a.addEventListener('click', function(evt) {
                evt.preventDefault();
                jumpToKeyframe(i);
            });
            li.appendChild(a);
            ul.appendChild(li);

            //add timeline hints
            var stepwiseName = "videoproof-hint-" + i;
            stepwise.push("@keyframes " + stepwiseName
                    + " { 0%, "
                         + prevPercent + '%, '
                         + nextPercent + '%, '
                         + '100% { color:black; font-weight:400; } '
                    + percent + '% { color: red; font-weight: 700; }'
                    + ' } '
                    +'#keyframes-display li:nth-child(' + (i+1) + ') a {'
                    + ' animation-name: ' + stepwiseName
                    + '; }');

            //add CSS step
            keyframes[i] =  percent + '% { '
                            + 'font-variation-settings: ' + fvs + '; '
                            + 'outline-offset: ' + percent + 'px; '
                            + '}';
        });

        document.getElementById('videoproof-keyframes').textContent =
            "@keyframes videoproof {\n"
            + keyframes.join("\n")
            //duplicate 0% to 100%
            + keyframes[0].replace("0%", "100%").replace("outline-offset: 0px", "outline-offset: 100px") + "\n"
            + "}\n"
            + stepwise.join("\n");

        animationNameOnOff();

        resetMoarAxes(true);

        $(document).trigger('videoproof:animationReset');
    }

    var moarAxis = null;
    var moarFresh = false;
    function resetMoarAxes(force) {
        if (moarFresh && !force) { return; }

        moarAxis = null;
        moarFresh = true;

        var style = document.getElementById('videoproof-moar-animation');
        style.textContent = "";

        var moar = document.getElementById('moar-axes-display');
        moar.innerHTML = "";

        currentFont.axisOrder.forEach(function(axis) {
            if (registeredAxes.indexOf(axis) !== -1)
                return;
            var info = currentFont.axes[axis];
            var li = document.createElement('li');
            var a = document.createElement('a');
            a.textContent = axis + " " + info.min + " " + info['default'] + " " + info.max;
            a.setAttribute('data-axis', axis);
            li.appendChild(a);
            moar.appendChild(li);
            //use jquery event here because we trigger it artificially elsewhere
            $(a).on('click', function(evt) {
                moarFresh = false;
                evt.preventDefault();

                var css = getComputedStyle(animTarget);
                var fvs = fvsToAxes(css.fontVariationSettings);
                var percent = css.outlineOffset;
                var fvsBase = {};
                registeredAxes.forEach(function(k) {
                    if (k in fvs) {
                        fvsBase[k] = fvs[k];
                    }
                });
                fvsBase = axesToFVS(fvsBase);

                if (animationRunning && evt.target.parentNode.className === 'current') {
                    console.log('moarpause');
                    stopAnimation();
                    updateURL();
                } else {
                    console.log('moarstart');
                    moarAxis = axis;
                    $(moar).find('.current').removeClass('current');
                    li.className = 'current';
                    var kf = {};
                    kf['default'] = 'font-variation-settings: ' + fvsBase + ', "' + axis + '" ' + info['default'];
                    kf['min'] = 'font-variation-settings: ' + fvsBase + ', "' + axis + '" ' + info['min'];
                    kf['max'] = 'font-variation-settings: ' + fvsBase + ', "' + axis + '" ' + info['max'];
                    style.textContent = "@keyframes moar { 0%, 100% { " + kf['default'] + "; outline-offset: " + percent + "; } 33.333% { " + kf.min + "; } 66.666% { " + kf.max + "; } }";
                    startAnimation('moar');
                }
            });
        });
    }

    function handleFontChange() {

        var fonturl = document.getElementById('select-font').value;

       // FIXME: looks unused
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

        $('head style[id^="style-"]').empty().removeData();

        window.font = currentFont = window.fontInfo[fonturl];
        if (currentFont && currentFont.fontobj) {
            $(document).trigger('videoproof:fontLoaded');
        } else {
            var url = 'fonts/' + fonturl + '.woff';
            // FIXME: This shouldn't be done here: having opentype.js handle
            // the XHR requerst
            opentype.load(url, function (err, font) {
                if (err) {
                    console.warn('window.fontInfo[fonturl];', window.fontInfo[fonturl], err);
                    alert(`${url}: ${err}`);
                    return;
                }
                window.font = currentFont = window.fontInfo[fonturl];
                currentFont.fontobj = font;
                $(document).trigger('videoproof:fontLoaded');
            });
        }
    }

    function getFontInfo(font) {
        // Feels like we could always get the data live from the font
        // instead of caching it, there are othere cases where fontobj
        // is still used, and the extraction of info.axes is trivial.
        var info = {
            'name': font.getEnglishName('fontFamily'),
            'axes': {},
            'axisOrder': [],
            'fontobj': font,
            'isCustom': true
        };
        if ('fvar' in font.tables && 'axes' in font.tables.fvar) {
            for (let axis of font.tables.fvar.axes) {
                info.axes[axis.tag] = {
                    'name': 'name' in axis ? axis.name.en : axis.tag,
                    'min': axis.minValue,
                    'max': axis.maxValue,
                    'default': axis.defaultValue
                };
                info.axisOrder.push(axis.tag);
            }
        }
        return info;
    }

    // queries document for element ids, not ideal...
    function addCustomFontToSelectInterface(fonttag, fontname) {
        // add to interface
        let optgroup = document.getElementById('custom-optgroup')
          , option = document.createElement('option')
          ;
        option.value = fonttag;
        option.textContent = fontname;
        option.selected = true;
        if (optgroup === null) {
            let select = document.getElementById('select-font')
              , defaultOptgroup = document.createElement('optgroup')
              ;
            defaultOptgroup.label = 'Defaults';
            defaultOptgroup.append(...select.children);
            select.append(defaultOptgroup);

            optgroup =  document.createElement('optgroup');
            optgroup.id = 'custom-optgroup';
            optgroup.label = 'Your fonts';
            select.insertBefore(optgroup, defaultOptgroup);
        }
        optgroup.append(option);
    }

    function addCustomFont(fonttag, url, format, font) {
        var info = getFontInfo(font);

        // changing a lot of globl state ...
        window.font = font;
        $('head').append('<style>@font-face { '
                + 'font-family:"' + fonttag + '-VP"; '
                + 'src: url("' + url + '") format("' + format + '"); '
                + 'font-weight: 100 900; '
                + '}</style>');
        window.font = currentFont = window.fontInfo[fonttag] = info;

        // queries document for element ids, not ideal...
        addCustomFontToSelectInterface(fonttag, info.name);

        updateURL();
        setTimeout(handleFontChange);
    }

    async function loadFontFromFile(file) {
        var reader = new FileReader();
        var mimetype, format;
        if (file.name.match(/\.[ot]tf$/)) {
            mimetype = "application/font-sfnt";
            format = "opentype";
        } else if (file.name.match(/\.(woff2?)$/)) {
            mimetype = "application/font-" + RegExp.$1;
            format = RegExp.$1;
        } else {
            // alert(file.name + " not a supported file type");
            throw new Error(file.name + " not a supported file type");
        }

        let fontBuffer = await file.arrayBuffer();
        // If you already have an ArrayBuffer, you can use opentype.parse(buffer)
        // to parse the buffer. This method always returns a Font, but check
        // font.supported to see if the font is in a supported format.
        // (Fonts can be marked unsupported if they have encoding tables we can't read).
        const font = opentype.parse(fontBuffer);
        // Not sure this is still required as it also says in the opentype.js
        // sources about supported:
        //      Deprecated: parseBuffer will throw an error if font is not supported.
        if(!font.supported)
            throw new Error(file.name + " not a supported font file type");

        let promise = new Promise((resolve, reject)=>{
            reader.addEventListener('load', (/*event*/)=>resolve(reader.result));
            let failHandler = event=>reject(`Failed readAsDataURL with ${event.type}: ${event.loaded}.`);
            reader.addEventListener('error', failHandler);
            reader.addEventListener('abort', failHandler);
        });

        reader.readAsDataURL(file);
        return promise.then(datauri=>{
            var fonttag = 'custom-' + file.name.replace(/(-VF)?\.\w+$/, '');
            return [fonttag, datauri, format, font];
        });
    }

    async function addCustomFonts(files) {
        return Promise.all(Array.from(files).map(
                            /* args = [fonttag, datauri, format, font] */
            file=>loadFontFromFile(file).then(args=>addCustomFont(...args))
                        .then(null, err=>{console.error(err); alert(err);})
        ));
    }

    function bracketRap(src, tol) {
        // source is a "para"(graph) element
        theProof.style.animationName = "none";
        theProof.style.fontVariationSettings = 'normal';
        var style = getComputedStyle(src);
        // Here it's set! opsz is never animated
        // wght and wdth are animated within the range of their tolerances
        // and min/max axis values.
        rapBracket = fvsToAxes(style.fontVariationSettings);
        if (!('opsz' in rapBracket) && currentFont && 'opsz' in currentFont.axes) {
            // This should be in pt but style.fontSize is in px.
            rapBracket.opsz = parseFloat(style.fontSize) * 0.75;
        }
        if (!('wght' in rapBracket) && currentFont && 'wght' in currentFont.axes) {
            rapBracket.wght = parseInt(style.fontWeight) || 400;
        }
        if (!('wdth' in rapBracket) && currentFont && 'wdth' in currentFont.axes) {
            rapBracket.wdth = currentFont.axes.wdth['default'];
        }

        console.log('new "rapBracket":', rapBracket, 'currentFont:', currentFont);

        // global, also the defaults are nerver used because tol is always
        // set.
        rapTolerances = tol || {
            'opsz': [1, 1],
            'wght': [-100, +100],
            'wdth': [0.8, 1.2],
            'default': [0.5, 2.0]
        };

        resetAnimation();
    }

    function handleLayoutChange() {
        var layout = $('#select-layout').val();
        var options = layouts[layout] || {};
        // FIXME: use classlist.remove for these things
        var previousLayout = (theProof.className || '').replace(/ (fixed-line-breaks|size-to-space)/g, '');
        var customControls = document.getElementById('layout-specific-controls');

        stopAnimation();

        if (previousLayout && previousLayout in layouts && 'deinit' in layouts[previousLayout]) {
            layouts[previousLayout].deinit(theProof);
        }

        theProof.className = layout;
        theProof.removeAttribute('style');
        customControls.innerHTML = "";

        if (options.fixedLineBreaks) {
            theProof.className += ' fixed-line-breaks';
        }

        if (options.sizeToSpace) {
            theProof.className += ' size-to-space';
        }

        if (options.controls) {
            $.each(options.controls, function(name, html) {
                var li = document.createElement('li');
                li.innerHTML = html;

                var label = document.createElement('label');
                label.textContent = name;

                var input = li.querySelector('[id]');
                if (input) {
                    label.for = input.id;
                }

                if (li.childNodes.length) {
                    li.insertBefore(document.createTextNode(' '), li.firstChild);
                    li.insertBefore(label, li.firstChild);
                    customControls.appendChild(li);
                }
            });
        }

        rapBracket = !!options.bracketRap;

        if (options.init) {
            options.init(theProof);
        }

        resetAnimation();

        setTimeout(animationUpdateOutput);
    }

    function handleGlyphsChange() {
        var hasExtended = this.querySelector(':checked[data-extended]');
        var extendedCheckbox = document.getElementById('show-extended-glyphs');
        if (hasExtended) {
            extendedCheckbox.disabled = false;
        } else {
            extendedCheckbox.checked = false;
            extendedCheckbox.disabled = true;
        }
    }

    window.VideoProof = {
        'customFonts': {},
        'clone': function(obj) { return JSON.parse(JSON.stringify(obj)); },
        'slidersToElement': slidersToElement,
        'handleFontChange': handleFontChange,
        'fvsToAxes': fvsToAxes,
        'axesToFVS': axesToFVS,
        'setWidest': setWidest,
        'unsetWidest': unsetWidest,
        'addCustomFonts': addCustomFonts,
        'addCustomFont': addCustomFont,
        'resetAnimation': resetAnimation,
        'getMiscChars': getMiscChars,
        'getKnownGlyphs': getKnownGlyphs,
        'getAllGlyphs': getAllGlyphs,
        'getGlyphString': getGlyphString,

        // It seems to me, these should be in the layout code
        // and the layout should expose a reset/layoutchange api
        // so that the controller doesn't have to know all the
        // details of the "proof" tool implementation.
        'fixLineBreaks': fixLineBreaks, // required/used by/in layout grid.js
        'sizeToSpace': sizeToSpace, // required/used by/in layout contextual.js

        'getTimestamp': getTimestamp,
        'jumpToTimestamp': jumpToTimestamp,
        'bracketRap': bracketRap
    };

    function urlToControls() {
        if (!window.location.search || window.location.search === '?') {
            return;
        }
        var settings = Object.fromEntries( new URL(window.location).searchParams );

        for(let [setting, value] of Object.entries(settings)) {
            let input, subinput, selector;
            let inputs = document.querySelectorAll('#controls [name="' + setting + '"]');
            if (!inputs.length)
                continue;

            switch(inputs[0].tagName) {
                case "INPUT":
                    if (inputs[0].type !== "checkbox" && inputs[0].type !== "radio"){
                        inputs[0].value = value;
                        $(inputs[0]).trigger('change:from-url');
                        continue;
                    }
                    for(let input of inputs) {
                        if(input.value === value) {
                            input.checked = true;
                            break;
                        }
                    }
                break;
                case "SELECT":
                    inputs[0].value = value;

                    // FIXME: this is a general issue with the loading of settings
                    if(inputs[0].value !== value)
                        console.warn(`${setting}: can\'t select "${value}".`);

                break;
            }
        }

        //set keyframe after they're calculated
        $(document).off('videoproof:animationReset.urlToControls');
        $(document).on('videoproof:animationReset.urlToControls', function() {
            if ('timestamp' in settings) {
                // Would NOT do anything in Layout mode: composition
                // but it seems alright in the other modes
                // layout composition also let's you select different boxes
                // to apply keyframe settings to, I expect the bug and
                // this specialty to be related.
                jumpToTimestamp(settings.timestamp);
            }
            if ('moar' in settings) {
                // I can't find  case where "moar" is in settings.
                // NOT true, seems like it's present an selected when
                // stopping/pausing it
                var kv = settings.moar.split(' ');
                var axis = kv[0];
                var val = parseFloat(kv[1]);

                setTimeout(function() {
                    $('#moar-axis-display a[data-axis="' + axis + '"]').addClass('current');
                    var fvs = fvsToAxes(getComputedStyle(animTarget).fontVariationSettings);
                    fvs[axis] = val;
                    updateAnimationParam('animation-name', 'none');
                    updateAnimationParam('font-variation-settings', axesToFVS(fvs));
                }, 100);
            }
            $(document).off('videoproof:animationReset.urlToControls');
        });
    }


    function onDOMContentLoaded() {
        urlToControls();

        var theProof = document.getElementById('the-proof');
        var controls = $('#controls');
        $('head').append("<style id='style-general'></style>");

        $(document).on('videoproof:fontLoaded', function() {
            slidersToElement(); // sets bg/fg-colors, CSS-font-family
            resetAnimation();
        });

        $('#select-layout').on('change', handleLayoutChange);
        $('#select-font').on('change', handleFontChange);
                                                         // sets bg/fg-colors, CSS-font-family
        $('#foreground, #background').on('change input', slidersToElement);
        $('#select-glyphs').on('change', handleGlyphsChange);


        // #comment-store is an hidden input, it will be serialized and
        // deserialized by the urlToControls mechanism.
        // The <textarea> is just the user interface and it can be located
        // anywhere in the document.
        var commentStore = document.querySelector('#comment-store')
          , commentBox = document.querySelector('#comment-box textarea')
          ;
        $(commentBox).on('change', evt=> {
            commentStore.value = evt.target.value;
            updateURL();
        });
        $(commentStore).on('change:from-url',
                            evt=>commentBox.value = evt.target.value);

        $('#add-your-own-button').on('click', function(evt) {
            $('#custom-fonts')[0].click();
            return false;
        });

        $('#custom-fonts').on('change', function() {
            addCustomFonts(this.files);
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

        $('#grab-new-fonts').on('click', function() {
            var clocks = ['🕛','🕧','🕐','🕜','🕑','🕝','🕒','🕞','🕓','🕟','🕔','🕠','🕕','🕢','🕖','🕢','🕗','🕣','🕘','🕤','🕙','🕥','🕚','🕦'];
            var start = Date.now();
            $(this).next('span').remove();
            var spinner = $("<span style='padding-left: 0.33em'>" + clocks[0] + "</span>").insertAfter(this);
            var interval = setInterval(function() {
                var sec = (Date.now() - start) / 1000;
                spinner.text(clocks[Math.floor(sec*2)%24]);
            }, 500);
            $.ajax(this.href, {
                'complete': function(xhr) {
                    clearInterval(interval);
                    if (xhr.status === 200) {
                        spinner.text("✅ reloading…").attr('title', xhr.responseText);
                        setTimeout(function() { window.location.reload(); }, 1000);
                    } else {
                        spinner.text("❌").attr('title', xhr.statusText + " — call chris!");
                    }
                }
            });
            return false;
        });

        $('#fg-bg-invert').on('click', function() {
            var fg = document.getElementById('foreground');
            var bg = document.getElementById('background');
            var temp = fg.value;
            fg.value = bg.value;
            bg.value = temp;
            $(fg).trigger('change');
            $(bg).trigger('change');
            updateURL();
        });

        $('#controls').on('change input', function(evt) {
            //only update URL for user-initiated events
            if (evt.originalEvent) {
                setTimeout(updateURL);
            }
        });

        $('#reset').on('click', function() {
            document.getElementById('foreground').value = document.getElementById('foreground').getAttribute('value');
            document.getElementById('background').value = document.getElementById('background').getAttribute('value');
            handleFontChange();
            updateURL();
            return false;
        });

        $('#bookmark').on('click', function() {
            updateURL();
            return false;
        });
    }


function main() {
    onDOMContentLoaded();
    //this timeout is for the sidebar load
    setTimeout(function() {
        var showSidebar = $('a.content-options-show-filters');
        if (showSidebar.is(':visible')) {
            showSidebar.click();
        }
    }, 100);

    setupAnimation();
    handleLayoutChange();
    handleFontChange();
    $('#select-glyphs').trigger('change');

    // waiting for what?
    setTimeout(urlToControls);

    var theProof = $('#the-proof');
    function realResize() {
        if (theProof.hasClass('fixed-line-breaks')) {
            VideoProof.fixLineBreaks();
        } else if (theProof.hasClass('size-to-space')) {
            // NOTE: fixLineBreaks will itself call sizeToSpace
            VideoProof.sizeToSpace();
        }
    }

    var resizeTimeout;
    $(window).on('resize', function() {
        if (resizeTimeout) {
            clearTimeout(resizeTimeout);
        }
        resizeTimeout = setTimeout(realResize, 500);
    });
}

window.addEventListener('load', main);
