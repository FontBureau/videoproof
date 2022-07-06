/* jshint esversion: 11, browser: true, unused:true, undef:true, laxcomma: true, laxbreak: true, devel: true */
import opentype from '../../opentype.js/dist/opentype.module.js';
import {  normalizeRanges, mergePathRanges, getFullPathsFromRanges
       , normalizePathsRanges, serializePathRanges, deserializePathRanges
       , markupSelectionInline, markupSelectionStructureSave
       } from './text-selection.mjs';
import {init as initGrid} from './layouts/grid.mjs';
import {init as initTypeYourOwn} from './layouts/type-your-own.mjs';
import {init as initTypespec} from './layouts/typespec.mjs';
import {init as initContextual} from './layouts/contextual.mjs';


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
 *
 * CAUTION: When called without any argument len will be Infinity
 * because `Math.min() === Infinity` and hence zip will yield forever
 * empty arrays.
 */
function* zip(...arrays) {
    if(!arrays.length)
        throw new Error('zip requires at least one array-like argument.');
    let len = Math.min(...arrays.map(a=>a.length));
    for(let i=0;i<len;i++)
        yield arrays.map(a=>a[i]); // jshint ignore:line
}

/**
 * a = [1,2,3]
 * b = [3,4.5]
 * dot(a, b) = a[0] * b[0] + a[1] * b[1] + a[2] * b[2] +
 */
function vecDot(a, b) {
    return Array.from(zip(a, b))
                .reduce((accum, [an, bn])=>accum + (an * bn), 0);
}

function vecSum(a, b) {
    return Array.from(zip(a, b))
                .map(([an, bn])=>an + bn);
}

function vecScale(a, scalar){
    return a.map(n=>n * scalar);
}

function vecSubstract(a, b) {
    return vecSum(a, vecScale(b, -1));
}

function vecLength(a) {
    return Math.sqrt(a.map(an=>an*an).reduce((accum, an)=> accum + an));
}

/**
 * ab is the line segment
 * p is the point which we search c, the clostest point on ab, for.
 *
 * from https://softwareengineering.stackexchange.com/a/168577
 * and https://gdbooks.gitbooks.io/3dcollisions/content/Chapter1/closest_point_on_line.html
 */
function closestPoint(a, b, p) {
    // Project p onto ab, computing the
    // paramaterized position d(t) = a + t * (b - a)
    let pa = vecSubstract(p, a) // p - a
      , ba = vecSubstract(b, a) // b - a
      , tRaw = vecDot(pa, ba) / vecDot(ba, ba)
        // Clamp T to a 0-1 range. If t was < 0 or > 1
        // then the closest point was outside the segment,
        // but on the line.
      , t = Math.min(1, Math.max(tRaw, 0))
      , ca = vecScale(ba, t)
        // Compute the projected position from the clamped t
      , c = vecSum(a, ca)
        // distance
      , d = vecLength(vecSubstract(pa, ca))
        // distance also
        // d = vecLength(vecSubstract(p, c))
      ;
    // Compute the projected position from the clamped t
    return [d, t, c];
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
        axisRanges[axis.tag] = Object.freeze({
            'name': 'name' in axis ? axis.name.en : axis.tag,
            'min': axis.minValue,
            'max': axis.maxValue,
            'default': axis.defaultValue
        });
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
 *       duration: float, per keyframe, in seconds
 * }
 */
