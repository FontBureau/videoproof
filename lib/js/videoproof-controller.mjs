/* jshint esversion: 8, browser: true, unused:true, undef:true, laxcomma: true, laxbreak: true */
import opentype from '../../opentype.js/dist/opentype.module.js';

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

const REGISTERED_AXES = ['opsz', 'wdth', 'wght']; //, 'ital', 'slnt', 'grad', 'GRAD');
function* calculateKeyframes(axisRanges) {

    var axesMDM = []; // min-default-max
    var axesOrder = [];
    // var axisRanges = (typeof rapBracket === 'object')
    //     // FIXME: rapBracket, rapTolerances are global
    //     ? axisRangesForRapBracket(currentFont.axes, rapBracket, rapTolerances)
    //     : currentFont.axes
    //     ;


    console.log('axisRanges:', axisRanges);

    // FIXME: registeredAxes is global
    for(let axis of REGISTERED_AXES) {
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

    //var fvsPerms = []
    //  , prev
    //  ;

    for(let axesValues of cartesianProductGen(axesMDM)) {
        yield zip(axesOrder, axesValues);

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


function _getFontAxisRanges(font) {
    let axisRanges = {};
    if ('fvar' in font.tables && 'axes' in font.tables.fvar) {
        for (let axis of font.tables.fvar.axes) {
            axisRanges[axis.tag] = {
                'name': 'name' in axis ? axis.name.en : axis.tag,
                'min': axis.minValue,
                'max': axis.maxValue,
                'default': axis.defaultValue
            };
        }
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

function* animationGenerator(performance, keyFrames, duration) {
    let t = 0
      , lastExecution = performance.now()
        // in milli seconds, this can be changed dynamically
        // original default is 1000ms * keyFrames.length * 2
      , newT, newDuration
      ;

    // got to start somewhere
    yield [keyFrames[0], 0, 0, 0, 0];
    // run forever
    while(true) {
        let fps = 0;
        if(newT !== undefined) {
            // newT can be used to jump to a new position or to resume
            // animation after a pause.
            t = newT % 1;
        }
        else {
            let frameTime = performance.now() - lastExecution
                // Need miliseconds, hence duration times 1000.
              , frameTimeFraction =  frameTime / (duration * 1000)
              ;
            fps = 1000 / frameTime;
            t = (t + frameTimeFraction) % 1; // 0 >= t < 1
        }
            // we also animate from keyFrames.length - 1 to 0,
        let keyFramesPosition = keyFrames.length * t // float: 0 >= keyFramesPosition < keyFrames.length
          , fromKeyFrameIndex = Math.floor(keyFramesPosition) // int: 0 >= fromKeyFrameIndex < keyFrames.length-1
          , toKeyFrameIndex = fromKeyFrameIndex < keyFrames.length - 1
                            ? fromKeyFrameIndex + 1
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
        ({ t: newT, duration: newDuration } = yield [frame, t, fromKeyFrameIndex, keyFrameT, fps]);
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
// the fonts that are built into the app and registerd in window.remoteFonts.
class FontOriginUrl extends FontOrigin {
    constructor(url) {
        super();
        this._url = url;
    }
    get type () {
        return 'from-url';
    }
    get fileName() {
        // CAUTION: simple split on "/" may not be sufficient!
        return this._url.split('/').pop();
    }
    valueOf() {
        return `${this.type}::${this._url}`;
    }
}

class FontOriginFile extends FontOrigin {
    constructor(fileName) {
        super();
        this._fileName = fileName;
    }
    get type () {
        return 'from-file';
    }
    get fileName() {
        return this._fileName;
    }
    valueOf() {
        return `${this.type}::${this._fileName}`;
    }
}

// To keep all knowledge and resources of a font in one place.
class VideoProofFont {
    constructor(fontObject, fontFace, orgin, document) {
        this._fontObject = fontObject;
        this._fontFace = fontFace;
        this._orgin = orgin;
        this._document = document;
    }

    get fontObject(){
        return this._fontObject;
    }

    // This is used as a unique id of the font within the app and
    // as the CSS-name.
    get fullName() {
        let getName = key=>{
            // default to "en"
            let entry = this._fontObject.tables.name[key]
              , defaultLang = 'en'
              ;
            if(defaultLang in entry)
                return entry[defaultLang];
            // Otherwise, just return the entry of the first key.
            for(let lang of Object.keys(entry))
                return entry[lang];
        };

        // getting sometimes
        //      DOMException: FontFace.family setter: Invalid font descriptor
        //
        // A well working example is: "from-url RobotoFlex Regular Version_2-136"
        return [
                 this._orgin.type
               , getName('fullName') // e.g. "RobotoFlex Regular"
                 // "Version 2.136" is not accepted here while
                 // "Version_2-136" is OK, seems like the "." (dot)
                 // is forbidden and the space before numbers as well.
                 // It's likely this needs more fixing in the future!
               , getName('version').replaceAll('.', '-').replaceAll(' ', '_')
               ].join(' ');
    }

    // release resources
    destroy() {
        this._document.fonts.delete(this._fontFace);
    }
}

function _makeFileInput (handleFiles, element) {
    // In this case, the input element is not even appended into the
    // document, we use it just for the browser native interface.
    var hiddenFileInput = element.ownerDocument.createElement('input');
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
    function noAction(e) {
        e.stopPropagation();
        e.preventDefault();
    }
    function drop(e) {
        e.stopPropagation();
        e.preventDefault();
        handleFiles(e.dataTransfer.files);
    }

    hiddenFileInput.addEventListener('change', fileInputChange);
    element.addEventListener('click', forwardClick);
    element.addEventListener("dragenter", noAction);
    element.addEventListener("dragover", noAction);
    element.addEventListener("drop", drop);
}

export class VideoproofController {
    /**
     * contentWindow: a DOM.window that will contain the page content, i.e.
     * the proofs, where the font's are applied, it can be different to the
     * uiWindow, which holds the main controller UI.
     */
    constructor(contentWindow) {
        this._contentWindow = contentWindow;
        this._mainUIElement = null;
        this._fonts = new Map();
        if(contentWindow.remoteFonts && Array.isArray(contentWindow.remoteFonts))
            this.loadFontsFromUrls(...contentWindow.remoteFonts);
        // `push` is the only valid API for window.remoteFonts:
        contentWindow.remoteFonts = {push: (...urls)=>this.loadFontsFromUrls(...urls)};
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

        fontFace.family = font.fullName;
        await contentDocument.fonts.add(fontFace);
        this._fonts.set(font.fullName, font);
        this.applyLatestFont();
    }

    async loadFontFromUrl(url) {
        let { fetch, document } = this._contentWindow
          , origin = new FontOriginUrl(url)
          , response = await fetch(url, {
                method: 'GET',
                // mode: 'cors', // no-cors, *cors, same-origin
                // cache: 'no-cache', // *default, no-cache, reload, force-cache, only-if-cached
                // redirect: 'follow', // manual, *follow, error
                // referrerPolicy: 'no-referrer', // no-referrer, *no-referrer-when-downgrade, origin, origin-when-cross-origin, same-origin, strict-origin, strict-origin-when-cross-origin, unsafe-url
            });

        if (!response.ok)
            throw new Error(`HTTP error! Status: ${ response.status }`);
        let fontBuffer = await response.arrayBuffer();
        return this._loadFont(fontBuffer, origin, document);
    }

    async loadFontFromFile(file) {
        let origin = new FontOriginFile(file.name)
          , fontBuffer = await file.arrayBuffer()
          ;
        return this._loadFont(fontBuffer, origin, this._contentWindow.document);
    }

    async loadFontsFromUrls(...urls) {
        return Promise.all(urls.map(url=>this.loadFontFromUrl( url )))
               .catch(error => console.error(error));
    }

    // runs when the ui can be build
    initUI(mainUIElement) {
        this._mainUIElement = mainUIElement;

        // TODO: Good drag and drop starting point!
        //_makeFileInput(files=>Array.from(files)
        //        .map(file=>this.loadFontFromFile(file)), mainUIElement);
        this.applyLatestFont();
    }

    // just temporal for bootstrapping, won't be used eventually
    async applyLatestFont() {
        let lastFontName = Array.from(this._fonts.keys()).pop();
        if(!lastFontName){
            console.warn('No last font available yet.');
            return;
        }
        // CAUTION: mainUIElement may not be in this._contentWindow
        // and hence wouldn't have CSS access to the fonts. But this is
        // just a fixed example without that issue.
        if(!this._mainUIElement) {
            console.warn('No ui element available yet.');
            return;
        }

        let doc = this._mainUIElement.ownerDocument
          , proof = doc.createElement('div')
          , status = doc.createElement('div')
          , axesInfo =  doc.createElement('div')
          , keyFramesContainer = doc.createElement('ol')
          ;

        proof.textContent = 'Here I am!';
        this._mainUIElement.append(keyFramesContainer, status, axesInfo, proof);

        // keyFramesContainer


        // apply base font styles
        proof.style.setProperty('font-family', lastFontName);

        // apply (maybe a class) for a font-variation-setttings rule
        // with css-custom properties
        const AXISNAME2PROPNAME = new Map([
                            ['wght', '--font-weight']
                          , ['opsz', '--font-opsz']
                          , ['wdth', '--font-width']
                    ])
          , fontVariationSettings = Array.from(AXISNAME2PROPNAME.entries())
                    .map(([axisName, propName])=> `"${axisName}" var(${propName})`)
                    .join(', ')
          ;
        proof.style.setProperty('font-variation-settings'
                                                , fontVariationSettings);

        // create a generator that samples through the animation space ...

        // keyFrames will be an argument of this
        let font = this._fonts.get(lastFontName)
          , axisRanges = _getFontAxisRanges(font.fontObject)
          , keyFrames = Array.from(calculateKeyframes(axisRanges)).map(x=>Array.from(x))
          ;
        for(let keyFrame of keyFrames) {
            let li = doc.createElement('li')
              , a = doc.createElement('span')
              ;
            li.append(a);
            // this would be a good rule for css
            li.style.setProperty('color', 'hsl(0, 100%, calc(50% * var(--keyframe-t, 0)))');
            a.textContent = keyFrame.map(([name, value])=>`${name} ${value}`).join(', ');
            keyFramesContainer.append(li);
        }

        let duration = keyFrames.length * 2
          , gen = animationGenerator(this._contentWindow.performance, keyFrames, duration);
        while(true) {
            let genControl = {
                // t: between 0 and < 1 (it's mod 1 anyways)
                //      to go to the sevensth (index = 6) keyframe:
                //      t: 6 / keyframes.length
                // duration: in seconds
                //      for 30 seconds duration for one loop
                //      duration: 30
            };
            let genReturn = gen.next(genControl);
            if(genReturn.done)
                break;
            let [frame, t, fromKeyFrameIndex, keyFrameT/*, fps */] =  genReturn.value
              , beforeKeyframeIndex = fromKeyFrameIndex === 0
                                            ? keyFrames.length - 1
                                            : fromKeyFrameIndex - 1
              , toKeyFrameIndex = fromKeyFrameIndex === keyFrames.length - 1
                                    ? 0
                                    : fromKeyFrameIndex + 1
              ;

            keyFramesContainer.children[beforeKeyframeIndex]
                        .style.setProperty('--keyframe-t', '');
            keyFramesContainer.children[fromKeyFrameIndex]
                        .style.setProperty('--keyframe-t', 1 - keyFrameT );
            keyFramesContainer.children[toKeyFrameIndex]
                        .style.setProperty('--keyframe-t', keyFrameT);

            status.textContent = ` -- ${Math.round(t * 100)} % i:${fromKeyFrameIndex} -- `;
            axesInfo.textContent = frame.map(([name, value])=>`${name} ${Math.round(value)}`).join(', ');

            for(let [axisName, value] of frame) {
                let propName = AXISNAME2PROPNAME.get(axisName);
                proof.style.setProperty(propName, value);
            }
            let animationFrameRequestId
              , promise = new Promise((resolve)=>{ // jshint ignore:line
                    animationFrameRequestId = window.requestAnimationFrame(resolve);
                })
              ;
            await promise;
        }
    }
}
