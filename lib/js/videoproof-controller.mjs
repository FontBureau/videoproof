/* jshint esversion: 8, browser: true, unused:true, undef:true, laxcomma: true, laxbreak: true */
import opentype from '../../opentype.js/dist/opentype.module.js';

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
};

export class VideoproofController {
    /**
     * contentWindow: a DOM.window that will contain the page content, i.e.
     * the proofs, where the font's are applied, it can be different to the
     * uiWindow, which holds the main controller UI.
     */
    constructor(contentWindow) {
        this.contentWindow = contentWindow;
        this._fonts = new Map();
        if(contentWindow.remoteFonts && Array.isArray(contentWindow.remoteFonts))
            this.loadFontsFromUrls(...contentWindow.remoteFonts);
        // `push` is the only valid API for window.remoteFonts:
        contentWindow.remoteFonts = {push: (...urls)=>this.loadFontsFromUrls(...urls)};
    }

    async _loadFont(fontBuffer, origin, document) {
        let fontFace = new document.defaultView.FontFace('LOADING', fontBuffer)
          , fontObject = opentype.parse(fontBuffer)
          , font = new VideoProofFont(fontObject, fontFace, origin, document)
          ;
        if(this._fonts.has(font.fullName))
            // TODO: this could be resolved by entering a loop that alters
            // font.fullName until the name is free, the font object should
            // have a method to i.e. add a counter to fullName.
            throw new Error(`FONT ALREADY REGISTERED: ${font.fullName}`);

        fontFace.family = font.fullName;
        await document.fonts.add(fontFace);
        this._fonts.set(font.fullName, font);
    }

    async loadFontFromUrl(url) {
        let { fetch, document } = this.contentWindow
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
        return this._loadFont(fontBuffer, origin, this.contentWindow.document);
    }

    async loadFontsFromUrls(...urls) {
        return Promise.all(urls.map(url=>this.loadFontFromUrl( url )))
               .catch(error => console.error(error));
    }

    // runs when the ui can be build
    initUI(mainUIElement) {
        mainUIElement.textContent = "I'm alive!";
        _makeFileInput(files=>Array.from(files)
                .map(file=>this.loadFontFromFile(file)), mainUIElement)
    }
}
