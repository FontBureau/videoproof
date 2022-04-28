/* jshint esversion: 11, browser: true, unused:true, undef:true, laxcomma: true, laxbreak: true */
import opentype from '../../opentype.js/dist/opentype.module.js';
import {init as initGrid} from './layouts/grid.mjs';
import {init as initTypeYourOwn} from './layouts/type-your-own.mjs';

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


function* calculateKeyframes(orderedFilteredAxisRanges) {
    let axesOrder = orderedFilteredAxisRanges.length
            ? Array.from(zip(...orderedFilteredAxisRanges))[0]
            : []
      , axesMDM = [] // min-default-max
      ;
    // var axisRanges = (typeof rapBracket === 'object')
    //     // FIXME: rapBracket, rapTolerances are global
    //     ? axisRangesForRapBracket(currentFont.axes, rapBracket, rapTolerances)
    //     : currentFont.axes
    //     ;

    for(let [axis, axisRange] of orderedFilteredAxisRanges) {
        // mdn stands for min-default-max, however, the order
        // is default-min-max expect for opsz.
        // FIXME: find out the reason behind this.
        let mdmOrder = axis === 'opsz'
                ? ['min', 'default', 'max']
                : ['default', 'min', 'max']
          , mdm = mdmOrder.filter(k=>{ // jshint ignore:line
                    // This was loosely adopted from previous code
                    // where I didn't understand the full reasoning
                    // but for the present examples it produces the
                    // same result and is much more consise.
                    if(!('default' in axisRange))
                        throw new Error('SANITY CHECK ERROR: "default" must be in any axisRange.');
                    else if(!(k in axisRange))
                        return false;

                    if (k === 'default')
                        return true;
                    return (axisRange[k] !== axisRange['default']);
                })
                .map(k=>axisRange[k]) // jshint ignore:line
          ;
        axesMDM.push(mdm);
    }

    for(let axesValues of cartesianProductGen(axesMDM)) {
        yield Array.from(zip(axesOrder, axesValues));

        // let variationSettings = Object.fromEntries(zip(axesOrder, axesValues));
        // // FIXME: axesToFVS could take just the result of the zip
        // //        but it may get replaced entirely, so I leave it here
        // //        for the time being.
        // let fvs = axesToFVS(variationSettings);
        // // FIXME: I currently think there should be no duplicates.
        // if (fvs !== prev)
        //     fvsPerms.push(fvs);
        // else
        //     console.warn(`Found a case of duplication: ${fvs}`);
        // prev = fvs;
    }
    //return fvsPerms;

}

// For a more broadly useable tool, this should probaly be configurable per font.
// however 3 axes with each 3 (default, min, max) entries produces 3 * 3 * 3 = 27 keyframes
const REGISTERED_AXES_ORDERED = ['opsz', 'wdth', 'wght']; //, 'ital', 'slnt', 'grad', 'GRAD');

function calculateRegisteredKeyframes(axisRanges) {
    let orderedFilteredAxisRanges = [];
    // FIXME: registeredAxes is global
    for(let axis of REGISTERED_AXES_ORDERED) {
        if (!(axis in axisRanges)) {
            continue;
        }
        orderedFilteredAxisRanges.push([axis, axisRanges[axis]]);
    }
    return calculateKeyframes(orderedFilteredAxisRanges);
}

// could be a getter in VideproofFont
// as well as  return font.tables?.fvar?.axes || []
function _getFontAxisRanges(font) {
    let axisRanges = {}
      , axes = font.tables?.fvar?.axes
      ;
    if (!axes)
        return axisRanges;
    for (let axis of axes) {
        axisRanges[axis.tag] = {
            'name': 'name' in axis ? axis.name.en : axis.tag,
            'min': axis.minValue,
            'max': axis.maxValue,
            'default': axis.defaultValue
        };
    }
    return axisRanges;
}

function _interpolateKeyframe(t, fromKeyFrame, toKeyFrame) {
    // a xxKeyFrame looks like:
    //      [ [ "opsz", 144 ], [ "wdth", 151 ], [ "wght", 1000 ] ]
    // both keyframes must be compatible
    let result = [];
    for( let [i, [axis, fromVal]] of fromKeyFrame.entries()){
        let [, toVal] = toKeyFrame[i]
          , value = (toVal - fromVal) * t + fromVal
          ;
        result.push([axis, value]);
    }
    return result;
}

/**
 * The return value of the yield i.e. when calling:
 *          gen.next(genControl)
 * is formed like this:
 * genControl = {
 *       t: float, between 0 and < 1 (but it's mod 1 anyways)
 *            to go to the sevensth (index = 6) keyframe:
 *            t: 6 / keyframes.length
 *       duration: float, in seconds
 *            for 30 seconds duration for one loop
 *            duration: 30
 * }
 */
function* animationGenerator(performance, keyFrames, duration, newT) {
    let t = 0
      , lastExecution
        // in milli seconds, this can be changed dynamically
        // original default is 1000ms * keyFrames.length * 2
      , newDuration
      ;
    // run forever
    while(true) {
        let fps = 0;
        if(newT !== undefined) {
            if(newT < 0)
                newT = 1 - (Math.abs(newT) % 1)
            else
                // newT can be used to jump to a new position or to resume
                // animation after a pause.
                t = newT % 1;
        }
        // It's initially undefined, but then either t is 0
        // or newT was set as argument.
        else if(lastExecution !== undefined) {
            let frameTime = performance.now() - lastExecution
                // Need miliseconds, hence duration times 1000.
              , frameTimeFraction =  frameTime / (duration * 1000)
              ;
            fps = 1000 / frameTime;
            t = (t + frameTimeFraction) % 1; // 0 >= t < 1
        }
            // Also animate from keyFrames.length - 1 to 0, in a circle.
        let keyFramesPosition = keyFrames.length * t // float: 0 >= keyFramesPosition < keyFrames.length
          , fromKeyFrameIndex = Math.floor(keyFramesPosition) // int: 0 >= fromKeyFrameIndex < keyFrames.length-1
          , toKeyFrameIndex = fromKeyFrameIndex < keyFrames.length - 1
                            ? fromKeyFrameIndex + 1
                             // circle around
                            : 0
          , fromKeyFrame = keyFrames[fromKeyFrameIndex]
          , toKeyFrame = keyFrames[toKeyFrameIndex]
          , keyFrameT = keyFramesPosition % 1
          ;
        //if(!fromKeyFrame || !toKeyFrame)
        //    console.error(
        //        `t: ${t}`,
        //        `keyFrames.length: ${keyFrames.length}\n`,
        //        `fromKeyFrameIndex: ${fromKeyFrameIndex}\n`,
        //        `toKeyFrameIndex: ${toKeyFrameIndex}\n`
        //    );
        let frame = _interpolateKeyframe(keyFrameT, fromKeyFrame, toKeyFrame);
        lastExecution = performance.now();
        // call next like e.g: gen.next({duration: 20})
        // duration will be mapped to newDuration
        ({ t: newT, duration: newDuration } = yield [frame, t, duration, fromKeyFrameIndex, keyFrameT, fps]);
        if(newDuration !== undefined)
            duration = newDuration;
    }
}

/**
 * Handy table, though so far it seems we only need the
 * first column for the src property of the @font-face rule
 *
 *   @font-face src 'format("{TYPE}");' |
 * | typical file name extension
 * | MIME Type
 * | full format name
 * -------- | ------ | ---------- | ----------
 * truetype | .ttf   | font/ttf   | TrueType
 * opentype | .otf   | font/otf   | OpenType
 * woff     | .woff  | font/woff  | Web Open Font Format
 * woff2    | .woff2 | font/woff2 | Web Open Font Format 2
 */
function getSrcFormatFromFileName(filenName) {
    let extension = filenName.split('.').pop()
      , result = ({
            ttf: 'truetype'
          , otf: 'opentype'
          , woff: 'woff'
          , woff2: 'woff2'
        })[extension]
      ;
    if(!result)
        throw new Error(`FORMAT NOT FOUND for "${filenName}" with extension "${extension}"`);
    return result;
}