function* animationGenerator(performance, keyFrames, duration, newT) {
    let t = 0
      , lastExecution
        // in milli seconds, this can be changed dynamically
        // original default is 1000ms * keyFrames.length * 2
      , newDuration
      , totalDuration = keyFrames.length * duration
      ;


    // run forever
    while(true) {
        let fps = 0;
        if(newT !== undefined) {
            if(newT < 0)
                newT = 1 - (Math.abs(newT) % 1);
            else
                // newT can be used to jump to a new position or to resume
                // animation after a pause.
                t = newT % 1;
        }
        // It's initially undefined, but then either t is 0
        // or newT was set as argument.
        else if(lastExecution !== undefined) {
            let frameTime = performance.now() - lastExecution
                // Need miliseconds, hence totalDuration times 1000.
              , frameTimeFraction =  frameTime / (totalDuration * 1000)
              ;
            fps = 1000 / frameTime;
            t = (t + frameTimeFraction) % 1; // 0 >= t < 1
        }
        let frame
          , fromKeyFrameIndex
          , keyFrameT
          ;
        if(keyFrames.length === 1) {
            // don't animate a static frame
            frame = keyFrames[0];
            t = 0;
            fromKeyFrameIndex = 0;
            keyFrameT = 0;
        }
        else {
                // Also animate from keyFrames.length - 1 to 0, in a circle.
            let keyFramesPosition = keyFrames.length * t; // float: 0 >= keyFramesPosition < keyFrames.length
            fromKeyFrameIndex = Math.floor(keyFramesPosition); // int: 0 >= fromKeyFrameIndex < keyFrames.length-1
            let toKeyFrameIndex = fromKeyFrameIndex < keyFrames.length - 1
                                ? fromKeyFrameIndex + 1
                                 // circle around
                                : 0
              , fromKeyFrame = keyFrames[fromKeyFrameIndex]
              , toKeyFrame = keyFrames[toKeyFrameIndex]
              ;
            //if(!fromKeyFrame || !toKeyFrame)
            //    console.error(
            //        `t: ${t}`,
            //        `keyFrames.length: ${keyFrames.length}\n`,
            //        `fromKeyFrameIndex: ${fromKeyFrameIndex}\n`,
            //        `toKeyFrameIndex: ${toKeyFrameIndex}\n`
            //    );
            keyFrameT = keyFramesPosition % 1;
            frame = _interpolateKeyframe(keyFrameT, fromKeyFrame, toKeyFrame);
        }
        lastExecution = performance.now();
        // call next like e.g: gen.next({duration: 2})
        // duration will be mapped to newDuration
        ({ t: newT, duration: newDuration } = yield [frame, t, duration, fromKeyFrameIndex, keyFrameT, fps]);
        if(newDuration !== undefined){
            duration = newDuration;
            totalDuration = keyFrames.length * duration;
        }
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

function _formatProofTag(proofName) {
    return proofName.toUpperCase().replace(/[ -]/g, '_');
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
        this._axisRangesCache = null;
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
                            // semicolon breaks CSS selecting the family.
                            .replaceAll(';', ' ')
               ].join(' ');
    }

    get serializationNameParticles() {
        // Ordered by significance, the origin info is not serialized.
        return [this._getName('fullName'), this._getName('version')];
    }

    get axisRanges() {
        if(!this._axisRangesCache ) {
            Object.defineProperty(this, '_axisRangesCache', {
                value: Object.freeze(_getFontAxisRanges(this.fontObject))
            });
        }
        return this._axisRangesCache;
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
    next(genControl) {
        if(!this.lastYield && genControl && ('t' in genControl || 'duration' in genControl))
            // prime the generator, so that it accepts genControl
            // maybe we could do this "priming" somewhere in constructor
            // as it seems to me not elegant this way.
            // Also, maybe we don't need this 'priming' eventually;
            this.generator.next();
        let yieldVal = this.generator.next(genControl);
        if(yieldVal.done)
            return;
        this.lastYield = yieldVal.value;
        return yieldVal.value;
    }

    toKeyFramesOrderAndCoordinates() {
        // => [keyFrameAxisOrder, keyFramesCoordinates]
        if(this.keyFrames.length === 1 && this.keyFrames[0].length === 0)
            return [null, null];
        return this.keyFrames.map(frame=>frame.length
                        ? Array.from(zip(...frame))
                        : []
            )
            .reduce((accum, [axisTags, coordinates])=>{
                if(!accum.length)
                    accum.push(axisTags, []);
                accum[1].push(coordinates);
                return accum;
            }, []);
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

function _getClosestPointFromKeyFrames(keyFramesCoordinates, searchLocation) {
    let distances = keyFramesCoordinates.map((keyframe, i, arr)=>{
            let nextKeyframe = i + 1 === arr.length ? arr[0] : arr[i+1];
            return  /*[distance, t, point] = */ closestPoint(keyframe, nextKeyframe, searchLocation);
        })
        // search lowest distance
      , keyFrameIndex = 0
      , lowestD = distances[keyFrameIndex][0]
      ;

    for(let [i, [d, ]] of distances.entries()) {
        if(d < lowestD) {
            lowestD = d;
            keyFrameIndex = i;
        }
    }
    // Calculate global t, i.e. over all keyframes, as keyFrameT
    // is only relative to the current keyFrame.
    let [distance, keyFrameT, point] = distances[keyFrameIndex]
     , keyFramesPosition = keyFrameIndex + keyFrameT
     , t = keyFramesPosition/keyFramesCoordinates.length
     ;
    return [distance, t, point];
}

/**
 * Setting the widest wdth/wght/opsz combination the font can handle.
 */
const _AXES_WIDEST_SETTING =  [
    // FIXME: this are not all axes that are responsible for
    //        changing width (XTRA, ...?)
    ['wdth', 'max'],
    ['wght', 'max'],
    ['opsz', 'max'] // used to be min, but at max RobotFlex is wider than at min
];
function _setWidest(font, element) {
    //get the stuff as wide as possible
    let axes = font.fontObject.tables?.fvar?.axes || []
      , reset = element.style.fontVariationSettings
      , fvs = []
      ;

    for(let[tag, wideEnd] of _AXES_WIDEST_SETTING) {
        if (tag in axes)
            fvs.push(`"${tag}" ${axes.wdth[wideEnd]}`);
    }
    element.style.fontVariationSettings = fvs.join(', ');
    return ()=>element.style.fontVariationSettings = reset;
}

function _withSetWidest(font, elem, func, ...args) {
    let reset = _setWidest(font, elem);
    try {
        func(...args);
    }
    finally {
        reset();
    }
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

          // we want to have the biggest font size that fits vertically and
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
function _fixGridLineBreaks(element) {
    // replace old lines with their child elements
    for(let div of element.getElementsByTagName('div'))
        div.parentElement.append(...div.children);

    let rightMarginPerEm = 0.3
      , fontsizePx = 16
      , allWidths = []
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
        allWidths.push(box.width / fontsizePx);
    }
    let maxWidth = Math.max(...allWidths);

    for(let i=0,l=element.children.length;i<l;i++) {
        let item = element.children[i]
          , measured = allWidths[i]
          ;
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
        item.style.setProperty('--measured-width-em', measured);
        // If box.width / fontsizePx > 0.85 we want to go up to 2 em
        item.style.setProperty('--width-em', maxWidth + 0.25);
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

// This started as a copy of _fixGridLineBreaks
function _fixContextualLineBreaks(element) {
    // replace old lines with their child elements
    for(let div of element.getElementsByTagName('div'))
        div.parentElement.append(...div.children);

    let fontsizePx = 16
      , allWidths = []
      ;
    element.style.setProperty('font-size', `${fontsizePx}px`);

    for(let item of element.children) {
        // A sanity check because the old implementation was concerned with this.
        if (item.tagName !== 'SPAN')
            throw new Error(`UNEXPECTED ELEMENT <${item.tagName}>, expecting <SPAN>`,);
        let box = item.getBoundingClientRect();
        allWidths.push(box.width / fontsizePx);
    }
    let maxWidth = Math.max(...allWidths)
      , widthAndWiggleRoom = maxWidth + 1.5 // extra for the space, could be measured
      , elementWidths = []
      ;

    for(let i=0,l=element.children.length;i<l;i++) {
        let item = element.children[i]
          , measured = allWidths[i]
          ;
        elementWidths.push(widthAndWiggleRoom);
        // FIXME: is only debugging inforamtion
        item.style.setProperty('--measured-width-em', measured);
    }

    let [fontSizePt, lineBreaks] = gridFontSize(element, elementWidths, 0);
    element.style.fontSize = `${fontSizePt}pt`;
    // FIXME: alternatively remove applied padding from available space.
    element.style.padding = 0;
    for(let i of lineBreaks) {
        let child = element.children[i];
        child.classList.add('end-of-line');
    }
    return fontSizePt * 4 / 3; // return in px
}

function fixGridLineBreaks(font, elem) {
    return _withSetWidest(font, elem, _fixGridLineBreaks, elem);
}

function fixContextualLineBreaks(font, elem) {
    return _withSetWidest(font, elem, _fixContextualLineBreaks, elem);
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

function _filterCmap (cmap, charsSet) {
    return new Set(Array.from(charsSet)
                        .filter(c=>c.codePointAt(0) in cmap));
}

function _getCmapAndFilterCmapFromFont(font) {
    let cmap = font.fontObject.tables.cmap.glyphIndexMap;
    return [
        cmap
      , /*filterCmap*/ charsSet=>_filterCmap(cmap, charsSet)
    ];
}

function _getCharsForKey(filterCmap, charGroups, key) {
    return getCharsFromCharGroups(charGroups, key)
                        .map(chars=>[...filterCmap(new Set(chars))]);
}

function getCharsForKey(charGroups, font, key) {
    const [, filterCmap]  = _getCmapAndFilterCmapFromFont(font);
    return _getCharsForKey(filterCmap, charGroups, key);
}

function getCharsForSelectUI(charGroups, font, value) {
    let knownCharsSet, chars
      , extendedChars = []
      , [cmap, filterCmap] = _getCmapAndFilterCmapFromFont(font)
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
            [chars, extendedChars] = _getCharsForKey(filterCmap, charGroups, value);
            break;
    }
    return [chars, extendedChars];
}

// via https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object/freeze
function _deepFreeze(object) {
    // Retrieve the property names defined on object
    const propNames = Object.getOwnPropertyNames(object);

    // Freeze properties before freezing self
    for (const name of propNames) {
        const value = object[name];

        if (value && typeof value === "object") {
          _deepFreeze(value);
        }
    }
    return Object.freeze(object);
}

const COLOR_DEFAULTS = ['000000', 'FFFFFF']
    ,  DEFAULT_DURATION_PER_KEYFRAME = 2
    ;

export class VideoproofController {
    /**
     * contentWindow: a DOM.window that will contain the page content, i.e.
     * the proofs, where the font's are applied, it can be different to the
     * uiWindow, which holds the main controller UI.
     */
    constructor(contentWindow) {
        // FIXME: which window to use per case
        //        also, use domTool!
        this._cmdCallDepth = 0;
        Object.defineProperty(this, 'appReady', {value: false, configurable: true});
        this._contentWindow = contentWindow;
        this._mainUIElement = null;
        this._charGroups = null;
        // this is to detect changes in this._uiSetState
        this._uiCurrentFontName = null;
        this._uiCurrentProof = null;
        this._uiStateChanges = new Set();

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
        let allUIPromise = Promise.all(_uiPromises)
            .then(results=>{
                let keys = [...this._uiLoadingDependencies.keys()]
                  , uiDependencies = new Map([...zip(keys, results)])
                  ;
                return this._initUI(Object.fromEntries(uiDependencies))
                    .then(()=>uiDependencies);
            })
            .catch(error=>this.uiReportError(error))
            ;

        this._fonts = new Map();

        // Only allow this once, to resolve the race conditon, later
        // the loadFontsFromUrls interface should be exposed explicitly;
        let exhaustedInterfaceError = ()=>{
            throw new Error('EXHAUSTED INTERFACE: remoteResources');
        };

        let remoteResourcesPromise
          , testDeferredRemoteResources = false
          , testDeferredRemoteTimeout = 3000 // set to 6000 to trigger the rejection
          , remoteResourcesAvailable = contentWindow.remoteResources && Array.isArray(contentWindow.remoteResources)
          ;

        // Because it can be hard to see the deferred case in the wild,
        // this contraption stays here for now, to simulate the case manually.
        // Something similar could be made from the html source of course.
        if(testDeferredRemoteResources && remoteResourcesAvailable) {
            console.warn(`Testing deferred remoteResources. Timeout: ${testDeferredRemoteTimeout}`);
            remoteResourcesAvailable = false;
            const _copiedRemoteResources = contentWindow.remoteResources.slice();
            contentWindow.setTimeout(
                ()=>{
                    console.warn(`Trigger test deferred remoteResources.`);
                    contentWindow.remoteResources.push(..._copiedRemoteResources);
                }
              , testDeferredRemoteTimeout
            );
        }

        if(remoteResourcesAvailable) {
            remoteResourcesPromise = this._loadRemoteResourcesFromFetchPromises(...contentWindow.remoteResources);
            contentWindow.remoteResources = {push: exhaustedInterfaceError};
        }
        else {
            // Definitely expect some remoteResources to be loaded, it's
            // not clear though, if this code runs before they are specified
            // in the DOM or after. There is a timeout to warn when
            // contentWindow.remoteResources is never pushed to i.e. forgotten.
            //
            // `push` is the only valid API for window.remoteResources.
            // It is better to use just one push, with many fonts instead
            // of many pushes, because then we only get one call to
            // loadFontsFromUrls, which only switches the inteface font once
            // for the call.
            let resolve, reject
              , rejectTimeout = setTimeout(()=>{
                    contentWindow.remoteResources.push=exhaustedInterfaceError;
                    reject(new Error('Not initiated: remoteResources!'));
                  }, 5000)
             ;
            remoteResourcesPromise = new Promise((_resolve, _reject)=>{
                resolve = _resolve;
                reject = _reject;
            });
            contentWindow.remoteResources = {push: (...promises)=>{
                contentWindow.clearTimeout(rejectTimeout);
                resolve(this._loadRemoteResourcesFromFetchPromises(...promises));
                contentWindow.remoteResources.push=exhaustedInterfaceError;
            }};
        }

        Promise.all([remoteResourcesPromise, allUIPromise])
               .then((results)=>this._allInitialResourcesLoaded(...results))
               .catch(error=>this.uiReportError(error));
    }

    __allInitialResourcesLoaded(remoteResources/*, uiDependencies*/) {
        Object.defineProperty(this, 'appReady', {value: true});
        console.log('_allInitialResourcesLoaded');
        // Ensure proof ui elements are initialized properly.
        this._uiStateChanges.add('proof');
            // It would also be possible to:
            //      let fontNames = Array.from(this._fonts.keys())
            // However, this way it is closer to the original loading
            // order and thus probably more robust when the code changes.
            // The original load order is considered to be relevant for
            // the user interface display order.
        let fontNames = remoteResources.get('font') || []
          , fontName = fontNames[0]
          ;
        for(let fontName of fontNames)
            this._uiAddFontToSelectInterface(fontName);

        if(this._loadStateFromLocationHash())
            // State was restored successfully
            return;
        // State was not loaded (successfully).
        if(!fontName) {
            // pass;
            // No initial font available. Could be a legitimate
            // deployment of this App.
        }
        else
            this.activateFont(fontName);
    }

    _allInitialResourcesLoaded(...args) {
        return this._cmd('__allInitialResourcesLoaded', ...args);
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

        let fullName = font.fullName;
        fontFace.family = fullName;
        await contentDocument.fonts.add(fontFace);
        return font;
    }

    // Don't use this as public interface, instead call
    // loadFontsFromUrls with just one url, it will trigger the UI to
    // show the font immediately.
    async _loadFontFromUrl(url) {
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
         // DO?
         // throw(error);
    }

    _registerLoadedFonts(...fonts) {
        let keys = [];
        for(let font of fonts) {
            let fullName = font.fullName;
            this._fonts.set(fullName, font);
            keys.push(fullName);
            if(this.appReady)
                this._uiAddFontToSelectInterface(fullName);
        }
        return keys;
    }

    _registerAndActivateLoadedFonts(...fonts) {
        let fontNames = this._registerLoadedFonts(...fonts);
        if(this.appReady && fontNames.length)
            // activate the first font of the batch.
            this.activateFont(fontNames[0]);
        return fontNames;
    }

    async loadFontsFromFiles(...files) {
        return Promise.all(files.map(file=>this._loadFontFromFile( file )))
            .then(fonts=>this._registerAndActivateLoadedFonts(...fonts))
            .catch(error => this.uiReportError(error));
    }

    async loadFontsFromUrls(...urls) {
        return Promise.all(urls.map(url=>this._loadFontFromUrl( url )))
            .then(fonts=>this._registerAndActivateLoadedFonts(...fonts))
            .catch(error => this.uiReportError(error));
    }

    async _loadFontsFromFetchPromises(...promises) {
        let fontsPromises = promises.map(promise=>promise.then(
                    response=>this._loadFontFromFetchResponse(response)));
        return Promise.all(fontsPromises)
            .then(fonts=>this._registerAndActivateLoadedFonts(...fonts))
            .catch(error => this.uiReportError(error));
    }

    async _loadUIDependencyFromFetchPromises(type, promise, ...restPromises) {
        if(restPromises.length)
            console.warn(`SKIPPING ${restPromises.length} items for`,
                         `${type} in _loadUIDependencyFromFetchPromises.`);
        let response = await promise
          , result = _deepFreeze(response.json())
          ;
        this.setUIDependency(type, result);
        return result;
    }

    async _loadRemoteResourcesFromFetchPromises(...resources) {
        let byType = new Map();
        for(let [type, promise] of resources) {
            let list = byType.get(type);
            if(!list) {
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
            .catch(error=>this.uiReportError(error));
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
          , optgroupClass = `optgroup-${font.origin.type}`
          , optgroup = selectFonts.querySelector(`.${optgroupClass}`)
          ;
        option.value = fontName;
        option.textContent = font.nameVersion;
        // The first option is going to be selected. (default anyways)
        if(selectFonts.options.length === 0)
            option.selected = true;

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

    // This is a wrapper around any function that changes state, i.e.
    // around every action that changes what would be serialized in
    // _setStateLink (despite of the Date, that always changes without a
    // call).
    _cmd(fn, ...args) {
        this._cmdCallDepth += 1;
        let result, error;
        try {
            if(typeof fn === 'string')
                result = this[fn](...args);
            else if(typeof fn === 'function')
                result = fn.call(this, ...args);
            else
                throw new Error(`Don't know how to call function ${typeof fn}.`);
        }
        finally {
            this._cmdCallDepth -= 1;
        }
        if(error)
            throw error;
        if(fn === '__loadStateFromLocationHash') {
            // pass
            // in this case we want to keep the original hash
        }
        else if(fn === '__allInitialResourcesLoaded') {
            // pass
            // Don't set or change a hash initially.
        }
        else if(this._cmdCallDepth !== 0) {
            // pass
            // we set/unset the state link only in the outermost call
            // that affects state
        }
        else if(!this._running)
            this._setStateLink();
        else if(this._running)
            this._removeStateLink();
        return result;
    }

    // Runs when the ui can be build, but does not require resources like
    // the fonts to be available yet.
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
          , commentBox = doc.getElementById('comment-box')
          , comment = commentBox.querySelector('textarea')
          , commentSetHighlight = doc.getElementById('comment-set-highlight')
          , showComment = doc.getElementById('show-comment-ui')
          , reset = doc.getElementById('reset')
          , colorForeground = doc.getElementById('foreground')
          , colorInvertButton = doc.getElementById('fg-bg-invert')
          , colorBackground = doc.getElementById('background')
          , keyframesdDisplayContainer = doc.getElementById('keyframes-display-container')
          , moarAxesDisplay = doc.getElementById('moar-axes-display')
          , animationControls = doc.getElementById('animation-controls')
          , animationDurationContainer = doc.getElementById('animation-duration-container')
          , aniparams = doc.getElementById('aniparams')
          , selectGlyphsContainer = doc.getElementById('select-glyphs-container')
          , contextualPadModeContainer = doc.getElementById('contextual-pad-mode-container')
          , contextualPadMode = doc.getElementById('contextual-pad-mode')
          , contextualPadCustomContainer = doc.getElementById('contextual-pad-custom-container')
          , contextualPadCustom = doc.getElementById('contextual-pad-custom')
          ;

        // We don't know initially, but let's expect it to be not pressed.
        this._multiSelectModifierKeyPressed = false;
        this._resetUISelection();

        doc.addEventListener('keydown', evt=>{
           // For mac we use the cmd-key ( === evt.metaKey)
           // as ctrl doesn't work that way on mac. The "super/windows"
           // key doesn't register at all as metaKey on my Linux.
           this._multiSelectModifierKeyPressed = evt.ctrlKey || evt.metaKey;
        });
        doc.addEventListener('keyup', evt=>{
           this._multiSelectModifierKeyPressed = evt.ctrlKey || evt.metaKey;
        });

        doc.addEventListener('selectstart', (/* evt */)=>{
            let mergedPathRanges
              , {wipRanges, temporayMultiSelectionRanges, normalizedRanges} = this._getUISelection()
              ;
            // This is not available on iOS(-Safari etc.)
            if(this._multiSelectModifierKeyPressed) {
                // merge normalized wip-range(s) in temporayMultiSelectionRanges
                mergedPathRanges = mergePathRanges(...temporayMultiSelectionRanges, ...getFullPathsFromRanges(proof,
                        ...wipRanges.filter(
                                range=> !range.collapsed
                                && proof.contains(range.commonAncestorContainer))));

            }
            else
                mergedPathRanges = []; // drop

            // drop wipRanges
            this._resetUISelection({
                    wipRanges: []
                  , temporayMultiSelectionRanges: mergedPathRanges
                  , normalizedRanges
            });
            this._applyTemporaryMultiSelectionToProof();
            // render temp-stored ranges using Range.getClientRects() and
            // absolute positioning within proof, ideally with a z-index below
            // the actual content, to ensure the text is still visible.
            // this kind of rendering could be massiveley better than the
            // inline-span approach, but we can't control
            // text-color. It's better because it doesn't disturb the
            // current selection, as it doesn't change the selected markup.


            // FF
            //    not fired when ctrl multi selecting
            //    not fired when selection is dropped
            //    always followed by selectionchange
            //    not fired when just clicking around without dragging, selectionchange fires
            // Chrome
            //    no ctrl-multi select
            //    fires always, also when just clicking around and on new click and drags
            //    also fires on shift + click (which keeps the start and changes the end)
            //    and fires on droping selection
        });

        doc.addEventListener('selectionchange', (/* evt */)=>{
            let selection = doc.getSelection();

            // selection start may be important to decide whether to commit
            // the last range! We should, just to be sure, *MAYBE* also have
            // the last range as normalizedRangePath, so it won't be changed
            // inbetween, however, collapsed can also happen during normal
            // selection dragging.

            // ctrlKey pressed can basically only be used to determine if
            // the already committed ranges should be kept or flushed in
            // chrome. Needs investigation, how keyboard selction plays
            // into this.
            // In FireFox ctrl only plays a role on selection start, after
            // the new selection has been started as a multi-select,
            // ctrl can be released for both, keyboard and mouse based
            // selection.

            // essentially we get a stream of these events and in here
            // need to decide in which state we are/were and how it changed
            // and since FF and Chrome are different in some aspects, we
            // need to figure these out as well.

            // is this a selectionstart?
            //      is this a multiselection-start, i.e. adding to previous selections?
            //          commit last range(s)?
            //      is this a single/reset-selection start, flushing previous selections?
            //          flush last ranges


            // There's no selectionstart event in iOS, but, there's also
            // no collapsed selection, always at least one char is selected,
            // and there's no modifier key anyways, SO, that together could
            // help. Multi-select will need an interface here!


            // To detect start selection, we can use the event, it's essential
            // to know wheter to keep or to dump the previous range(s).
            // This is done by looking at the multi-selection modifier key.
            // Firefox has fully working

            // Just store the ranges, overide previous ranges.
            const wipRanges = []
              , {temporayMultiSelectionRanges, normalizedRanges} = this._getUISelection()
              ;
            for(let i=0, l=selection.rangeCount; i<l; i++)
                wipRanges.push(selection.getRangeAt(i));

            this._resetUISelection({
                    wipRanges
                  , temporayMultiSelectionRanges
                  , normalizedRanges
            });
        });

        commentSetHighlight.addEventListener('click',evt=>{
            evt.preventDefault();
            const { proof } = this._ui
              , selection = doc.getSelection()
              , { temporayMultiSelectionRanges, normalizedRanges:oldNormalizedRanges} = this._getUISelection()
              , currentSelection = []
              , normalizedRanges = []
              ;

            for(let i=0, l=selection.rangeCount; i<l; i++)
                currentSelection.push(selection.getRangeAt(i));

            selection.removeAllRanges();
            // remove temp-selection elements
            markupSelectionStructureSave(proof, 'temp-selection', []);

            const normalizedCurrentSelection = normalizeRanges(proof, 'span.selection',
                        ...currentSelection.filter(
                                range=> !range.collapsed
                                && proof.contains(range.commonAncestorContainer)))
              ,  normalizedMultiSelectionRanges = normalizePathsRanges(proof, 'span.selection', ...temporayMultiSelectionRanges)
              ;
            if(this._multiSelectModifierKeyPressed)
                normalizedRanges.push(...oldNormalizedRanges);
            normalizedRanges.push(...normalizedMultiSelectionRanges, ...normalizedCurrentSelection);

            this._resetUISelection({normalizedRanges});
            this._stateChangeHandler('textSelection');
        });


//        doc.addEventListener('selectionchange', (evt)=>{
//            let selection = doc.getSelection();
//            // if(selection.isCollapsed){
//            //     this._resetUISelection();
//            //     return;
//            // }
//            let { proof } = this._ui;
//            // there's also Selection.containsNode()
//            // could be used as in Selection.containsNode(proof)
//            // where a true result could be a reason to return, as we
//            // dont' want to select proof, only within proof
//
//            // If one of these is true, we could trim the selection
//            // to be within proof.
//            // CAUTION: proof.contains(proof) === true.
//            //
//            // anchorNode = start of selection
//            // focusNode = end of selection
//            //
//            // range has also Range.commonAncestorContainer
//            console.log(`event ${evt.type} _multiSelectModifierKeyPressed:`, this._multiSelectModifierKeyPressed);
//
//            if(!this._multiSelectModifierKeyPressed)
//                // reset selection
//                this._resetUISelection();
//
//            if(!proof.contains(selection.anchorNode) || !proof.contains(selection.focusNode)) {
//                if(this._uiSelectionIsEmpty())
//                    this._stateChangeHandler('textSelection');
//                this._resetUISelection();
//                return;
//            }
//
//            //console.log(`event ${evt.type}`, evt, evt.ctrlKey, this._multiSelectModifierKeyPressed);
//            //console.log('getSelection', selection);
//
//
//            // CAUTION: the direction of the selection is not normalized
//            // with these values!
//            // However, with the range from selection.getRangeAt(0) we get
//            // range.startContainer and range.endContainer in document
//            // order (chromium), as it seems.
//            // Range is therefore the way to go.
//            // In Firefox, we can press ctrl and are able to create multiple
//            // selections (rangeCount can be > 0). I'd like to replicate this
//            // for chrome and safari, it's useful to be able to do this. Therefore
//            // when the ctrl key is pressed, we remember the current selection ranges
//            // and add to it. Otherwise, we discard the old selections an replace
//            // with the new one.
//            // * We'll have to remove overlaps, creating unions for all selected
//            //   ranges.
//            // * We'll have to manage (create, inject, remove) a lot of markup,
//            //   this will also interfere with the "index Path" and may become
//            //   a bigger problem.
//            // Unfortunately ctrlKey is not passed along with the selectionchange
//            // event, so we have to track it's state manually. :-/
//            //
//            // recreting the full behavior of firefox would be very detailed
//            // work, e.g. firefox keeps multiple selections even when ctrl
//            // is not pressed on selectionchange, this means we'll have to
//            // decide this behavior on selectionstart. Firefox won't fire
//            // selectstart when within in multiple select, you can also
//            // release and press ctrl in between again. So, selectstart
//            // together with _multiSelectModifierKeyPressed should be OK to decide whether
//            // to keep the collected ranges.
//            //
//            // In Firefox selectstart is also not fired when the current
//            // selection is "dissolved" (click somewhere => selection goes
//            // away) even though we get defacto a new selection from
//            // document.getSelection(), where isCollapsed === true.
//            // So, this is going to be interesting, how to release the
//            // selection in FF.
//
//            // console.log('startNode indexes:', getIndexPath(proof, selection.anchorNode), `@${selection.anchorOffset}`);
//            // console.log('endNode indexes:', getIndexPath(proof, selection.focusNode), `@${selection.focusOffset}`);
//
//            let startKey = getPositionKey(proof, selection.anchorNode, selection.anchorOffset);
//            // OK so in FF when selection.rangeCount > 1 the last range
//            // is the one that was added or changed, and the one selection.anchorNode
//            // and selection.anchorOffset apply to sin Chrome we can
//            // always treat the single range (at 0) the same.
//            let range = selection.getRangeAt(selection.rangeCount - 1);
//            // we are only interested in the active range, the others
//            // could be marked up on commit. This way Firefox and Chrome
//            // behavior becomes more similar.
//            // Unfortuntely this changes the Firefox behavior with
//            // multiple selections. We may need to remove all selection
//            // ranges at selectstart or try something else.
//
//            // FIXME: We should detect if multiple selection is possible
//            //        and accordingly act differently. A dirty sort of
//            //        detection would be to check if it is a mozilla.
//            //        But, ideally, we switch late to multiple-selection-is-
//            //        supported-mode when there's more than one range in
//            //        the selection.
//            // while(selection.rangeCount > 1)
//            //    selection.removeRange(selection.getRangeAt(0));
//
//            let {currentStartKey, currentRange, normalizedRanges} = this._getUISelection()
//               , newNormalizedRanges
//               ;
//            console.log('startKey', startKey, 'CURRENT', currentStartKey);
//            if(currentStartKey && currentStartKey !== startKey) {
//                // Commit the previous range.
//                console.log('uiSelection currentRange.collapsed', currentRange.collapsed);
//                if(!currentRange.collapsed) {
//                    console.log(`committed range #${ normalizedRanges.length } ${rangeToLog(proof, currentRange)}`);
//                    // console.log('before merge', rangesForLog(...normalizedRanges));
//                    // Merging is required to create less entries in
//                    // serialization, but it should also help to
//                    // keep the complexity down (overlapping ranges).
//                    // to just merge prior to rendering/serialization,
//                    // as we also must include the work in progress
//                    // currentRange (at least in serialization).
//                    // normalizedRanges = _serializeRanges(...normalizedRanges);
//
//                    let normalizedCurrent =  normalizeRanges(proof, currentRange);
//                    console.log('normalizedCurrent', pathRangesForLog(...normalizedCurrent));
//
//                    // maybe, we must cleanup the ranges from adresses within
//                    // selection-spans! Also, when we change the markup, those
//                    // ranges are likely no longer valid, as the references to
//                    // their start-/end-Containers are no longer valid!
//                    newNormalizedRanges = [...normalizedRanges, ...normalizedCurrent];
//                    // doing this only on commit now.
//                    this._stateChangeHandler('textSelection');
//                }
//            }
//
//            this._resetUISelection({
//                    // replace the current range
//                    currentRange:range
//                  , currentStartKey:startKey
//                  , normalizedRanges: (newNormalizedRanges || normalizedRanges)
//            });
//
//            // Since the selection can be grown and shrunk during the
//            // same action, we should maybe not add a range if it starts
//            // at the same position. Though, direction is important for
//            // this as well and thus the selection api has more information.
//            // In Firefox with multiple ranges the anchorNode (start)
//            // is the anchorNode of the last added Range, and hence this
//            // is useful to replace ranges.
//            // OR we somehow use start and endNodes to detect this....
//
//            // since startKey is depending on the selection, this way,
//            // we can only set ONE range for a multiple selection
//
//            // In a way, once the last StartKey changes, we can commit
//            // the last range to the ranges list, as it won't change
//            // anymore.
//        });

        let setColorsHandler= ()=>{
            // In this case not going via _uiSetState makes
            // changing colors very smooth, even during animation.
            // Maybe, throttling the calls to _uiSetState
            // could be an option as well.
            this._setColorsToProof();
        };
        colorForeground.addEventListener('input',setColorsHandler);
        colorBackground.addEventListener('input',setColorsHandler);
        colorInvertButton.addEventListener('click',(e)=>{
            e.preventDefault();
            [colorForeground.value, colorBackground.value] = [colorBackground.value, colorForeground.value];
            setColorsHandler();
        });
        // Set default's on load, to ensure a single source of truth.
        [colorForeground.value, colorBackground.value] = COLOR_DEFAULTS.map(c=>`#${c}`);

        let layoutToolsVideproof = [
                // Not Implemented ['typespec', 'Ramp']
                ['grid', 'Array']
                // Not Implemented  ['waterfall', 'Waterfall']
              , ['type-your-own', 'Input']
              , ['contextual', 'Contextual']
                // , ['composition', 'Composition']
            ]
          , layoutToolsTypetools = [
                ['typespec', 'Ramp']
                // , ['waterfall', 'Waterfall']
                // , ['grid', 'Grid']
            ]
          , layoutOptions = []
          , layoutTools = [
                ['videoProof', 'Video Proof', layoutToolsVideproof]
              , ['typeTools', 'Type Tools', layoutToolsTypetools]
            ]
          , seenTools = new Set()
         ;
        for(let [toolType, label, tools] of layoutTools) {
            if(!tools.length)
                continue;
            let optgroup = doc.createElement('optgroup');
            optgroup.label = label;
            layoutOptions.push(optgroup);
            for(let [proofTag, label] of tools) {
                let option = doc.createElement('option');
                // the full value could also be: `${toolType}:${value}`
                // but that would change the serialization format, so ideally
                // value stays unique across all toolTypes...
                if(seenTools.has(proofTag))
                    // This is a self check to ensure the assumption above,
                    // that each tool has a unique "id" value.
                    throw new Error(`ASSERTION FAILED: layoutTools proof tag "${proofTag}" is already defined.`);
                seenTools.add(proofTag);
                option.value = proofTag;
                option.textContent = label;
                // this is a stub, so far unused, but it may become interesting
                option.dataset.toolType = toolType;
                optgroup.append(option);
            }
        }
        selectLayout.append(...layoutOptions);
        selectLayout.value = layoutToolsVideproof[0][0]; // grid
        selectLayout.addEventListener('change', (/*e*/)=>this._stateChangeHandler('proof'));

        showExtendedGlyphs.disabled = true; // FIXME: out of band

        selectGlyphs.append(_uiBuildGlyphsSelectOptions(doc, charGroups));
        selectGlyphs.addEventListener('change', (/*e*/)=>this._stateChangeHandler('selectGlyphs'));
        showExtendedGlyphs.addEventListener('change', (/*e*/)=>this._stateChangeHandler('showExtendedGlyphs'));

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
        customText.addEventListener('input', (/*e*/)=>this._stateChangeHandler('customText'));

        contextualPadMode.addEventListener('change', (/*e*/)=>this._stateChangeHandler('contextualPadMode'));
        contextualPadCustom.addEventListener('input', (/*e*/)=>this._stateChangeHandler('contextualPadCustom'));

        comment.addEventListener('input', (/*e*/)=>{
            // just set state link etc.
            this._cmd(()=>{});
        });
        comment.addEventListener('change', (/*e*/)=>{
            this._cmd(()=>{
                if(comment.value.trim() === '')
                    this._uiCommentHide();
            });
        });
        showComment.addEventListener('click', (e)=>{
            // toggle
            e.preventDefault();
            this._cmd('_uiCommentToggle');
        });


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

        reset.addEventListener('click', (evt)=>{
            evt.preventDefault();
            this._reset();
        });

        duration.type='number';
        duration.min='0.1';
        duration.step='0.1';
        duration.addEventListener('change', ()=>this._setDuration(parseFloat(duration.value)));

        this._contentWindow.addEventListener('hashchange',e=>{
            e.preventDefault();
            // TODO: should this be wrapped into _cmd?
            this._loadStateFromLocationHash();
        });

        let dropElement = doc.body
          , dragAddClass=(/*evt*/)=> dropElement.classList.add('dropzone')
          , dragRemoveClass=(/*evt*/)=> dropElement.classList.remove('dropzone')
          , fileInputDragCallbacks = {
                dragenter: dragAddClass
              , dragover: evt=>{
                    evt.dataTransfer.dropEffect = 'copy';
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
                    , showExtendedGlyphs, selectLayout, customText
                    , commentBox, comment, colorForeground, colorBackground
                    , colorInvertButton, keyframesdDisplayContainer
                    , moarAxesDisplay, animationControls, animationDurationContainer
                    , aniparams, selectGlyphsContainer, contextualPadModeContainer
                    , contextualPadMode, contextualPadCustomContainer
                    , contextualPadCustom
                    };
    }

    __reset() {
        this.pause();
        let { keyFramesContainer, colorForeground
            , colorBackground} = this._ui;

        [colorForeground.value, colorBackground.value] = COLOR_DEFAULTS.map(c=>`#${c}`);

        let target = keyFramesContainer.querySelector('li a');
        if(!target)
            this.goToAnimationTime(0);
        else {
            let win = target.ownerDocument.defaultView
                , event = new win.Event('click')
                ;
            target.dispatchEvent(event);
        }
    }
    _reset() {
        this._cmd('__reset');
    }

    _setStateLink() {
        let window = this._contentWindow
          , state = this.getStateForSerialization()
          , serializedStateForUrl = this._serializeStateForURL(state)
          , href = window.location.href.split('#', 1).pop()
          ;
        // This way, it doesn't trigger onhashchange
        // From MDN:
        // Note that pushState() never causes a hashchange event to be fired,
        // even if the new URL differs from the old URL only in its hash.
        // The same is true for `history.replaceState`.
        window.history.replaceState({}, '', `${href}#${serializedStateForUrl}`);
    }

    __setColorsToProof() {
        let { proof, colorForeground, colorBackground } = this._ui;
        // I suppose setting these directly causes less work then reading
        // via style.getPropertyValue and comparing, as setting without a
        // change should be optimized by the CSS-engine.
        proof.parentNode.style.setProperty('--color-fg', colorForeground.value);
        proof.parentNode.style.setProperty('--color-bg', colorBackground.value);
    }
    _setColorsToProof() {
        return this._cmd('__setColorsToProof');
    }

    _resetUISelection({wipRanges=[], temporayMultiSelectionRanges=[], normalizedRanges=[]}={}) {
        this._uiSelection = {
              wipRanges
            , temporayMultiSelectionRanges
            , normalizedRanges: mergePathRanges(...normalizedRanges)
        };
        _deepFreeze(this._uiSelection);
        return this._uiSelection;
    }

    _getUISelection() {
        return this._uiSelection;
    }

    _getMergedSelectionRanges() {
        let { normalizedRanges } = this._getUISelection();
        // They are/must be merged by the caller of the setter, there's
        // no further check fir now. Could be ensured in the setter though.
        // return mergePathRanges(...normalizedRanges);
        return normalizedRanges;
    }

    _applyTextSelectionToProof() {
        let { proof } = this._ui;
        markupSelectionInline(proof, 'selection', this._getMergedSelectionRanges());
    }

    _applyTemporaryMultiSelectionToProof() {
        let { proof } = this._ui
          , { temporayMultiSelectionRanges } = this._getUISelection()
          ;
        if(temporayMultiSelectionRanges.length)
                // This should be done in animation, it's expensive and
                // not the major use case, but for completeness...
                markupSelectionStructureSave(proof, 'temp-selection', temporayMultiSelectionRanges);
    }

    _removeStateLink() {
        let window = this._contentWindow
          , hash = window.location.hash
          , href
          ;
        if(hash === '#' || hash === '')
            return;
        href = window.location.href.split('#', 1).pop();
        window.history.pushState({}, '', href);
    }

    /**
     * Return false if there was no state to load or if
     * state could not be loaded.
     * Return true if state was loaded successfully.
     * Will likely become async, as  this.setState will
     * become async as well.
     */
    __loadStateFromLocationHash() {
        let window = this._contentWindow
          , stateStr = window.location.hash
          ;
        while(stateStr[0] === '#')
            stateStr = stateStr.slice(1);
        if(!stateStr.length)
            return false;
        console.log('_loadStateFromLocationHash', stateStr);
        let state = this._deserializedStateFromURL(stateStr);
        return this.setState(state);
    }
    _loadStateFromLocationHash() {
        return this._cmd('__loadStateFromLocationHash');
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
        this._animationState.next(genControl);
        this._uiSetState();

        // schedule next round
        if(this._running)
            this._scheduleIterate();
    }
    __setRunning(isRunning) {
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
    setRunning(isRunning) {
        return this._cmd('__setRunning', isRunning);
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

    /**
     * CAUTION: This is a stub, don't use without testing/fixing!
     *
     * FIXME: not sure we need this, as we always would like to have
     * the generator interface links etc. But if we keep this, there
     * needs to be a way to e.g. disable generator controls.
     */
    cancel() {
        // Not sure we can handle this!
        throw new Error('NOT IMPLEMENTED: cancel');
        // this.setRunning(false);
        // this._setAnimationState(null);
    }

    goToAnimationTime(t) {
        // * cancels the scheduled iterate,
        // * iterates,
        // * if running:
        //       schedules next.
        this._iterate({t});
    }

    _getDuration() {
        let [/**/, /**/, durationLastYield] = this?._animationState?.lastYield || []
          , { duration: durationUi } = this._ui
          ;
        return [
                // In order of relevance, the last constant item will
                // allways (have to!) remain in the list after filter.
                    durationLastYield,
                    parseFloat(durationUi?.value),
                    DEFAULT_DURATION_PER_KEYFRAME
            ].filter(val=>typeof val === 'number' && isFinite(val))[0];
    }

    __setDuration(duration) {
        let [, t] = this._animationState.lastYield
          , genControl = { t, duration: duration}
          ;
        this._iterate(genControl);
    }
    _setDuration(duration) {
        this._cmd('__setDuration', duration);
    }

    getFont(fontName) {
        let font = this._fonts.get(fontName);
        if(!font)
            throw new Error(`FONT NOT FOUND: ${fontName}`);
        return font;
    }

    _getAnimationStateChanges(animationState) {
        let uiStateChanges = new Set();
        if(animationState === null)
            throw new Error("`animationState` can't be null.");
        if(this._animationState === animationState)
            return uiStateChanges;
        // Equality could be compared differently, so we would cause even
        // less work in _uiSetState, the type, fontName, axes etc. values of the
        // animation state are more important than it's actual object
        // identity.

        if(this._animationState instanceof AnimationStateMoar
                && _getBaseAnimationState(this._animationState) === animationState) {
            // The current state is a AnimationStateMoar
            // and the new animation state is the baseAnimation of the
            // current state.
            // I.e. switched from moar to regular keyframes.
            uiStateChanges.add('removeAnimationStateMoar');
        }
        else if(animationState instanceof AnimationStateMoar
                && _getBaseAnimationState(animationState) === this._animationState) {
            // Switch from AnimationStateKeyframes to AnimationStateMoar
            // it's currently not required to register this.
            /* pass */
        }
        else if(this._animationState instanceof AnimationStateMoar
                && animationState instanceof AnimationStateMoar
                && _getBaseAnimationState(this._animationState) === _getBaseAnimationState(animationState)) {
            // the current state and the new state are both AnimationStateMoar
            // and based identically. This requires no further notice to
            // _uiSetSate
            /* pass */
        }
        else {
            // This will rebuild all "Keyframes" and "moar" links.
            uiStateChanges.add('animationState');
        }

        if(this._animationState === null // initially it's null
                || this._animationState.fontName !== animationState.fontName)
            uiStateChanges.add('fontName');
        return uiStateChanges;
    }

    _setAnimationState(animationState, genControl={}) {
        let uiStateChanges = this._getAnimationStateChanges(animationState);
        for(let item of uiStateChanges)
            this._uiStateChanges.add(item);
        this._animationState = animationState;
        // if this._running is true the animation will be rescheduled
        // otherwise, this will be paused.
        this._iterate(genControl);
    }

    __activateFont(fontName) {
        // Run only when all dependencies are loaded.
        if(!this.appReady) {
            console.warn(`activateFont: App not yet available for activating ${fontName}.`);
            return false;
        }
        console.log(`activateFont ${fontName}`);
        // May trigger if fontName does not exist!
        let font = this.getFont(fontName);
        // attempt to start the animation
        // this._reportStatus('init');
        // FIXME: UI-Wise, it would be good to have this external
        // from setting running to do, because, we could display
        // the paused state.
        let animationState = this._initAnimationGenerator(font);
        this._setAnimationState(animationState);
    }
    activateFont(fontName) {
        return this._cmd('__activateFont', fontName);
    }

    goToPreviousKeyFrame() {
        // Always navigates to baseAnimationState, legacy behavior.
        let animationState = _getBaseAnimationState(this._animationState)
          , [, , , fromKeyFrameIndex] =  animationState.lastYield
          , toKeyFrameIndex = fromKeyFrameIndex === 0
                    ? animationState.keyFrames.length-1
                    : fromKeyFrameIndex-1
          , t = toKeyFrameIndex/animationState.keyFrames.length
          ;
        this._setAnimationState(animationState, {t});
    }

    goToNextKeyframe() {
        // Always navigates to baseAnimationState, legacy behavior.
        let animationState = _getBaseAnimationState(this._animationState)
          , [, , , fromKeyFrameIndex] = animationState.lastYield
          , t = (fromKeyFrameIndex+1)/animationState.keyFrames.length
          ;
        this._setAnimationState(animationState, {t});
    }

    goToLastKeyframe() {
        // Always navigates to baseAnimationState, legacy behavior.
        let animationState = _getBaseAnimationState(this._animationState)
          ,  t = (animationState.keyFrames.length-1)/animationState.keyFrames.length
          ;
        this._setAnimationState(animationState, {t});
    }

    _gotoKeyframeLinkHandler(evt) {
        // Must navigate to baseAnimationState, legacy behavior.
        let animationState = _getBaseAnimationState(this._animationState)
          , li = evt.target.parentNode
          , ul = li.parentNode
          , children = Array.from(ul.children)
          , t = children.indexOf(li)/children.length
          ;
        evt.preventDefault();
        this._setAnimationState(animationState, {t});
    }

    _initAnimationGenerator(font, genControl={}) {
        // apply base font styles
        let axisRanges = font.axisRanges
          , keyFrames = Array.from(calculateRegisteredKeyframes(axisRanges))
          ;

        // create a generator that samples through the animation space ...
        let {duration = this._getDuration(), t: startT = 0} = genControl
          , gen = animationGenerator(this._contentWindow.performance, keyFrames, duration, startT)
          ;
        return new AnimationStateKeyFrames(gen, keyFrames, font.fullName);
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


        let hasRegisteredAxis = true;
        // if keyFrames === [[]]
        if(keyFrames.length === 1 && keyFrames[0].length === 0) {
            // There are no registered axis in the font, hence no keyframes.
            hasRegisteredAxis = false;
        }
        let gotoKeyframe = this._gotoKeyframeLinkHandler.bind(this);
        for(let keyFrame of keyFrames) {
            let li = doc.createElement('li')
              , a = doc.createElement('a')
              ;
            li.append(a);
            // this would be a good rule for css
            li.style.setProperty('color', 'hsl(0, 100%, calc(50% * var(--keyframe-t, 0)))');
            a.textContent = hasRegisteredAxis
                    ? keyFrame.map(([name, value])=>`${name} ${value}`).join(', ')
                    : 'reset'
                    ;
            a.addEventListener('click', gotoKeyframe);
            keyFramesContainer.append(li);
        }
    }

    _initAnimationStateMoar(baseAnimationState, axisTag, genControl={}){
        let font = this.getFont(baseAnimationState.fontName)
          , axisRanges = font.axisRanges
          , [baseFrame, ] = baseAnimationState.lastYield
            // baseFrame is e.g.:
            //     [
            //         [ "opsz", 8 ]
            //         [ "wdth", 25 ]
            //         [ "wght", 369.69999999999976 ]
            //     ]
          , orderedFilteredAxisRanges = baseFrame.map(([axisTag, value])=>[axisTag, {'default': value}])
          ;
        orderedFilteredAxisRanges.push([axisTag, axisRanges[axisTag]]);
        let keyFrames = Array.from(calculateKeyframes(orderedFilteredAxisRanges))
          , {duration = this._getDuration(), t: startT = 0} = genControl
          , gen = animationGenerator(this._contentWindow.performance, keyFrames, duration, startT)
          ;
        return new AnimationStateMoar(gen, keyFrames, baseAnimationState, axisTag);
    }

    _moarActivate(axisTag, genControl={}) {
        let baseAnimationState = _getBaseAnimationState(this._animationState);
        let animationState = this._initAnimationStateMoar(baseAnimationState, axisTag, genControl);
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
            let axisRanges = font.axisRanges
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

    __uiSetState() {
        if(!this.appReady) {
            console.warn(`_uiSetState: UI not yet available for activating ${this._animationState.fontName}.`);
            return false;
        }

        if(this._uiStateChanges.has('animationState')) {
            this._initKeyFramesAnimationLinks(_getBaseAnimationState(this._animationState));
            this._initMoarAnimationLinks(this._animationState.fontName);
        }

        let requireProofContentsUpdate = this._checkProofContentsUpdate(...this._uiStateChanges);

        if(this._uiStateChanges.has('proof') || requireProofContentsUpdate)
            this._uiProofCleanElementAttributes();

        let {status, proof, keyFramesContainer, moarAxesContainer,
               duration: uiDuration, selectFonts, selectLayout} = this._ui
          , [frame, t, duration, /*fromKeyFrameIndex, keyFrameT, fps */] =  this._animationState.lastYield
          , axisTags = frame.length
                    ? zip(...frame).next().value
                    : []
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

        this._setColorsToProof();

        // Don't do if the element has focus.
        // FIXME: are there other elements that need this kind of treatment?
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

        // This styles the keyframe links...
        //TODO: make methods to control these UI states!
        let baseAnimationState = this._animationState.baseAnimationState
                                 || this._animationState;
           // some fonts don't have registered axes keyframes
        if(keyFramesContainer.children.length > 1
                && baseAnimationState instanceof AnimationStateKeyFrames) {
            // For completeness, also e.g. when we change t in the animation,
            // we should unset all items that are not fromKeyFrameIndex
            // or toKeyFrameIndex
            let  [/*frame*/, /*t*/, /*duration*/, fromKeyFrameIndex, keyFrameT/*, fps */] = baseAnimationState.lastYield
              , toKeyFrameIndex = fromKeyFrameIndex === keyFramesContainer.children.length - 1
                                ? 0
                                : fromKeyFrameIndex + 1
              ;
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

        // this styles the moar links
        let activateMoarLink = elem=> {
                elem.classList.add('active');
                elem.style.setProperty('color', 'red');
            }
          , deactivateMoarLink = elem=> {
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
        else if(this._uiStateChanges.has('removeAnimationStateMoar')) {
            // Do this only once: when `removeAnimationStateMoar` changed (= got turned off).
            for(let elem of moarAxesContainer.querySelectorAll('a.active')) {
                deactivateMoarLink(elem);
            }
        }

        // the status text!
        let font = this.getFont(this._animationState.fontName);
        status.textContent = font.nameVersion + ' — '
            + `Layout: ${selectLayout.options[selectLayout.selectedIndex].textContent} — `
            + frame.map(([name, value])=>`${name} ${Math.round(value)}`)
                   .join(' ')
            + ` — ${Math.round(t * 100)}%`
            ;

        // the actual custom properties with the axistag values
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

        if(this._uiStateChanges.has('proof')) {
            this._changeProofUiDependencies();
            this._uiUpdateProofContents();
        }
        else if(requireProofContentsUpdate)
            this._uiUpdateProofContents(); // implies this._ui._onUpdate(
        else if(this._ui._onUpdate) {
            this._ui._onUpdate();
        }
        // Check if the selection is still valid for the proof.
        // FIXME: not sure if this check is sufficient, it will likeley
        //        break in the future but it is good enough for now.
        // Maybe, this._ui._onUpdate(); can also return some indicator
        // whether a selection can be kept or must be removed.
        // ALSO, it may be of value to remove the existing selection markup
        // prior to this._ui._onUpdate(); in some future cases.
        // This is still WORK IN PROGRESS to figure out how to do it best.
        if(this._uiStateChanges.has('highlightSelection')) {
            // console.warn('highlightSelection!');
            // when it comes from _setState (via the link coment)
            this._applyTextSelectionToProof();
        }
        else if(!requireProofContentsUpdate && !this._uiStateChanges.has('proof')) {
            // console.warn('highlightSelection proof changed:', this._uiStateChanges.has('textSelection'));
            if(this._uiStateChanges.has('textSelection'))
                this._applyTextSelectionToProof();
        }
        else {
            console.warn('_resetUISelection!');
            this._resetUISelection();
        }
        this._applyTemporaryMultiSelectionToProof();

        // Ready for new state changes! Doing this as last thing in here
        // also means we can't tolerate state changes in those method calls
        // before. We could test this here and assert the initial content
        // of this._uiStateChanges is the same as now.
        this._uiStateChanges.clear();
    }

    _uiSetState(...args) {
        return this._cmd('__uiSetState', ...args);
    }

    // Called by this._uiSetState
    _uiProofCleanElementAttributes() {
        let { selectLayout, proof } = this._ui
         // FIXME: this should be handled centrally like the dependencies
         // description, not hard coded!.
          , layoutKey = selectLayout.value
          , classes = {
                'grid': ['fixed-line-breaks']
              , 'contextual': ['fixed-lines']
            }
          , useClasses = new Set(classes[layoutKey])
          , removeClasses = new Set(
                Object.entries(classes)
                .reduce((accum, [k, v])=>{
                    if(k === layoutKey) return accum; // skp
                    accum.push(...v.filter(c=>!useClasses.has(c)));
                    return accum;
                }, [])
            );

        for(let _class of removeClasses)
            proof.classList.remove(_class);
        for(let _class of useClasses)
            proof.classList.add(_class);

        for (let i=proof.style.length; i--;) {
            const nameString = proof.style[i];
            proof.style.removeProperty(nameString);
        }
    }
    // depends on selectLayout/proofFormatTag
    //      and subsequently on the associated proof format
    //
    // Calls the actual init function of the proofs, so that means
    // it has to run whenever the content of a proof must update (due to
    // state changes)!
    //
    // Called by this._uiSetState
    //
    __uiUpdateProofContents() {
        let { selectLayout, proof } = this._ui;

        // From here, it's good to call after  __uiSetState as the
        // intProof* method can consider the state of the proof element
        while(proof.lastChild)
            proof.lastChild.remove();

        // called by _uiSetState
        // This is interesting so that the proof can update internally,
        // after all outside changes have been made.
        let intProof = {
            'grid': this._uiInitProofGrid
          , 'type-your-own': this._uiInitProofTypeYourOwn
          , 'typespec': this._uiInitProofTypespec
          , 'contextual': this._uiInitProofContextual
          // , 'composition': this._uiInitProofComposition
        }[selectLayout.value];

        this._ui._onUpdate = intProof.call(this);
    }

    _uiUpdateProofContents() {
        return this._cmd('__uiUpdateProofContents');
    }

    /**
     * activates/deactivates PROOF_UI_DEPENDENCIES
     *
     * called only from _uiSetState when proof changed
     */
    _changeProofUiDependencies() {
        let { selectLayout } = this._ui
          , proofTag = _formatProofTag(selectLayout.value)
          , allProofDependencies = new Set(Object.values(PROOF_UI_DEPENDENCIES)
                .reduce((accum, item)=>{accum.push(...item);return accum;}, []))
          ;
        if(!(proofTag in PROOF_UI_DEPENDENCIES))
            throw new Error(`KeyError "${proofTag}" not in PROOF_UI_DEPENDENCIES`);

        console.log('_changeProof proofTag', proofTag, PROOF_UI_DEPENDENCIES[proofTag]);

        for(let proofDependency of allProofDependencies) {
            let element = this._ui[proofDependency];
            if(!element)
                continue;
            if(PROOF_UI_DEPENDENCIES[proofTag].indexOf(proofDependency) !== -1) {
                // activate
                _enableElement(element);
            }
            else {
               // deactivte
               _disableElement(element);
            }
        }
    }

    _checkProofContentsUpdate(...stateDependencyNames) {
        let { selectLayout } = this._ui
          , proofTag = _formatProofTag(selectLayout.value)
          , dependencies = new Set(PROOF_STATE_DEPENDENCIES[proofTag])
          ;
        for(let dependencyName of stateDependencyNames) {
            if(dependencies.has(dependencyName))
                return true;
        }
        return false;
    }

    /**
     * Called as an event-handler to prepare calling _uiSetState.
     */
    _stateChangeHandler(...dependencyNames) {
        if(!dependencyNames.length)
            return;
        for(let dependencyName of dependencyNames)
            this._uiStateChanges.add(dependencyName);
        this._uiSetState();
    }

    // depends on
    //      showExtendedGlyphs
    //      customText
    //      (future: a boolean option: "avoid line breaks" that defaults to true
    //              see how the legacy version handles this)
    _uiInitProofTypeYourOwn() {
        let { proof, showExtendedGlyphs, customText} = this._ui;
        // TODO: Will need a better central solution.

        let text = customText.value.trim();
        if(showExtendedGlyphs.checked) {
            let extended = getExendedChars(this._charGroups, customText.value);
            if(extended.length)
                text += ' ' + extended.join(' ');
        }
        return initTypeYourOwn(proof, text);
    }

    // depends on:
    //    this._animationState.fontName
    //    selectGlyphs
    //    showExtendedGlyphs // partialy, but that's a dependency
    _uiInitProofGrid() {
        let { selectGlyphs, showExtendedGlyphs, proof } = this._ui
          , font = this.getFont(this._animationState.fontName)
          , [charset, extendedChars] = getCharsForSelectUI(this._charGroups, font, selectGlyphs.value)
          ;
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

        // fixGridLineBreaks seems to be pretty slow, around 1 seccond for
        // ~ 1000 glyphs in grid. This is around 1 ms per glyph but it's
        // well perceivable in all-glyphs with currently around 900 something
        // glyphs.
        let then = performance.now();
        initGrid(proof, charset, fixGridLineBreaks.bind(null, font));
        // This is quite slow, especially for the bigger charsets.
        // Must be in fixGridLineBreaks ...
        console.log(`initGrid for ${selectGlyphs.value} (${charset.length} chars) took`, performance.now() - then, charset);
    }

    _uiInitProofContextual() {
        let {     proof, selectGlyphs, showExtendedGlyphs
                , contextualPadMode, contextualPadCustomContainer, contextualPadCustom
            } = this._ui
          , font = this.getFont(this._animationState.fontName)
          , charsForKey = key=>getCharsForKey(this._charGroups, font, key)
                    //selectGlyphs.value => [charset, extendedChars]
          , showExtended
          , useGlyphs = true
          , useExtended = true
          , useCustomPad = false
          , padMode = contextualPadMode.value
          , autoModes = new Set(['auto-short', 'auto-long'])
          , kernModes = new Set(['kern-upper', 'kern-mixed', 'kern-lower'])
          , customPad = ''
          , selectedChars = null
          ;

        if(autoModes.has(padMode)) {
            useGlyphs = true;
            // useExtended: decided depending on the selectedGlyphs
        }
        else if(kernModes.has(padMode)) {
            useGlyphs = false;
            useExtended = true;
        }
        else if(padMode === 'custom') {
            useGlyphs = true;
            // useExtended: decided depending on the selectedGlyphs
            useCustomPad = true;
            customPad = contextualPadCustom.value;
            // if(customPad === '') {
            //     // Fall back to this, but we don't
            //     // change the UI/state accordingly, because
            //     // the user will set some value.
            //     // It would be possible to just use no padding
            //     // as well.
            //     padMode = 'auto-long';
            // }
        }

        if(useGlyphs) {
            // enable showGlyphs
            _enableElement(selectGlyphs);
            let [charset, extendedChars] = getCharsForSelectUI(this._charGroups, font, selectGlyphs.value);
            useExtended = extendedChars.length > 0;
            selectedChars = useExtended && showExtendedGlyphs.checked
                                 ? [...charset, ...extendedChars]
                                 : charset
                                 ;
        }
        else
            // disable showGlyphs
            _disableElement(selectGlyphs);

        if(useCustomPad) {
            _enableElement(contextualPadCustomContainer);
            _enableElement(contextualPadCustom);
        }
        else {
            _disableElement(contextualPadCustomContainer);
            _disableElement(contextualPadCustom);
        }

        showExtendedGlyphs.disabled = !useExtended;
        showExtended = !showExtendedGlyphs.disabled && showExtendedGlyphs.checked;

        return initContextual(proof, selectedChars, charsForKey
                            , fixContextualLineBreaks.bind(null, font), showExtended
                            , this._charGroups._extended, padMode, customPad);
    }

    _uiInitProofTypespec() {
        let { proof } = this._ui;
        return initTypespec(proof);
    }

    getStateForSerialization() {
        let font = this.getFont(this._animationState.fontName)
            // We need frame, but t, fromKeyFrameIndex and keyFrameT
            // can be used to compare with the state after deserialization
            // but therefore, it's just logged.
            // duration: could be serialized as well!
          , [frame, /*t*/, /*duration*/, /*fromKeyFrameIndex*/, /*keyFrameT*/
                    ] = this._animationState.lastYield
          , { selectLayout, colorForeground, colorBackground } = this._ui
          ;
        // "Proof Format" state that is widget specific:
        // grid:
        //     chars/glyphs selection: str, key
        //     show-extended
        // type-your-own:
        //     custom-text: str
        //     always-fit-line: bool
        //     show-extended

        let proofFormatTag = selectLayout.value
          , proofTag = _formatProofTag(proofFormatTag)
          , proofState = this.getProofStateForSerialization(proofTag)
          , generalState = {
                dateTime: new Date()
              , fontParticles: font.serializationNameParticles
              , axisLocations: frame.map(([k, v])=>[k, Math.round(v)])
              , proofFormatTag
              , comment: this._uiCommentIsActive()
                            ? this._ui.comment.value.trim()
                            : ''
              , highlightSelection: this._getMergedSelectionRanges()
              , colors: [colorForeground.value, colorBackground.value]
            }
          ;
        return [generalState, proofState];
    }

    _serializeStateForURL(state) {
        let [generalState, proofState] = state
          , serializedGeneralValues = []
          , serializedProofValues = []
          ;

        for(let [k, serialize, ] of GENERAL_STATE_STRUCTURE)
            serializedGeneralValues.push(serialize(generalState[k]));

        for(let value of proofState) {
            let serialized;
            if(typeof value === 'boolean')
                serialized = value ? '1' : '0';
            else if(typeof value === 'string')
                serialized = decodeURIComponent(value);
            else if(value === null)
                serialized = '';
            else
                throw new Error(`Not implemented generic serialization of type ${typeof value}`);
            serializedProofValues.push(serialized);
        }

        return [
            serializedGeneralValues,
            serializedProofValues
        ].map(serialized=>{
            // remove empty '', trailing entries
            while(serialized[serialized.length-1] === '')
                serialized.pop();
            return serialized.join(';');
        }).join('&');
    }

    _deserializedStateFromURL(stateStr) {
        let [generalData, proofCustomData] = stateStr.split('&')
          , generalItems = generalData.split(';')
            // could be undefined, if there's no & in stateStr
          , proofCustomItems = proofCustomData ? proofCustomData.split(';') : []
          , generalState = {}, generalStateMessages = {}
          ;
        for(let [i, [key, , deserialize]] of GENERAL_STATE_STRUCTURE.entries()) {
                           // [value, message]
            [generalState[key], generalStateMessages[key]] = deserialize(
                        generalItems[i] === undefined ? '' : generalItems[i]
            );
        }

        let proofTag = _formatProofTag(generalState.proofFormatTag)
          , [proofState, proofStateMessages] = this._deserializeProofState(proofTag, proofCustomItems)
          ;
        return [generalState, generalStateMessages, proofState, proofStateMessages];
    }
    _getFontFromSerialization(state) {
        //  * there are multiple equal font/version combinations (from different sources)
        //              => pick one
        //  * font/version font is not available/version mismatch
        //              => choose a different font/version
        //              => load a different font locally
        //  * missing animation axes
        //              => chosse a different font/version
        //              => load a different font locally
        //              => skip missing axes
        //              => use missing axes regardless
        //  * axis values are out of axis range
        //              => chosse a different font/version
        //              => load a different font locally
        //              => clamp axis values to ranges
        //              => use axis values regardless
        //
        // So the above menu flows down, and when we are e.g. at the bottom
        // and want to start new, e.g. because the font we have chosen
        // doesn't support the required axis ranges, we need a way to start
        // over again. Starting over again will mean we use the same initial
        // state. but since chosse/load a different font/version is aalways
        // available and the other choices always appear afterwards, there
        // should be no problem.
        let fontName
          , messages = []
          , matchResults = new Map()
          ;
        for(let [fullName, font] of this._fonts.entries()) {
            let serializationParticles = font.serializationNameParticles
             , matches = Array.from(zip(serializationParticles, state.fontParticles))
                              .map(([a, b])=>a===b)
             ;
            // perfect match would be all items
            // after the first none match item we can stop, i.e.
            // if the font-name does not match, we don't compare versions
            // and if there'd be particle after version (source maybe), but
            // the version did not match, we don't look at that either.
            // hence, a match score that is equal to state.fontParticles.length is
            // a perfect match
            let matchScore = 0;
            for(let item of matches) {
                if(item)
                    matchScore += 1;
                else
                    // Mnly matches consecutive matches from the beginning
                    // are counted to the matchScore.
                    break;
            }
            if(!matchResults.has(matchScore))
                matchResults.set(matchScore, []);
            matchResults.get(matchScore).push(fullName);
        }
        if(matchResults.has(state.fontParticles.length)) {
            // these are perfect matches
            // I would just normaly just go witht the first perfect match in
            // the list however, if we use the last perfect match, it's the
            // last font that got loaded, and that may be a font the user
            // has dropped and is expecting to use.
            let perfectMatches = matchResults.get(state.fontParticles.length);
            fontName = perfectMatches[perfectMatches.length-1];
        }
        else {
            for(let matchScore=state.fontParticles.length-1;matchScore>0;matchScore--) {
                if(!matchResults.has(matchScore))
                    continue;
                //inform the user of the imperfection...
                //       use the font still
                let imperfectMatches = matchResults.get(matchScore);
                fontName = imperfectMatches[imperfectMatches.length-1];
                let font =  this._fonts.get(fontName);
                messages.push(
                      `Font is not a perfect match. Requested: ${state.fontParticles.join(', ')} `
                    + `Found: ${font.serializationNameParticles.join(', ')}`);
                  break;
            }
            if(!fontName) {
                messages.push(`No font found for: ${state.fontParticles.join(', ')}`);
                return [undefined, messages];
            }
        }
        return [fontName, messages];
    }

    _checkFontAxisFit(fontName, axisLocations) {
        let messages = []
          // Check for axes fit
          // This will only be reported to the user, the font and state
          // could be/will be load regardless.
         , axisRanges = this._fonts.get(fontName).axisRanges
         ;
        for(let [axisTag, axisValue] of axisLocations) {
            if(!(axisTag in axisRanges)) {
                messages.push(`Unknown Axis "${axisTag}" (at value: ${axisValue})`);
                continue;
            }
            let { min: minVal, max: maxVal } = axisRanges[axisTag];
            if(axisValue < minVal || axisValue > maxVal) {
                messages.push(`Axis value out of range for ${axisTag}. Requested: ${axisValue} `
                            + `Min: ${minVal} Max: ${maxVal}`);
            }
        }
        return messages;
    }

    _getMoarAnimationStateAtClosestLocation(baseAnimationState, moarAxisTag, moarAxisLocation) {
        let animationStateMoar = this._initAnimationStateMoar(baseAnimationState, moarAxisTag)
          , [baseFrame, ] = baseAnimationState.lastYield
          ;
        let baseFrameMap = new Map(baseFrame)
          , [keyFrameAxisOrder, keyFramesCoordinates] = animationStateMoar.toKeyFramesOrderAndCoordinates()
          , searchLocation = keyFrameAxisOrder.map(axisTag=>axisTag === moarAxisTag
                                ? moarAxisLocation
                                  // despite of moarAxisTag all locations in animationStateMoar
                                  // are fixed to the baseFrame locations.
                                : baseFrameMap.get(axisTag))
          , [/*distance*/, t,/*point*/] = _getClosestPointFromKeyFrames(keyFramesCoordinates, searchLocation)
          ;
          animationStateMoar.next({t});
          return animationStateMoar;
    }

    _uiCommentIsActive() {
        let { commentBox } = this._ui
          , active = commentBox.style.getPropertyValue('display') !== 'none'
          ;
        return active;
    }
    _uiCommentShow() {
        let { commentBox } = this._ui;
        commentBox.style.setProperty('display', 'initial');
    }
    _uiCommentHide() {
        let { commentBox } = this._ui;
        commentBox.style.setProperty('display', 'none');
    }
    _uiCommentToggle() {
        if(!this._uiCommentIsActive())
            this._uiCommentShow();
        else
            this._uiCommentHide();
    }

    /* If there's no comment, the comment ui should be hidden
     * similarly, if the comment ui is shown and is changed to a none
     * value it shold be hidden again.
     */
    _setComment(str) {
        let { comment } = this._ui;
        if(!str)
            this._uiCommentHide();
        else {
            this._uiCommentShow();
            comment.value = str;
        }
    }

    /**
     * Return false if state could not be applied
     * Return true if state was applied.
     *
     * Will become async, as modal user-interaction is required eventually.
     */
    setState(state) {
        let [generalState, generalStateMessages, proofState, proofStateMessages] = state
          , changedDependencyNames = new Set()
          ;
        // Display messages to the user.
        // If there are no messages in the whole deserialization, there's
        // no dialogue to show to the user, but if there are, a modal will
        // have to be opened.
        let forPrint = (msgs)=>Object.entries(msgs)
                .filter(([k, v])=>v!==undefined && v.length)
                .map(([k,v])=>`  ${k}: ${v}`).join('\n');
        if(generalStateMessages)
             console.warn('generalStateMessages\n', forPrint(generalStateMessages));
        if(proofStateMessages)
             console.warn('proofStateMessages\n', forPrint(proofStateMessages));

        // TODO handle intelligently:
        //          * font is not available
        //               font version mismatch
        //               missing animation axes
        //          * There are multiple equal fonts (from different sources)
        //          * custom location, that can't be reached with the existing keyframes
        //          * initialize and go to animation position (t) from
        //          * in the widgets: stuff adressed for the widget that it doesn't understand
        // Feature idea: keep state but change font. e.g. to compare different font versions

        let [fontName, messages/*, choices */] = this._getFontFromSerialization(generalState);

        if(!fontName) {
            console.warn('getFontFromSerialization:', messages.join('\n'));
            return false;
        }

        messages = this._checkFontAxisFit(fontName, generalState.axisLocations);
        if(messages.length)
            console.warn('checkFontAxisFit:', messages.join('\n'));

        // Now build the AnimationStates.
        // There may be an AnimationState in the request that we don't know
        // how to build, in hat case, we build the closest state we can
        // come up with, but display the requested frame initially.
        // We'll have to inform about the discrepancy between available animation
        // /animation continuation and displayed state. Maybe in the future we
        // can handle these things differently (clamp onto some un-animated axis
        // value?

        // registered axis:
        let font = this.getFont(fontName)
          , baseAnimationState = this._initAnimationGenerator(font)
          , [keyFrameAxisOrder, keyFramesCoordinates] = baseAnimationState.toKeyFramesOrderAndCoordinates()
            // get a t closest to generalState.axisLocations
          , axisLocationsMap = new Map(generalState.axisLocations)
            // closest state: all available registered axes in the base state
            //               if the generalState.axisLocations is missing
            //               any of the registered axes, we fill them in using
            //               the axis default values.
          , animationState
          , t = 0
          ;
        if(keyFrameAxisOrder !== null) {
            let searchLocation = keyFrameAxisOrder.map(axisTag=>
                axisLocationsMap.has(axisTag)
                    ? axisLocationsMap.get(axisTag)
                    : font.axisRanges[axisTag]['default']
                )
              , [/*distance*/, baseT, /*point*/] = _getClosestPointFromKeyFrames(keyFramesCoordinates, searchLocation)
              ;
              t = baseT;
        }
        baseAnimationState.next({t});

        // if there are moar axis in generalState.axisLocations ...
        let moarAxesLocations = generalState.axisLocations.filter(
                ([axisTag, /*location*/])=>
                    axisTag in font.axisRanges
                    && REGISTERED_AXES_ORDERED.indexOf(axisTag) === -1)
          , moarAxesMap = new Map(moarAxesLocations)
          , moarAxesTags = Array.from(moarAxesMap.keys())
          ;
        moarAxesTags.sort(axisTagCompare);

        // Of the other (moar) axes in generalState we sort and use the
        // first for the MOAR AnimationState. We report that we dropped
        // the rest.
        // We could drop axis at default positions! that way, we see
        // what really differs from the actuall resume position and
        // the requested position.
        let noneDefaultMoarAxesLocations = moarAxesLocations
                .filter(([axisTag, location])=>
                        font.axisRanges[axisTag]['default'] !== location);
        if(noneDefaultMoarAxesLocations.length > 1) {
            // that's a user message!
            console.log(`More than one unregistered axes at none-default locations `
                       +`are in the requested state, the animation is going to `
                       +`re-enter at only on of them: ${noneDefaultMoarAxesLocations.join(', ')}`);
        }
        else if(moarAxesLocations.length > 1)
            // that's a user message!
            console.log(`More than one unregistered axes are in the requested state, `
                       +`the animation is going to re-enter at only on of them: `
                       +`${moarAxesTags.join(', ')}`);

        if(moarAxesLocations.length) {
            let moarAxisTag;
            if(noneDefaultMoarAxesLocations.length) {
                let noneDefaultMoarAxesLocationsMap = new Map(noneDefaultMoarAxesLocations);
                // moarAxesTags is sorted, take the first
                for(let axisTag of moarAxesTags) {
                    if(noneDefaultMoarAxesLocationsMap.has(axisTag)) {
                        moarAxisTag = axisTag;
                        break;
                    }
                }
            }
            else
                moarAxisTag = moarAxesTags[0];

            let moarAxisLocation = moarAxesMap.get(moarAxisTag)
              , moarAnimationState = this._getMoarAnimationStateAtClosestLocation(baseAnimationState, moarAxisTag, moarAxisLocation)
              ;
            animationState = moarAnimationState;
        }
        else
            animationState = baseAnimationState;

        let { selectLayout, colorForeground, colorBackground } = this._ui
          , proofTag = _formatProofTag(generalState.proofFormatTag)
          ;
        let dependencies = PROOF_STATE_DEPENDENCIES[proofTag]
                                    // that's a "virtual" dependency,
                                    // it doesn't have a this._ui entry
                                    // directly.
                                    .filter(name=>name!=='fontName');
        for(let i=0,l=dependencies.length;i<l;i++) {
            let proofDependency = dependencies[i]
              , element =  this._ui[proofDependency]
              , value = proofState[proofDependency]
              , type  = element.tagName === 'SELECT'
                    ? 'select'
                    : element.type.toLowerCase()
              ;
            if(value === undefined)
                // Was likely disabled when serializing, we don't change
                // the input.
                continue;
            switch(type) {
                case 'checkbox':
                    if(element.checked !== value)
                        changedDependencyNames.add(proofDependency);
                    element.checked = value;
                    break;
                case 'text':
                case 'select':
                    if(element.value !== value)
                        changedDependencyNames.add(proofDependency);
                    element.value = value;
                    break;
                default:
                    throw new Error(`Don't know how to set proof state for ${type}.`);
            }
        }

        if(selectLayout.value !== generalState.proofFormatTag) {
            selectLayout.value = generalState.proofFormatTag;
            changedDependencyNames.add('proof');
        }

        // set colors to the ui elements in here
        if(generalState.colors)
            [colorForeground.value,  colorBackground.value] = generalState.colors;
        else
            // hard coded defaults for now
            [colorForeground.value,  colorBackground.value] = COLOR_DEFAULTS.map(c=>`#${c}`);

        // If there's no comment, the comment ui should be hidden
        // similarly, if the comment ui is shown and is changed to a none
        // value it shold be hidden again.
        this._setComment(generalState.comment);

        this._resetUISelection({normalizedRanges: generalState.highlightSelection});
        changedDependencyNames.add('highlightSelection');

        let animationDependencies = this._getAnimationStateChanges(animationState);
        for(let item of animationDependencies)
            changedDependencyNames.add(item);
        this._animationState = animationState;
        this.pause();

        this._stateChangeHandler(...changedDependencyNames); // calls this._uiSetState();

        // If the closest state and the requested state differ, we should
        // inform the user:
        // The requested design space coordinates are not part of the
        //  The animation will continue from a different location


        // First build the base AnimationStateKeyFrames
        // Each of the applicable (registered) axes, if not specified, go
        // to their default values.
        // Now we can get the animation t using the closest point function
        //
        // Now we see for the base how close we are to the requested state
        //
        //
        // If theres one or more moar axes:
        //      prefer the ones with none-default values
        //      pick the first (by their ordering mechanism)
        //      For the moar animation state, throw away the rest (if there's any)
        //      get the t for the
        return true;
    }

    getProofStateForSerialization(proofTag) {
        let dependencies = PROOF_STATE_DEPENDENCIES[proofTag]
          , values  = []
          ;
        for(let proofDependency of dependencies) {
            let element = this._ui[proofDependency];
            if(proofDependency === 'fontName')
                // This is stored in the general state already
                // it also is not an item in this._ui.
                continue;
            if(!element)
                throw new Error(`Dependency element not found for: ${proofDependency}`);
            let type = element.tagName === 'SELECT'
                    ? 'select'
                    : element.type.toLowerCase();
            if(element.disabled) {
                values.push(null);
                continue;
            }
            switch(type) {
                case "checkbox":
                     values.push(element.checked);
                     break;
                case "select":
                    values.push(element.value);
                    break;
                case "text":
                    values.push(element.value.trim());
                    break;
                default:
                    throw new Error(`NOT IMPLEMENTED serialize input type "${element.type}".`);
            }
        }
        return values;
    }

    _deserializeProofState(proofTag, items_) {
        console.log('_deserializeProofState', proofTag,  PROOF_STATE_DEPENDENCIES[proofTag]
                    , '::', items_);
        let dependencies = PROOF_STATE_DEPENDENCIES[proofTag]
                    .filter(name=>name!=='fontName')
          , messages = {}, values = {}
          , items = items_.map(decodeURIComponent)
          ;
        for(let i=0, l=Math.min(dependencies.length, items.length);i<l;i++) {
            let proofDependency = dependencies[i]
              , valueStr = items[i]
              , element = this._ui[proofDependency]
              , value, message
              ;
            if(!element)
                throw new Error(`Dependency element not found for: ${proofDependency}`);
            let type = element.tagName === 'SELECT'
                    ? 'select'
                    : element.type.toLowerCase()
                    ;
            switch(type) {
                case "checkbox":
                    if(valueStr === '0')
                        value = false;
                    else if(valueStr === '1')
                        value = true;
                    else if(valueStr === ''){
                        /*pass: was disabled on serialization */
                    }
                    else
                        message = `${proofDependency}: Expected "0" or "1" as `
                                + `a symbol for a boolean but got "${valueStr}".`;
                    break;
                case "select":
                    let selectable = new Set([...element.getElementsByTagName('option')]
                                                        .map(option=>option.value));
                    if(selectable.has(valueStr))
                        value = valueStr;
                    else if(valueStr === ''){
                        /*pass: was disabled on serialization */
                    }
                    else
                        message = `${proofDependency}: Value not selectable "${valueStr}".`;
                    break;
                case "text":
                    value = valueStr;
                    break;
                default:
                    throw new Error(`NOT IMPLEMENTED deserialize input type "${element.type}".`);
            }
            if(message !== undefined)
                messages[proofDependency] = message;
            if(values !== undefined)
                values[proofDependency] = value;
        }
        return [values, messages];
    }
}

function _disableElement(element) {
    element.disabled = true;
    element.classList.add('input-disabled');
}

function _enableElement(element){
    element.disabled = false;
    element.classList.remove('input-disabled');
}

function _serializeListOfStr(strings) {
    return strings.map(encodeURIComponent).join(',');
}
function _deserializeListOfStr(string) {
    let message;
    return [string.split(',').map(decodeURIComponent), message];
}

function axisTagCompare(a, b) {
    if(a === b)
        return 0;
    // registered axes in order first
    let ai = REGISTERED_AXES_ORDERED.indexOf(a)
      , bi = REGISTERED_AXES_ORDERED.indexOf(b)
      ;
    if(ai !== -1 && bi === -1)
        return -1;
    if(ai === -1 && bi !== -1)
        return 1;
    if(ai !== -1 && bi !== -1)
        return ai - bi;
    // both -1, lowecase before uppercase
    let aIsUpper = a.toUpperCase() === a
      , bIsUpper = b.toUpperCase() === b
      ;
    if(!aIsUpper && bIsUpper)
        return -1;
    if(aIsUpper && !bIsUpper)
        return 1;
    // alphabetically
    return a.localeCompare(b, 'en');
}

function _serializeAxisLocations(axisLocations) {
        // Using map also removes duplicate entries, but there shouldn't be any.
    let axisLocationsMap = new Map(axisLocations)
      , keys = Array.from(axisLocationsMap.keys())
      ;
    keys.sort(axisTagCompare);
    // opsz13,wght300,wdth500,xtra412
    return keys.map(k=> `${k}${axisLocationsMap.get(k)}`).join(',');
}

function _deserializeAxisLocations(string) {
    // TODO: if parseFloat creates a NaN we should
    //      a) filter
    //      b) create a message
    let result = []
      , removedTags = []
      , message
      ;
    for(let axisLoc of string.split(',')) {
        let axisTag = axisLoc.slice(0, 4)
          , axisValueStr = axisLoc.slice(4)
          , axisValue = parseFloat(axisValueStr)
          ;
        if(isNaN(axisValue))
            removedTags.push([axisTag, axisValueStr]);
        else
            result.push([axisTag, axisValue]);
    }
    if(removedTags.length)
        message = `Can't parse axis locations for: ${removedTags.map(([k, v])=> k + ': ' + v).join(', ')}`;
    return [result, message];
}

function _serializeDate(date) {
    // removing miliseconds, too much precision
    return `${date.toISOString().slice(0, -5)}Z`;
}
function _deserializeDate(string) {
    // Put back miliseconds to make sure each implementation can parse the
    // correct iso date...
    // TODO: if Date.parse creates a NaN we must
    //     a) not return a data
    //     b) create a message
    let date =  Date.parse(string.slice(0,-1) + '.000Z')
      , message
      ;
    if(isNaN(date)){
        date = undefined;
        message = `Can't parse date from string: ${string}`;
    }
    return [date, message];
}

// colors like #aa1144 can be shortened to #a14
function _shortenColor(rawColor) {
    if(rawColor.length === 6) {
        let packed = [];
        for(let i=0,l=rawColor.length;i<l;i+=2) {
            if(rawColor[i] !== rawColor[i+1])
                break;
            packed.push(rawColor[i]);
        }
        // if all pairs were equal
        if(packed.length === (rawColor.length/2))
            return packed.join('');
    }
    return rawColor;
}

function _serializeRGBColor(color) {
    let c = color.slice(1)  // remove the hash;
                 .toUpperCase(); // normalize
    return _shortenColor(c);
}

function _serializeRGBColors(colors) {
   colors = colors.map(_serializeRGBColor)
        .map((c, i)=>{
            let defaultColor = COLOR_DEFAULTS[i];
            if(defaultColor &&
                    _shortenColor(c) === _shortenColor(defaultColor)
                    || c === defaultColor)
                // default foreground or background
                return '';
            return c;
        });
    // remove from tail
    while(colors[colors.length-1] === '')
        colors.pop();
    return _serializeListOfStr(colors);
}

// One or more of 0123456789ABCDEF.
// From first to last.
// Case insensitive.
const HEX_DIGITS_REGEX = /^[0123456789ABCDEF]+$/i;

function _deserializeRGBColor(color) {
    let  messageFormat = color=> `The specified color value "${color}" does `
            + 'not conform to the required format. The format is "#rrggbb" '
            + 'or "#rgb" where r, g, b are single-digit hexadecimal numbers.';
    color = color.toUpperCase();
    // check only hex-digit-chars
    if(color.match(HEX_DIGITS_REGEX) === null)
        return [undefined, messageFormat(color) + ' (not hex digits)'];
    if(color.length === 6) {
        // pass
    }
    else if(color.length >= 3 && color.length <= 4) {
        let expand = [];
        for(let c of color)
            expand.push(c, c);
        color = expand.join('');
    }
    // missmatch in length!
    // note, the used color inputs allow only rgb
    else
       return [undefined, messageFormat(color)+ ` (wrong length ${color.length})`];
    return [color, undefined];
}

function _deserializeRGBColors(string) {
    let [colors, message] = _deserializeListOfStr(string)
      , messages = []
      , _setDefaults = (...colorsItems)=> {
            for(let i=0,l=COLOR_DEFAULTS.length;i<l;i++){
                if(colorsItems[i] === '' || colorsItems[i] === undefined)
                    colorsItems[i] = COLOR_DEFAULTS[i];
            }
            return colorsItems;
        }
      ;
    colors = _setDefaults(...colors); // Set fallbacks and Don't provoke messages where defaults are in place.
    if(message)
        return [colors, message];


    [colors, messages] = [...zip(...colors.map(_deserializeRGBColor))];
    colors = _setDefaults(...colors); // Set defaults as fallbacks.
    messages = messages.filter(m=>!!m);
    if(messages.length)
        message = messages.join('\n');
    return [colors.map(c=>`#${c}`), message];
}

function _decodeURIComponent(str) {
    let message;
    return [decodeURIComponent(str), message];
}


// The Order in PROOF_STATE_DEPENDENCIES is crucially important to never change ever!
// Appending new entries is OK. This is because externally stored
// state links rely on this order and changing it would invalidate these
// links.
const PROOF_STATE_DEPENDENCIES = {
        //"_uiUpdateProofContents" => selectLayout/proofFormatTag
            // this controls the below.

        // this must be serialized
        //              deserilized
        //              used to update the current proof, when changed

        // needs fontName to dial in the glyph widths...the
        //    the UI-Element is actually selectFonts, but that one, we may
        //    rather get from animation state font-name ...
        "GRID": ['fontName', 'selectGlyphs', 'showExtendedGlyphs']
      , "TYPE_YOUR_OWN": ['customText', 'showExtendedGlyphs' /*(future: a boolean option: "avoid line breaks" that defaults to true*/]
      , "CONTEXTUAL": ['fontName', 'contextualPadMode', 'showExtendedGlyphs', 'selectGlyphs', 'contextualPadCustom']
      , "TYPESPEC": []
    }
    // These are intended to be turned on/off per proof, they don't
    // necessarily cary state for serialization themselves, but e.g.
    // animation controls (play/pause etc.)
  , VIDEPROOF_UI_DEPENDENCIES = ['keyframesdDisplayContainer', 'moarAxesDisplay'
                , 'animationControls', 'animationDurationContainer', 'aniparams'
                , 'selectGlyphsContainer']
  , PROOF_UI_DEPENDENCIES = {
        "GRID": [...PROOF_STATE_DEPENDENCIES.GRID, ...VIDEPROOF_UI_DEPENDENCIES]
      , "TYPE_YOUR_OWN": [...PROOF_STATE_DEPENDENCIES.TYPE_YOUR_OWN, ...VIDEPROOF_UI_DEPENDENCIES]
      , "CONTEXTUAL": [...PROOF_STATE_DEPENDENCIES.CONTEXTUAL, 'contextualPadModeContainer'
                      , 'contextualPadCustomContainer', ...VIDEPROOF_UI_DEPENDENCIES]
      , "TYPESPEC": [...PROOF_STATE_DEPENDENCIES.TYPESPEC]
    }
    ;

const GENERAL_STATE_STRUCTURE = [
    // 0. Comment time and date.
    // 1. Version of font (we use array of srings [fontName, version])
    // 2. Designspace location (we custom order by axes tags in here, array of [str axisTag, Number(parseFLoat) axisLocation])
    // 3. Proof format (sub format depending on the proof widget)
    // 4. str Comment
    // 5. serialize the browser select API state Custom string highlight
    //    maybe this must also live in the Proof format, if it's special how
    //    to select within the proof.
        //           date => str     str => date
        ['dateTime', _serializeDate, _deserializeDate]
      , ['fontParticles', _serializeListOfStr, _deserializeListOfStr]
      , ['axisLocations', _serializeAxisLocations, _deserializeAxisLocations]
      , ['proofFormatTag', encodeURIComponent, _decodeURIComponent]
      , ['comment',  encodeURIComponent, _decodeURIComponent]
      , ['colors', _serializeRGBColors, _deserializeRGBColors]
        // Not implemented
                    // mergedPathsRanges => str    str => pathsRanges
      , ['highlightSelection', serializePathRanges, deserializePathRanges]
];
    /** the serialize functions get as second argument a function:
     * addExtended(type, value) => pointer (i.e. index into the extended array)
     * and similarly, the the deserialize function is called with a second
     * argument getExtended(type, pointer)
     * Extended structures are separated by the ampersand '&' hence that
     * must not be be part of the returned string.
     */
    // , _EXTENDED: {
    //   }


