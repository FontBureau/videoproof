/* jshint esversion: 11, browser: true, unused:true, undef:true, laxcomma: true, laxbreak: true, devel: true */

import { deepFreeze } from '../util.mjs';

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
export class FontOrigin {
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
export class FontOriginUrl extends FontOrigin {
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

export class FontOriginFile extends FontOrigin {
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
export class VideoProofFont {
    constructor(fontObject, fontFace, origin, document) {
        this._document = document;
        Object.defineProperties(this, {
            fontObject: {value: fontObject, writable: false, enumerable: true}
          , fontFace: {value: fontFace, writable: false, enumerable: true}
          , origin: {value: origin, writable: false, enumerable: true}
        });
        this._axisRangesCache = null;
        this._instancesCache = null;
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

        // "Version 2.136" is not accepted here while
        // "Version_2-136" is OK, seems like the "." (dot)
        // is forbidden and the space before numbers as well.
        //
        // "27.0d21e1" becomes "27-0d21e1" but it's not accepted as the
        // word starts with a number, so we prepend Version_ in that case
        // and make it eventually "Version_27-0d21e1"
        //
        // It's likely this needs more fixing in the future!
        let version = this._getName('version').replaceAll('.', '-').replaceAll(' ', '_')
                            // semicolon breaks CSS selecting the family.
                            .replaceAll(';', ' ');
        // Must match on beginning (^) A-Z case insensitive (i)
        if(!version.match(/^[A-Z]/i))
            version = `Version_${version}`;
        return [
                 this.origin.type
               , this._getName('fullName') // e.g. "RobotoFlex Regular"
               , version
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

    get instances() {
        if(!this._instancesCache ) {
            let instances = this.fontObject.tables?.fvar?.instances || []
              , instancesList = []
              ;
            for(const {name, coordinates} of instances) {
                const usedName = 'en' in name
                        ? name.en
                        : Object.entries(name)[1] // language is at [0]
                        ;
                instancesList.push([usedName, Object.assign({}, coordinates)]);
            }
            Object.defineProperty(this, '_instancesCache', {
                value: deepFreeze(instancesList)
            });
        }
        return this._instancesCache;
    }

    // release resources
    destroy() {
        this._document.fonts.delete(this.fontFace);
    }
}