// used as part of the font family (CSS) name, so we always can differentiate
// the source of the font.
class FontOrigin {
    valueOf() {
        throw new Error(`NOT IMPLEMENTED: "valueOf" in ${this.constructor.name}`);
    }
    get type () {
        throw new Error(`NOT IMPLEMENTED: "get type" in ${this.constructor.name}`);
    }
    get fileName() {
        throw new Error(`NOT IMPLEMENTED: "get fileName" in ${this.constructor.name}`);
    }
    get sourceFormat() {
        return getSrcFormatFromFileName(this.fileName);
    }
}

// Font origin for fonts loaded by URL, using a GET request. commonly
// the fonts that are built into the app and registerd in window.remoteResources.
class FontOriginUrl extends FontOrigin {
    constructor(url) {
        super();
         Object.defineProperties(this, {
            type: {value: 'from-url', writable: false, enumerable: true}
          , url: {value: url, writable: false, enumerable: true}
        });
    }
    get fileName() {
        // CAUTION: simple split on "/" may not be sufficient!
        return this.url.split('/').pop();
    }
    valueOf() {
        return `${this.type}::${this.url}`;
    }
}

class FontOriginFile extends FontOrigin {
    constructor(fileName) {
        super();
        Object.defineProperties(this, {
            type: {value: 'from-file', writable: false, enumerable: true}
          , fileName: {value: fileName, writable: false, enumerable: true}
        });
    }
    valueOf() {
        return `${this.type}::${this.fileName}`;
    }
}

// To keep all knowledge and resources of a font in one place.
class VideoProofFont {
    constructor(fontObject, fontFace, origin, document) {
        this._document = document;
        Object.defineProperties(this, {
            fontObject: {value: fontObject, writable: false, enumerable: true}
          , fontFace: {value: fontFace, writable: false, enumerable: true}
          , origin: {value: origin, writable: false, enumerable: true}
        });
    }

    _getName(key) {
        // default to "en"
        let entry = this.fontObject.tables.name[key]
          , defaultLang = 'en'
          ;
        if(defaultLang in entry)
            return entry[defaultLang];
        // Otherwise, just return the entry of the first key.
        for(let lang of Object.keys(entry))
            return entry[lang];
    }

    get nameVersion() {
        return [
                 this._getName('fullName') // e.g. "RobotoFlex Regular"
                 // "Version 2.136" is not accepted here while
                 // "Version_2-136" is OK, seems like the "." (dot)
                 // is forbidden and the space before numbers as well.
                 // It's likely this needs more fixing in the future!
               , this._getName('version')
               ].join(' – ');
    }

    // This is used as a unique id of the font within the app and
    // as the CSS-name.
    get fullName() {

        // getting sometimes
        //      DOMException: FontFace.family setter: Invalid font descriptor
        //
        // A well working example is: "from-url RobotoFlex Regular Version_2-136"
        return [
                 this.origin.type
               , this._getName('fullName') // e.g. "RobotoFlex Regular"
                 // "Version 2.136" is not accepted here while
                 // "Version_2-136" is OK, seems like the "." (dot)
                 // is forbidden and the space before numbers as well.
                 // It's likely this needs more fixing in the future!
               , this._getName('version').replaceAll('.', '-').replaceAll(' ', '_')
               ].join(' ');
    }

    // release resources
    destroy() {
        this._document.fonts.delete(this.fontFace);
    }
}

function _makeFileInput (handleFiles, clickElement, dropElement, dragCallbacks) {
    // In this case, the input element is not even appended into the
    // document, we use it just for the browser native interface.
    var hiddenFileInput = clickElement.ownerDocument.createElement('input');
    hiddenFileInput.setAttribute('type', 'file');
    hiddenFileInput.setAttribute('multiple', 'multiple');
    hiddenFileInput.style.display = 'none'; // can be hidden, no problem

    // for the file dialogue
    function fileInputChange(e) {
        /*jshint validthis:true, unused:vars*/
        handleFiles(this.files);
    }
    function forwardClick(e) {
        /*jshint unused:vars*/
        // forward the click => opens the file dialogue
        hiddenFileInput.click();
    }

    // for drag and drop
    function stopEvent(e) {
        e.stopPropagation();
        e.preventDefault();
    }

    function dragenter(e) {
        stopEvent(e);
        if(dragCallbacks.dragenter)
            dragCallbacks.dragenter(e);
    }

    function dragover(e) {
        stopEvent(e);
        if(dragCallbacks.dragover)
            dragCallbacks.dragover(e);
    }

    function dragleave(e) {
        if(dragCallbacks.dragleave)
            dragCallbacks.dragleave(e);
    }

    function dragend(e){
        if(dragCallbacks.dragend)
            dragCallbacks.dragend(e);
    }

    function drop(e) {
        stopEvent(e);
        handleFiles(e.dataTransfer.files);
        if(dragCallbacks.drop)
            dragCallbacks.drop(e);
    }

    hiddenFileInput.addEventListener('change', fileInputChange);
    if(clickElement)
        clickElement.addEventListener('click', forwardClick);
    if(dropElement) {
        dropElement.addEventListener("dragenter", dragenter);
        dropElement.addEventListener("dragover", dragover);
        dropElement.addEventListener("dragleave", dragleave);
        dropElement.addEventListener("dragend", dragend);
        dropElement.addEventListener("drop", drop);
    }
}

// especially when we try to marry this project with varla-varfo, we'll
// have to control the CSS custom-properties thoroughly.
// FIXME: REGISTERED_AXES_ORDERED has similar content, plus, this
// could be just a function `--font-${axisTag}`, I don't think at this
// point renaming is required, but if it is a function, we can still do
// it simply and centrally.
//const AXISNAME2PROPNAME = new Map([
//            ['wght', '--font-weight']
//          , ['opsz', '--font-opsz']
//          , ['wdth', '--font-width']
//]);
function axisTag2PropName(axisTag) {
    return  `--font-${axisTag}`;
}


class _AnimationState {
    constructor(generator, keyFrames) {
        Object.defineProperties(this, {
            generator: {value: generator, writable: false, enumerable: true}
          , keyFrames: {value: keyFrames, writable: false, enumerable: true}
        });
        this._lastYield = null;
    }
    get fontName() {
        throw new Error(`NOT IMPLEMENTED: "get fontName" in abstract ${this.constructor.name}`);
    }
    toString() {
        return `[${this.constructor.name}]`;
    }
    set lastYield(value) {
        this._lastYield = value;
    }
    get lastYield() {
        return this._lastYield;
    }
}

class AnimationStateKeyFrames extends _AnimationState {
    constructor(generator, keyFrames, fontName) {
        super(generator, keyFrames);
        Object.defineProperties(this, {
            fontName: {value: fontName, writable: false, enumerable: true}
        });
    }
}

class AnimationStateMoar extends _AnimationState {
    constructor(generator, keyFrames, baseAnimationState, axisTag) {
        super(generator, keyFrames);
        Object.defineProperties(this, {
            baseAnimationState: {value: baseAnimationState, writable: false, enumerable: true}
          , axisTag: {value: axisTag, writable: false, enumerable: true}
        });
    }
    get fontName() {
        return this.baseAnimationState.fontName;
    }
}

function _getBaseAnimationState(animationState) {
    if(animationState instanceof AnimationStateKeyFrames)
        // switch from main keyframes animation
        return animationState;

    if(animationState instanceof AnimationStateMoar)
        // switch from other moar animation
        return animationState.baseAnimationState;

    throw new Error(`UNKNOWN ANIMATION STATE ${animationState} `
                      + `(typeof ${typeof animationState})`);
}

/**
 * Setting the widest wdth/wght/opsz combination the font can handle.
 */
const _AXES_WIDEST_SETTING =  [
    // FIXME: this are not all axes that are responsible for
    //        changing width (XTRA, ...?)
    ['wdth', 'max'],
    ['wght', 'max'],
    ['opsz', 'min']
];
function _setWidest(font, element) {
    //get the stuff as wide as possible
    let axes = font.fontObject.tables?.fvar?.axes || []
      , reset = element.style.fontVariationSettings
      , fvs = []
      ;

    for(let[tag, wideEnd] of _AXES_WIDEST_SETTING){
        if (tag in axes)
            fvs.push(`"${tag}" ${axes.wdth[wideEnd]}`);
    }
    element.style.fontVariationSettings = fvs.join(', ');
    return ()=>element.style.fontVariationSettings = reset;
}

function _withSetWidest(font, elem, func, ...args) {
    let reset = _setWidest(font, elem);
    // No try ... catch because we want to see and fix these errors
    // nothing unpredicable should happen here.
    func(...args);
    reset();
}

function _getLineBreaksForLineLength(childrenWidthsEM, childrenRightMarginPerEm, lineLength) {
    let lines = []
      , lineLengths = []
      , currentLineLength = 0
      , lastChildMarginEm = 0
      ;
    for(let [i, childEm] of childrenWidthsEM.entries()) {
        // CAUTION: does NOT include the last line item margin!
        // doing it this way requires to mark each of the last line
        // items, so that they wont include the margin.
        let nextLineLength = currentLineLength + lastChildMarginEm + childEm;
        lastChildMarginEm = childEm * childrenRightMarginPerEm;
        if(nextLineLength > lineLength) {
            // break the line
            lines.push(i-1);
            lineLengths.push(currentLineLength);
            // current child overflows into next line
            currentLineLength = childEm;
        }
        else {
            // keep the line
            currentLineLength = nextLineLength;
        }
    }
    if(currentLineLength) {
        // last line with the rest of the elements
        lines.push(childrenWidthsEM.length-1);
        lineLengths.push(currentLineLength);
    }
    return [Math.max(...lineLengths), lines];
}

function _getLineBreaks(childrenWidthsEM, childrenRightMarginPerEm) {
    let sum=(...values)=>values.reduce((accum, val)=> accum + val, 0)
        // The last element right margin per line must be considered for
        // line breaking as well, if we don't want it and have it behave
        // more like a space, it must be removed explicitly, also in the
        // resulting markup/CSS.
      , minOneLineLengthEM = sum(...childrenWidthsEM.reduce((accum, childEm, currentIndex, array)=>{
            accum.push(childEm);
            if(currentIndex !== array.length-1)
                // don't add last margin
                accum.push(childEm * childrenRightMarginPerEm);
            return accum;
        }, []))
      , minChildSizeEm = Math.min(...childrenWidthsEM)
      , maxChildSizeEm = Math.max(...childrenWidthsEM)
      , lineBreaks = []
      ;
    // Will override previous entries in lineBreaks if it finds a shorter
    // lineLength which produces the same anount of lines.
    let lineLength=maxChildSizeEm;
    while(true) {
        let [actualMaxLineLength, lines] = _getLineBreaksForLineLength(
                                                childrenWidthsEM,
                                                childrenRightMarginPerEm,
                                                lineLength);
        if(!lineBreaks[lines.length-1])
            lineBreaks[lines.length-1] = [actualMaxLineLength, lines];
        if(lineLength === minOneLineLengthEM)
            // we're done
            break;
        // Can't get wider than minOneLineLengthEM, then we make one more
        // iteration for the one-line case and break.
        lineLength = Math.min(lineLength+minChildSizeEm, minOneLineLengthEM);
    }
    return lineBreaks;
}

function gridFontSize(element, childrenWidthsEM, childrenRightMarginPerEm) {
    let window = element.ownerDocument.defaultView
        // FIXME: I'd like to do this differently! why 96 anyways???
        //        I'm now using 196, but it's still arbitrary!
      , availableHeightPx = window.innerHeight - (217)
      , availableWidthPx = element.getBoundingClientRect().width
      , availableHeightPt = availableHeightPx * 0.75
      , availableWidthPt = availableWidthPx * 0.75
      // FIXME: hard coded so far, should come the applied CSS property
      //        especially because we don't set it in here
      , lineHeightEM = 1.5
      , normalizedAvailableHeightPt = availableHeightPt / lineHeightEM
      // FIXME: These should be arguments to the function.
      // 144 implies PT not PX as 144 is our standard max size in PT
      // the old implementation used px with these values.
      , minFontSize = 24, maxFontSize = 144
      , lineBreaks = _getLineBreaks(childrenWidthsEM, childrenRightMarginPerEm)
      , globalMaxFontSize = 0
      , lastLinesI = -1
      ;
    for(let i=0,l=lineBreaks.length; i<l; i++) {
        if(lineBreaks[i] === undefined)
            continue;
        let amountOfLines = i + 1
            // the smallest line len to produce amountOfLiness
            // the biggest line len to produce amountOfLines
            // must be smaller than this ...
          , longestLenEm = lastLinesI < 0 ? +Infinity : lineBreaks[lastLinesI][0]
          , [shortestLenEm, /*lastIndexes*/] = lineBreaks[i]
          , verticalMaxFontSize = normalizedAvailableHeightPt / amountOfLines
            // the shorter the line the bigger the font-size
          , horizontalMaxFontSize = availableWidthPt / shortestLenEm
            // the longer the line the smaller the font-size
          , horizontalMinFontSize = availableWidthPt / longestLenEm

          // we want to have the biggest font size that fits verticall and
          // horizontally ... so this must be min
          , maxFontSize = Math.min(verticalMaxFontSize, horizontalMaxFontSize)
          ;
        if(maxFontSize <= horizontalMinFontSize) {
            // This will create less lines than we expect from this setting,
            // as there's not enough vertical space. we can skip this.
            continue;
        }
        if(globalMaxFontSize > maxFontSize) {
            // we found our maximum, now font size is decreasing again
            break;
        }
        // font-size is still increasing;
        globalMaxFontSize = maxFontSize;
        lastLinesI = i;
    }

    let fontSize = Math.min(maxFontSize, Math.max(minFontSize, globalMaxFontSize));

    // The linesConfiguration may not be accurate anymore if globalMaxFontSize
    // doesn't match.
    let [, lineBreakIndexes] = _getLineBreaksForLineLength(
                                                childrenWidthsEM,
                                                childrenRightMarginPerEm,
                                                availableWidthPt/fontSize);
    return [fontSize, lineBreakIndexes];
}

// It doesn't work as expected, when applied to contextual, likely
// because of the width set to the spans, which indeed stops "stuff"
// from moving around, but since that is a more line based then grid
// based view, it would be nice when the lines grow/and shrink.
function _fixLineBreaks(element) {
    // replace old lines with theit child elements
    for(let div of element.getElementsByTagName('div'))
        div.parentElement.append(...div.children);

    let rightMarginPerEm = 0.3
      , fontsizePx = 16
      ;
    element.style.setProperty('font-size', `${fontsizePx}px`);
    // It could be good for the performance to measure the glyph width
    // in memory, instead of via browser/DOM rendering
    // `element.getBoundingClientRect()`, <canvas> comes to mind with
    // `ctx = canvas.getContext('2d').measureText(text)`. However, its
    // seems like in chrome, there would be a way to set`canvas.style.fontVariationSettings`,
    // but in Firefox this doesn't work. Also, seems like no good documentation
    // for the Chrome feature only this: https://codepen.io/JuanFuentes/pen/bGpGpzg
    // This leaves HarfbuzzJS as an option.
    for(let item of element.children) {
        // A sanity check because the old implementation was concerned with this.
        if (item.tagName !== 'SPAN')
            throw new Error(`UNEXPECTED ELEMENT <${item.tagName}>, expecting <SPAN>`,);
        let box = item.getBoundingClientRect();
        // hard-code the max width so it doesn't move around
        // Maybe, for the "grid" view, this all could be
        // simplified using css table, grid or flex layout.
        // besides, the grid is not very strictly a grid,
        // depending on glyph-widths columns align sloppily.
        // It's not too bad though, because of min-width: 1em;
        // for each element, but e.g. "Ǆ" can be wider than
        // 1em.
        // Added Math.ceil, so if a cell is wider than 1 em it
        // jumps up to 2 em or bigger integers which improves
        // alignment. a lot and gives extra space when required.
        item.style.setProperty('--measured-width-em', box.width / fontsizePx);
        // If box.width / fontsizePx > 0.85 we want to go up to 2 em
        item.style.setProperty('--width-em', Math.ceil(box.width / fontsizePx + 0.25));
        item.style.width = `calc(1em * var(--width-em))`;
        // This is important to keep the alignment correct.
        // The .3 em is from the original style.
        // It seems like the margin is also important to give just a bit
        // more leeway e.g. when applying non-registered XTRA.
        // set below: item.style.setProperty('--right-margin-em', `${rightMarginPerEm}`);
        item.style.marginRight = `calc(1em * var(--right-margin-em, 0) * var(--width-em))`;
    }

    let [fontSizePt, lineBreaks] = gridFontSize(
            element
          , Array.from(element.children)
                .map(c=>parseFloat(c.style.getPropertyValue('--width-em')))
          , rightMarginPerEm
        );

    element.style.fontSize = `${fontSizePt}pt`;
    // FIXME: alternatively remove applied padding from available space.
    element.style.padding = 0;
    for(let child of element.children) {
        // reset line breaks
        // child.style.background = '';
        child.style.setProperty('--right-margin-em', `${rightMarginPerEm}`);
    }
    for(let i of lineBreaks) {
        // set line breaks
        let child = element.children[i];
        // child.style.background = 'lime';
        child.style.setProperty('--right-margin-em', '0');
    }
    return fontSizePt * 4 / 3; // return in px
}

function fixLineBreaks(font, elem) {
    return _withSetWidest(font, elem, _fixLineBreaks, elem);
}

function _uiBuildGlyphsSelectOptions(doc, charGroups) {
    let root = doc.createDocumentFragment()
      , makeOption = (label, value)=>{
            let option = doc.createElement('option');
            option.textContent = label;
            option.value = value;
            return option;
        }
      , makeOptionsFromCharGroups = (currentPath, container, data)=>{

            if (currentPath[currentPath.length-1][0] === '_')
                // ignore top-level "_extended" item
                return;
            if(data === null || typeof data !== 'object') {
                // this is an option
                let option = makeOption(currentPath[currentPath.length-1], currentPath.join('.'));
                (container || root).append(option);
                return;
            }
            if ('_default' in data) {
                // Special kind of option, that can bring it's own _extended chars.
                makeOptionsFromCharGroups(currentPath, container, null);
                return;
            }

            // Go deeper.
            container = doc.createElement('optgroup');
            container.label = currentPath.join(' ');
            root.append(container);

            for(let [name, dataItem] of Object.entries(data)) {
                let _subPath = currentPath.slice();
                _subPath.push(name);
                makeOptionsFromCharGroups(_subPath, container, dataItem);
            }
        }
      , allOptgroup = doc.createElement('optgroup')
      ;
    allOptgroup.label = 'All';
    allOptgroup.append(makeOption('All by GlyphID', 'all-gid'));
    allOptgroup.firstChild.selected = true;
    allOptgroup.append(makeOption('All by group', 'all-groups'));

    root.append(allOptgroup);
    for(let [name, data] of Object.entries(charGroups))
        makeOptionsFromCharGroups([name], root, data);
    root.append(makeOption('None of the above', 'misc'));
    return root;
}

function getExendedChars(charGroups, chars) {
    return Array.from(new Set(chars))
                .reduce((col, c)=>[...col, ...(charGroups._extended[c] || [])], []);
}

function getCharsFromCharGroups(charGroups, keyPath) {
    let target = keyPath.split('.')
                        .reduce((obj, key)=>obj[key], charGroups)
      , chars, extendedChars
      , getGlobalExtended = chars=>getExendedChars(charGroups, chars)
      ;

    if(typeof target === 'object' && '_default' in target
                                  && '_extended' in target) {
        chars = [...target._default];
        extendedChars = [...target._extended,
                // The original implementation did this as well, despite
                // that there was no effect due to the provided data.
                // I have to assume that it was intentional, but it
                // doesn't feel like the correct thing to do.
                ...getGlobalExtended(chars)];
    }
    else if(typeof target === 'string') {
        chars = [...target];
        extendedChars = [...getGlobalExtended(target)];
    }
    else
        throw new Error(`Don't know how to handle item at ${keyPath}: ${target}`);
    return [chars, extendedChars];
}

function getKnownChars(charGroups) {
        // Removes duplicates, the original implementation did not do this,
        // but it makes sense, because the charGroups data is hand edited.
    let charsSet = new Set()
      , addChars = function(entry) {
            switch (typeof entry) {
                case "string":
                    for(let k of entry)
                        charsSet.add(k);
                    break;
                case "object":
                    for(let k in entry)
                        addChars(entry[k]);
                    break;
            }
        }
    ;
    addChars(charGroups);
    return charsSet;
}

// find characters in the font that aren't in any of the defined glyph groups
function getMiscChars(knownCharsSet, font) {
    var chars = new Set();

    for(let k of Object.keys(font.fontObject.tables.cmap.glyphIndexMap)) {
        let c = String.fromCodePoint(parseInt(k, 10));
        if(!knownCharsSet.has(c))
            chars.add(c);
    }
    return chars;
}

function getCharsForSelectUI(charGroups, font, value) {
    let knownCharsSet, chars
      , extendedChars = []
      , cmap = font.fontObject.tables.cmap.glyphIndexMap
      , filterCmap=charsSet=>new Set(Array.from(charsSet)
                               .filter(c=>c.codePointAt(0) in cmap))

      ;
    switch(value) {
        case 'all-gid':
            chars= Object.keys(cmap)
                        .sort((a, b)=>cmap[a] - cmap[b])
                        .map(u=>String.fromCodePoint(parseInt(u, 10)))
                        ;
            break;
        case 'all-groups':
            knownCharsSet = filterCmap(getKnownChars(charGroups));
            chars = [...knownCharsSet, ...getMiscChars(knownCharsSet, font)];
            break;
        case 'misc':
            knownCharsSet = getKnownChars(charGroups);
            chars = [...getMiscChars(knownCharsSet, font)];
            break;
        // currently unused
        case 'unicodes':
            chars = Object.keys(cmap)
                        .map(c=>parseInt(c, 10))
                        .sort((a, b)=>a-b)
                        .map(u=>String.fromCodePoint(parseInt(u, 10)))
                        ;
            break;
        default:
            [chars, extendedChars] = getCharsFromCharGroups(charGroups, value)
                                     .map(chars=>[...filterCmap(new Set(chars))]);
            break;
    }
    return [chars, extendedChars];
}

export class VideoproofController {
    /**
     * contentWindow: a DOM.window that will contain the page content, i.e.
     * the proofs, where the font's are applied, it can be different to the
     * uiWindow, which holds the main controller UI.
     */
    constructor(contentWindow) {
        // FIXME: which window to use per case
        //        also, use domTool!
        this._contentWindow = contentWindow;
        this._mainUIElement = null;
        this._charGroups = null;
        // this is to detect changes in this._uiSetAnimationState
        this._uiCurrentFontName = null;

        // animation state
        this._animationFrameRequestId = null;
        this._running = false;

        this._animationState = null;

        this._ui = null;// TODO: improve these apis!

        this._uiLoadingDependencies = new Map();
        function _setResolvers(key, resolve, reject) {
            // jshint validthis: true
            this._uiLoadingDependencies.set(key, {resolve, reject});
        }
        let _uiPromises = [];
        for(let key of ['mainUIElement', 'charGroups'])
            _uiPromises.push(new Promise(_setResolvers.bind(this, key)));
        Promise.all(_uiPromises)
            .then(results=>{
                let keys = [...this._uiLoadingDependencies.keys()];
                return this._initUI(Object.fromEntries([...zip(keys, results)]));
            })
            .then(null, error=>this.uiReportError(error))
            ;

        this._fonts = new Map();

        // Only allow this once, to resolve the race conditon, later
        // the loadFontsFromUrls interface should be exposed explicitly;
        let exhaustedInterfaceError = ()=>{
            throw new Error('EXHAUSTED INTERFACE: remoteResources');
        };
        if(contentWindow.remoteResources && Array.isArray(contentWindow.remoteResources)) {
            this._loadRemoteResourcesFromFetchPromises(...contentWindow.remoteResources);
            contentWindow.remoteResources = {push: exhaustedInterfaceError};
        }
        else
            // `push` is the only valid API for window.remoteResources.
            // It is better to use just one push, with many fonts instead
            // of many pushes, because then we only get one call to
            // loadFontsFromUrls, which only switches the inteface font once
            // for the call.
            contentWindow.remoteResources = {push: (...promises)=>{
                this._loadRemoteResourcesFromFetchPromises(...promises);
                contentWindow.remoteResources.push=exhaustedInterfaceError;
            }};
    }

    setUIDependency(key, value) {
        let dependency = this._uiLoadingDependencies.get(key);
        if(!dependency)
            throw new Error(`KEY NOT FOUND setUIDependency: ${key}`);
        dependency.resolve(value);
    }

    async _loadFont(fontBuffer, origin, contentDocument) {
        let fontFace = new contentDocument.defaultView.FontFace('LOADING', fontBuffer)
          , fontObject = opentype.parse(fontBuffer)
          , font = new VideoProofFont(fontObject, fontFace, origin, contentDocument)
          ;
        if(this._fonts.has(font.fullName))
            // TODO: this could be resolved by entering a loop that alters
            // font.fullName until the name is free, the font object should
            // have a method to i.e. add a counter to fullName.
            throw new Error(`FONT ALREADY REGISTERED: ${font.fullName}`);

        let fullName =  font.fullName;
        fontFace.family = fullName;
        await contentDocument.fonts.add(fontFace);
        this._fonts.set(fullName, font);
        if(this._ui)
            this._uiAddFontToSelectInterface(fullName);
        return fullName;
    }

    // Don't use this as public interface, instead call
    // loadFontsFromUrls with just one url, it will trigger the UI to
    // show the font immediately.
    async _loadFontFromUrl(url) {
        console.log('_loadFontFromUrl', url);
        let { fetch } = this._contentWindow
          , response = await fetch(url, {
                method: 'GET',
                // mode: 'cors', // no-cors, *cors, same-origin
                // cache: 'no-cache', // *default, no-cache, reload, force-cache, only-if-cached
                // redirect: 'follow', // manual, *follow, error
                // referrerPolicy: 'no-referrer', // no-referrer, *no-referrer-when-downgrade, origin, origin-when-cross-origin, same-origin, strict-origin, strict-origin-when-cross-origin, unsafe-url
            });
        return this._loadFontFromFetchResponse(response);
    }

    async _loadFontFromFetchResponse(response) {
        let origin = new FontOriginUrl(response.url)
          , { document } = this._contentWindow
          ;
        if (!response.ok)
            throw new Error(`HTTP error! Status: ${ response.status }`);
        let fontBuffer = await response.arrayBuffer();
        return this._loadFont(fontBuffer, origin, document);
    }

    async _loadFontFromFile(file) {
        let origin = new FontOriginFile(file.name)
          , fontBuffer = await file.arrayBuffer()
          ;
        return this._loadFont(fontBuffer, origin, this._contentWindow.document);
    }

    // TODO: this is the last error handler and it's not very well made.
    uiReportError(error) {
         console.error(error);
         // FIXME
         alert(error);
    }

    async loadFontsFromFiles(...files) {
        return Promise.all(files.map(file=>this._loadFontFromFile( file )))
               .then(([fontName/*, ...restNames*/])=>this.activateFont(fontName))
               .catch(error => this.uiReportError(error));
    }

    async loadFontsFromUrls(...urls) {
        return Promise.all(urls.map(url=>this._loadFontFromUrl( url )))
            .then(([fontName/*, ...restNames*/])=>this.activateFont(fontName))
            .catch(error => this.uiReportError(error));
    }

    async _loadFontsFromFetchPromises(...promises) {
        return Promise.all(promises)
            .then(responses=>Promise.all(responses.map(response=>this._loadFontFromFetchResponse( response ))))
            .then(([fontName/*, ...restNames*/])=>this.activateFont(fontName))
            .catch(error => this.uiReportError(error));
    }

    async _loadUIDependencyFromFetchPromises(type, promise, ...restPromises) {
        if(restPromises.length)
            console.warn(`SKIPPING ${restPromises.length} items for`,
                         `${type} in _loadUIDependencyFromFetchPromises.`);
        let response = await promise
          , result = response.json()
          ;
        this.setUIDependency(type, result);
        return result;
    }

    async _loadRemoteResourcesFromFetchPromises(...resources) {
        let byType = new Map();
        for(let [type, promise] of resources) {
            let list = byType.get(type);
            if(!list){
                list = [];
                byType.set(type, list);
            }
            list.push(promise);
        }

        let types =  []
          , typeResults = []
          ;
        for(let type of byType.keys()) {
            let promise;
            switch(type) {
                case 'font':
                    promise = this._loadFontsFromFetchPromises(...byType.get('font'));
                    break;
                case 'charGroups':
                    promise = this._loadUIDependencyFromFetchPromises('charGroups', ...byType.get('charGroups'));
                    break;
                default:
                    console.warn(`ATTEMPT TO LOAD  UNKOWN TYPE: ${type}`);
            }
            types.push(type);
            typeResults.push(promise);
        }
        return Promise.all(typeResults)
            .then(resolved=>new Map(zip(types, resolved)))
            .then(null, error=>this.uiReportError(error));
    }

    _uiAddFontToSelectInterface(fontName) {
        // This is not an issue so far.
        // for(let option of selectFonts.querySelectorAll('option')) {
        //     if(option.value === fontName)
        //         return;
        // }

        let { selectFonts } = this._ui
          , doc = selectFonts.ownerDocument
          , option = doc.createElement('option')
          , font = this.getFont(fontName)
          , optgroupClass = `optgroup.${font.origin.type}`
          , optgroup = selectFonts.querySelector(optgroupClass)
          ;
        option.value = fontName;
        option.textContent = font.nameVersion;

        if(optgroup === null) {
            optgroup = doc.createElement('optgroup');
            optgroup.classList.add(optgroupClass);
            switch(font.origin.type) {
                case 'from-url':
                    optgroup.label ='Included fonts';
                    break;
                case 'from-file':
                    optgroup.label = 'Your lokal fonts';
                    break;
                default:
                    optgroup.label = `Origin: ${font.origin.type}`;
            }
            // TODO: insert in alphabetical order
            selectFonts.append(optgroup);
        }
        // TODO: insert in alphabetical order
        optgroup.append(option);
    }

    // runs when the ui can be build
    async _initUI({mainUIElement, charGroups}) {
        console.log('_initUI', {mainUIElement, charGroups});
        this._mainUIElement = mainUIElement;
        this._charGroups = charGroups;

        let doc = this._mainUIElement.ownerDocument
          , togglePlayButton = doc.querySelector('#animation-controls button.play-pause')
          , previousKeyframeButton = doc.querySelector('#animation-controls button.back')
          , nextKeyframeButton = doc.querySelector('#animation-controls button.forward')
          , firstKeyframeButton = doc.querySelector('#animation-controls button.beginning')
          , lastKeyframeButton = doc.querySelector('#animation-controls button.end')
          , proof = doc.getElementById('the-proof')// doc.createElement('div')
          , status = doc.getElementById('aniparams')
          , keyFramesContainer = doc.getElementById('keyframes-display') // is a <ul>
          , moarAxesContainer = doc.getElementById('moar-axes-display') // is a <ul>
          , duration = doc.getElementById('animation-duration')
          , addFonts = doc.getElementById('add-your-own-button')
          , selectFonts = doc.getElementById('select-font')
          , selectGlyphs = doc.getElementById('select-glyphs')
          , showExtendedGlyphs = doc.getElementById('show-extended-glyphs')
          , selectLayout = doc.getElementById('select-layout')
          , customText = doc.createElement('input')
          , layoutControls = doc.getElementById('layout-specific-controls')
          ;


        let layoutTools = [
                // Not Implemented ['typespec', 'Ramp']
                ['grid', 'Array']
                // Not Implemented  ['waterfall', 'Waterfall']
                , ['type-your-own', 'Input']
                // , ['contextual', 'Contextual']
                // , ['composition', 'Composition']
            ]
          , layoutOptions = []
         ;
        for(let [value, label] of layoutTools) {
            let option = doc.createElement('option');
            option.value = value;
            option.textContent = label;
            layoutOptions.push(option);
        }
        selectLayout.append(...layoutOptions);
        selectLayout.value = layoutOptions[0].value;
        showExtendedGlyphs.disabled = true; // FIXME: out of band
        selectLayout.addEventListener('change', (/*e*/)=>this._uiInitProof());

        selectGlyphs.append(_uiBuildGlyphsSelectOptions(doc, charGroups));
        selectGlyphs.addEventListener('change', (/*e*/)=>this._uiInitProof());
        showExtendedGlyphs.addEventListener('change', (/*e*/)=>this._uiInitProof());

        customText.type = 'text';
        customText.id = 'custom-text';
        customText.name = 'text';
        customText.placeholder = "Type your own";
        customText.value = "Type your own";

        let customTextLabel = customText.ownerDocument.createElement('label');
        customTextLabel.textConent = 'Text: ';
        customTextLabel.append(customText);
        // FIXME <ul><li> structure is excessive.
        let customTextConatainer = customText.ownerDocument.createElement('li');
        customTextConatainer.append(customTextLabel);

        layoutControls.append(customTextConatainer);
        // Could be done easily without replacing the proof element!
        // but I wait for the other layout modules to fine tune the
        // updating strategy.
        customText.addEventListener('input', (/*e*/)=>this._uiInitProof());


        // FIXME: current mechanism to reset the proof content
        //        but it's not sufficient and would hace to be applied
        //        at several places.
        proof.dataset.dirty = 'TRUE';

        togglePlayButton.addEventListener('click', ()=>this.toggleRunning());
        previousKeyframeButton.addEventListener('click', ()=>{
            this.pause();
            this.goToPreviousKeyFrame();
        });
        nextKeyframeButton.addEventListener('click',  ()=>{
            this.pause();
            this.goToNextKeyframe();
        });
        firstKeyframeButton.addEventListener('click', ()=>{
            this.pause();
            this.goToAnimationTime(0);
        });
        lastKeyframeButton.addEventListener('click',  ()=>{
            this.pause();
            this.goToLastKeyframe();
        });
        duration.type='number';
        duration.min='1';
        duration.step='1';
        duration.addEventListener('change', ()=>this.setDuration(parseFloat(duration.value)));

        let dropElement = doc.body
          , dragAddClass=(/*evt*/)=> dropElement.classList.add('dropzone')
          , dragRemoveClass=(/*evt*/)=> dropElement.classList.remove('dropzone')
          , fileInputDragCallbacks = {
                dragenter: dragAddClass
              , dragover: evt=>{
                    evt.originalEvent.dataTransfer.dropEffect = 'copy';
                    dragAddClass();
                }
              , dragleave: evt=>{
                    if (evt.target !== dropElement)
                        return;
                    dragRemoveClass();
                }
              , dargend: dragRemoveClass
              , drop: dragRemoveClass
            }
          ;
        _makeFileInput (files=>this.loadFontsFromFiles(...files), addFonts,
                                        dropElement, fileInputDragCallbacks);

        selectFonts.addEventListener('change', ()=>this.activateFont(selectFonts.value));
        this._ui = {status, proof, keyFramesContainer, moarAxesContainer
                    , duration, addFonts, selectFonts, selectGlyphs
                    , showExtendedGlyphs, selectLayout, customText};

        this._onUILoaded();
    }

    _onUILoaded() {
        for(let fontName of this._fonts.keys())
            this._uiAddFontToSelectInterface(fontName);

        if(this._animationState) {
            this._uiSetAnimatonState();
            return;
        }
        let fontName = Array.from(this._fonts.keys()).pop();
        if(!fontName) {
            console.warn('No font available yet.');
            return;
        }
        this.activateFont(fontName);
    }

    _scheduleIterate(genControl={}) {
        if(this._animationFrameRequestId !== null)
            // is already scheduled
            return;
        this._animationFrameRequestId = this._contentWindow.requestAnimationFrame(()=>this._iterate(genControl));
    }
    _unscheduleIterate() {
        this._contentWindow.cancelAnimationFrame( this._animationFrameRequestId );
        this._animationFrameRequestId = null;
    }

    _iterate(genControl={}) {
        // clean up for _scheduleIterate
        this._unscheduleIterate();

        if(!this._animationState) return;

        let yieldVal = this._animationState.generator.next(genControl);
        if(yieldVal.done) {
            return;
        }
        this._animationState.lastYield = yieldVal.value;
        this._uiSetAnimatonState();

        // schedule next round
        if(this._running)
            this._scheduleIterate();
    }
    setRunning(isRunning) {
        if(this._running === !!isRunning) // jshint ignore:line
            return;
        console.log('videoproof.setRunning', isRunning);

        // changed
        this._running = !!isRunning;

        if(!this._running) {
            // this._reportStatus('paused');
            this._unscheduleIterate();
            return;
        }

        if(!this._animationState)
            // as soon as a generator is available and this._iterate()
            // is called, the generator will continue
            return;


        // continue!
        // [frame, t, duration, fromKeyFrameIndex, keyFrameT/*, fps */] =  this._animationState.lastYield
        let [, t] =  this._animationState.lastYield
          , genControl = { t }
          ;
        this._scheduleIterate(genControl);
        return;
    }

    run() {
        this.setRunning(true);
    }
    pause() {
        this.setRunning(false);
    }
    toggleRunning() {
        console.log('toggleRunning');
        this.setRunning(!this._running);
    }

    // FIXME: not sure we need this, as we always would like to have
    // the generator interface links etc. But if we keep this, there
    // needs to be a way to e.g. disable generator controls.
    cancel() {
        this.setRunning(false);
        this._animationState = null;
    }

    goToAnimationTime(t) {
        // * cancels the scheduled iterate,
        // * iterates,
        // * if running:
        //       schedules next.
        this._iterate({t});
    }

    setDuration(duration) {
        let [, t] = this._animationState.lastYield
          , genControl = { t, duration: duration}
          ;
        this._iterate(genControl);
    }

    getFont(fontName) {
        let font = this._fonts.get(fontName);
        if(!font)
            throw new Error(`FONT NOT FOUND: ${fontName}`);
        return font;
    }

    // TODO: needs e.g. to unset the moar link highlighting
    // but that could also be handled in this._uiSetAnimatonState
    // but, we need to handle switching animations
    _setAnimationState(animationState) {
        this._animationState = animationState;
        // set first frame to UI
        // if this._running is true the animation will be rescheduled
        // otherwise, this will be paused.
        this._iterate();
    }

    activateFont(fontName) {
        // will trigger if fontName does not exist
        this.getFont(fontName);
        // attempt to start the animation
        // this._reportStatus('init');
        // FIXME: UI-Wise, it would be good to have this external
        // from setting running to do, because, we could display
        // the paused state.
        let animationState = this._initAnimationGenerator(fontName);
        this._setAnimationState(animationState);
    }

    goToPreviousKeyFrame() {
        if(this._animationState instanceof AnimationStateMoar) {
            // TODO: not sure, but, if we would stack more _AnimationStates
            // in this case we could get the baseAnimationState (while...)
            // property until we have one of the type AnimationStateKeyFrames
            this._animationState = this._animationState.baseAnimationState;
        }
        let [, , , fromKeyFrameIndex] =  this._animationState.lastYield
          , t = (fromKeyFrameIndex-1)/this._animationState.keyFrames.length
        this.goToAnimationTime(t);
    }

    goToNextKeyframe() {
        if(this._animationState instanceof AnimationStateMoar) {
            // TODO: not sure, but, if we would stack more _AnimationStates
            // in this case we could get the baseAnimationState (while...)
            // property until we have one of the type AnimationStateKeyFrames
            this._animationState = this._animationState.baseAnimationState;
        }
        else if(!(this._animationState instanceof AnimationStateKeyFrames))
            throw new Error(`NOT IMPLEMENTED: go back to main animation from ${this._animationState}`);
        let [, , , fromKeyFrameIndex] =  this._animationState.lastYield
          , t = (fromKeyFrameIndex+1)/this._animationState.keyFrames.length
          ;
        this.goToAnimationTime(t);
    }

    goToLastKeyframe() {
        if(this._animationState instanceof AnimationStateMoar) {
            // TODO: not sure, but, if we would stack more _AnimationStates
            // in this case we could get the baseAnimationState (while...)
            // property until we have one of the type AnimationStateKeyFrames
            this._animationState = this._animationState.baseAnimationState;
        }
        else if(!(this._animationState instanceof AnimationStateKeyFrames))
            throw new Error(`NOT IMPLEMENTED: go back to main animation from ${this._animationState}`);
        let t = (this._animationState.keyFrames.length-1)/this._animationState.keyFrames.length;
        this.goToAnimationTime(t);
    }

    _gotoKeyframeLinkHandler(evt) {
        if(this._animationState instanceof AnimationStateMoar) {
            // TODO: not sure, but, if we would stack more _AnimationStates
            // in this case we could get the baseAnimationState (while...)
            // property until we have one of the type AnimationStateKeyFrames
            this._animationState = this._animationState.baseAnimationState;
        }
        else if(!(this._animationState instanceof AnimationStateKeyFrames))
            throw new Error(`NOT IMPLEMENTED: go back to main animation from ${this._animationState}`);

        let li = evt.target.parentNode
          , ul = li.parentNode
          , children = Array.from(ul.children)
          , t = children.indexOf(li)/children.length
          ;
        this.goToAnimationTime(t);
    }

    _initAnimationGenerator(fontName, genControl={}) {
        // apply base font styles
        let font = this.getFont(fontName)
          , axisRanges = _getFontAxisRanges(font.fontObject)
          , keyFrames = Array.from(calculateRegisteredKeyframes(axisRanges))
          ;

        // create a generator that samples through the animation space ...
        let {duration = keyFrames.length * 2, t: startT = 0} = genControl
          , gen = animationGenerator(this._contentWindow.performance, keyFrames, duration, startT)
          ;
        return new AnimationStateKeyFrames(gen, keyFrames, fontName);
    }

    _initKeyFramesAnimationLinks(animationState) {
        if(!(animationState instanceof AnimationStateKeyFrames))
            throw new Error(`TYPE ERROR: animationState must be AnimationStateKeyFrames`
                            + ` but is ${animationState}`);
        let keyFrames = animationState.keyFrames
          , { keyFramesContainer } = this._ui
          , doc = keyFramesContainer.ownerDocument
          ;
        // FIXME: use domTool
        while(keyFramesContainer.lastChild)
            keyFramesContainer.lastChild.remove();

        let gotoKeyframe = this._gotoKeyframeLinkHandler.bind(this);
        for(let keyFrame of keyFrames) {
            let li = doc.createElement('li')
              , a = doc.createElement('a')
              ;
            li.append(a);
            // this would be a good rule for css
            li.style.setProperty('color', 'hsl(0, 100%, calc(50% * var(--keyframe-t, 0)))');
            a.textContent = keyFrame.map(([name, value])=>`${name} ${value}`).join(', ');
            a.addEventListener('click', gotoKeyframe);
            keyFramesContainer.append(li);
        }
    }

    _moarActivate(axisTag, genControl={}) {
        let baseAnimationState = _getBaseAnimationState(this._animationState)
          , font = this.getFont(baseAnimationState.fontName)
          , axisRanges = _getFontAxisRanges(font.fontObject)
          , [baseFrame, ] = baseAnimationState.lastYield
          ;

        // frame is e.g.:
        //     [
        //         [ "opsz", 8 ]
        //         [ "wdth", 25 ]
        //         [ "wght", 369.69999999999976 ]
        //     ]

        let orderedFilteredAxisRanges = baseFrame.map(([axisTag, value])=>[axisTag, {'default': value}]);
        orderedFilteredAxisRanges.push([axisTag, axisRanges[axisTag]]);

        let keyFrames = Array.from(calculateKeyframes(orderedFilteredAxisRanges))
          , {duration = keyFrames.length * 2, t: startT = 0} = genControl
          , gen = animationGenerator(this._contentWindow.performance, keyFrames, duration, startT)
          ;
        let animationState = new AnimationStateMoar(gen, keyFrames, baseAnimationState, axisTag);
        this._setAnimationState(animationState);
    }

    _initMoarAnimationLinks(fontName) {
        let font = this.getFont(fontName)
          , axes = font.fontObject.tables?.fvar?.axes
          , { moarAxesContainer } = this._ui
          , doc = moarAxesContainer.ownerDocument
          ;
        if(!axes)
            axes = [];

        while(moarAxesContainer.lastChild)
            moarAxesContainer.lastChild.remove();

        let handleClick = evt=>this._moarActivate(evt.target.dataset.axisTag);
        for (let axis of axes) {
            if (REGISTERED_AXES_ORDERED.indexOf(axis.tag) !== -1)
                // because registered axes are part of the regular keyframes
                continue;
            let axisRanges = _getFontAxisRanges(font.fontObject)
              , info = axisRanges[axis.tag]
              , li = doc.createElement('li')
              , a = document.createElement('a')
              ;
            a.textContent = `${info.name} ${info.min} ${info['default']} ${info.max}`;
            a.dataset.axisTag = axis.tag;
            li.appendChild(a);
            moarAxesContainer.appendChild(li);
            a.addEventListener('click', handleClick);
        }
    }

    _uiSetAnimatonState() {
        if(!this._ui) {
            console.warn(`_uiSetAnimatonState: UI not yet available for activating ${this._animationState.fontName}.`);
            return false;
        }
        if(this._animationState.fontName !== this._uiCurrentFontName) {
            this._initKeyFramesAnimationLinks(_getBaseAnimationState(this._animationState));
            this._initMoarAnimationLinks(this._animationState.fontName);
            this._uiCurrentFontName = this._animationState.fontName;
        }

        let keyFrames = this._animationState.keyFrames
          , {status, proof, keyFramesContainer, moarAxesContainer,
               duration: uiDuration, selectFonts, selectLayout} = this._ui
          , [frame, t, duration, fromKeyFrameIndex, keyFrameT/*, fps */] =  this._animationState.lastYield
          , toKeyFrameIndex = fromKeyFrameIndex === keyFrames.length - 1
                                ? 0
                                : fromKeyFrameIndex + 1
          , axisTags = zip(...frame).next().value
            // FIXME: what we don't do is unsetting/cleaning up custom
            //        properties that are no longer used, instead, we just
            //        don't use the custom properties.
          , fontVariationSettings = axisTags.map(
                    axisTag=>`"${axisTag}" var(${axisTag2PropName(axisTag)})`)
                .join(', ')
          , setStyleProperty=(elem, name, value)=>{
                // Not sure if there's a performance issue when resetting to the
                // same value/
                if(value !== elem.style.getPropertyValue(name))
                    proof.style.setProperty(name, value);
            }
          ;

        // Don't do if the element has focus.
        if(uiDuration !== uiDuration.ownerDocument.activeElement && `${uiDuration.value}` !== `${duration}`)
            uiDuration.value = `${duration}`;
        if(selectFonts !== selectFonts.ownerDocument.activeElement && selectFonts.value !== this._animationState.fontName)
                selectFonts.value = this._animationState.fontName;

        // TODO: apply (maybe a class) for a font-variation-setttings rule
        // with css-custom properties
        // could also have all axes with default values to axes defaults,
        // but that could make standard css usage harder (I don't think we
        // need standard css, we rather need full control)
        setStyleProperty(proof, 'font-variation-settings', fontVariationSettings);
        setStyleProperty(proof, 'font-family', this._animationState.fontName);

        // FIXME: this is a hack while transitioning from the old version
        proof.dataset.genuineFontVariationSettings = fontVariationSettings;
        proof.dataset.genuineFontFamily = this._animationState.fontName;

        //TODO: make methods to control these UI states!
        if(this._animationState instanceof AnimationStateKeyFrames) {
            // For completeness, also e.g. when we change t in the animation,
            // we should unset all items that are not fromKeyFrameIndex
            // or toKeyFrameIndex
            for(let i=0,l=keyFramesContainer.children.length; i<l; i++) {
                if(i === fromKeyFrameIndex || i === toKeyFrameIndex)
                    continue;
                keyFramesContainer.children[i]
                        .style.setProperty('--keyframe-t', '');
            }
            keyFramesContainer.children[fromKeyFrameIndex]
                        .style.setProperty('--keyframe-t', 1 - keyFrameT );
            keyFramesContainer.children[toKeyFrameIndex]
                        .style.setProperty('--keyframe-t', keyFrameT);
        }

        let activateMoarLink = elem=>{
                elem.classList.add('active');
                elem.style.setProperty('color', 'red');
            }
          , deactivateMoarLink = elem=>{
                elem.classList.remove('active');
                elem.style.setProperty('color', null);
            }
          ;
        if(this._animationState instanceof AnimationStateMoar) {
            for(let elem of moarAxesContainer.querySelectorAll('a.active')) {
                if(elem.dataset.axisTag !== this._animationState.axisTag)
                    deactivateMoarLink(elem);
            }
            for(let elem of moarAxesContainer.querySelectorAll(`a[data-axis-tag=${this._animationState.axisTag}]`))
                activateMoarLink(elem);
        }
        else {
            for(let elem of moarAxesContainer.querySelectorAll('a.active')) {
                deactivateMoarLink(elem);
            }
        }

        let font = this.getFont(this._animationState.fontName);
        status.textContent = font.nameVersion + ' — '
            + `Layout: ${selectLayout.options[selectLayout.selectedIndex].textContent} — `
            + frame.map(([name, value])=>`${name} ${Math.round(value)}`)
                   .join(' ')
            + ` — ${Math.round(t * 100)}%`
            ;

        for(let [axisTag, value] of frame) {
            let propName = axisTag2PropName(axisTag);
            // FIXME: Math.round here until we solve loding state from
            //        data properly. Especially for e.g. the "slnt" axis
            //        with a range of -10 to 0, this prevents a smooth
            //        animation, however, we get integer locations for
            //        t between 0 and 1 and as such can work with that.
            //        Eventually, finding the closest keyframe from loaded
            //        data (and maybe animate there) will be a more complex
            //        task.
            //        Alternatively, we would just always export the rounded
            //        values and then find the closest t on load.
            proof.style.setProperty(propName, Math.round(value));
        }

        if(proof.dataset.dirty === 'TRUE')
            // all font state has been set
            this._uiInitProof();
        else if(this._ui._onUpdate)
            this._ui._onUpdate();
    }

    // TODO: We may need to do this also on window resize etc.
    //       there are more cases for this ...
    _uiInitProof() {
        let { proof:oldProof, selectLayout } = this._ui
          , newProof = this._ui.proof.ownerDocument.createElement('div')
          ;
        // I don't like this.
        newProof.id = oldProof.id;
        // I don't like this either.
        // And I don't think it needs to be done...
        // newProof.className = oldProof.className;
        // Neither do I like this.
        for (let i=0, l= oldProof.style.length; i<l; i++) {
            let prop = oldProof.style[i]
              , value = oldProof.style.getPropertyValue(prop)
              ;
            newProof.style.setProperty(prop, value);
        }
        oldProof.parentNode.replaceChild(newProof, oldProof);
        this._ui.proof = newProof;

        this._ui._onUpdate = ({
            'grid': this._uiInitProofGrid
          , 'type-your-own': this._uiInitProofTypeYourOwn
          // , 'contextual': this._uiInitProofContextual
          // , 'composition': this._uiInitProofComposition
        }[selectLayout.value]).call(this);

        // i.e. to update this._ui.status
        this._uiSetAnimatonState();
    }

    _uiGetCharsForSelectUI(font) {
        let {selectGlyphs, showExtendedGlyphs} = this._ui
          , [charset, extendedChars] = getCharsForSelectUI(this._charGroups, font, selectGlyphs.value)
          ;
        // Here's a side effect of calling getCharsForSelectUI:
        // This is not ideal, but we should not call getCharsForSelectUI
        // too often (it's slowish), and here we must anyways. until there's
        // a more elegant solution of cheaper figuring out if there are
        // extended glyphs, the following line should always follow getCharsForSelectUI.
        showExtendedGlyphs.disabled = !extendedChars.length;
        if(showExtendedGlyphs.disabled)
                // The original code does this, I pesonally would leave
                // it checked when it's checked and unchecked when it's
                // unchecked. It could have been an UX-decision, but also
                // a bad practice decision, when only looking for the
                // checked value, regardless of the disabled value.
                showExtendedGlyphs.checked = false;
        return [charset, extendedChars];
    }

    _uiInitProofTypeYourOwn() {
        let { proof:newProof, selectGlyphs, showExtendedGlyphs, customText} = this._ui;
        // TODO: Will need a better central solution.
        selectGlyphs.disabled = true; // FIXME: could be display: None additionally
        showExtendedGlyphs.disabled = false;
        customText.disabled = false;

        let text = customText.value.trim();
        if(showExtendedGlyphs.checked) {
            let extended = getExendedChars(this._charGroups, customText.value);
            if(extended.length)
                text += ' ' + extended.join(' ');
        }
        return initTypeYourOwn(newProof, text);
    }

    _uiInitProofGrid() {
        let { selectGlyphs, showExtendedGlyphs, proof:newProof, customText } = this._ui
          , font = this.getFont(this._animationState.fontName)
          , [charset, extendedChars] = this._uiGetCharsForSelectUI(font)
          ;
        selectGlyphs.disabled = false;
        customText.disabled = true;
        // This is not ideal, but we should not call getCharsForSelectUI
        // too often, and here we must anyways. until there's a more elegant
        // solution, the following line should always follow getCharsForSelectUI.
        showExtendedGlyphs.disabled = !extendedChars.length;
        if(showExtendedGlyphs.disabled)
                // The original code does this, I pesonally would leave
                // it checked when it's checked and unchecked when it's
                // unchecked. It could have been an UX-decision, but also
                // a bad practice decision, when only looking for the
                // checked value, regardless of the disabled value.
                showExtendedGlyphs.checked = false;

        if(!showExtendedGlyphs.disabled && showExtendedGlyphs.checked)
            charset = [...charset, ...extendedChars];

        newProof.classList.add('fixed-line-breaks');
        // fixLineBreaks seems to be pretty slow, around 1 seccond for
        // ~ 1000 glyphs in grid. This is around 1 ms per glyph but it's
        // well perceivable in all-glyphs with currently around 900 something
        // glyphs.
        let then = performance.now();
        initGrid(newProof, charset, fixLineBreaks.bind(null, font));
        // This is quite slow, especially for the bigger charsets.
        // Must be in fixLineBreaks ...
        console.log(`initGrid for ${selectGlyphs.value} (${charset.length} chars) took`, performance.now() - then, charset);
    }
}
