/* jshint esversion: 11, browser: true, unused:true, undef:true, laxcomma: true, laxbreak: true, devel: true */
import opentype from '../../opentype.js/dist/opentype.module.js';
import {  normalizeRanges, mergePathRanges, getFullPathsFromRanges
       , normalizePathsRanges, serializePathRanges, deserializePathRanges
       , markupSelectionInline, markupSelectionStructureSave
       , clipAndFilterRanges
       } from './text-selection.mjs';

import woff2decompress from './wawoff2/decompress.mjs';

import {init as initExample} from './layouts/exmple.mjs';

import DOMTool from './domTool.mjs';

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

// For a more broadly useable tool, this should probaly be configurable per font.
// however 3 axes with each 3 (default, min, max) entries produces 3 * 3 * 3 = 27 keyframes
const REGISTERED_AXES_ORDERED = ['opsz', 'wdth', 'wght']; //, 'ital', 'slnt', 'grad', 'GRAD');


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
                value: _deepFreeze(instancesList)
            });
        }
        return this._instancesCache;
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

function _mapGetOrInit(map, name, init) {
    let result = map.get(name);
    if(result === undefined) {
        result = init();
        map.set(name, result);
    }
    return result;
}

class _UIBase{
    uiEnable () {
        throw new Error(`NOT IMPLEMENTED: ${this.constructor.name}.uiEnable!`);
    }
    uiDisable () {
        throw new Error(`NOT IMPLEMENTED: ${this.constructor.name}.uiDisable!`);
    }
}

class UIManualAxisLocations extends _UIBase {
    // Order of the legacy variable type tools app appearance,
    // which actually uses the order of axis as in the font.
    // However, the axis order seems  to have changed and the order
    // seen in the app seems more intuitive to use, so here comes a
    // custom order, also, these axes displayed when "View all axes"
    // is not checked.
    static REGISTERED_AXES_ORDERED = ['wght', 'wdth', 'opsz', 'ital', 'slnt', 'grad', 'GRAD']; //jshint ignore:line

    constructor (parentAPI, domTool, element, requiresUpdateDependencies) {
        super();
        this._parentAPI = parentAPI;
        this._domTool = domTool;
        this._state = undefined;
        this.active = false;
        this.element = element;
        this.requiresUpdateDependencies = new Set(requiresUpdateDependencies);
        this._value = new Map();
        this._axesInterfaces = new Map();
        this._autoOPSZInput = null;
        this._viewAllAxes = null;
        this._styleSelect = null;
    }

    get opszIsAuto() {
        return this._axesInterfaces.has('opsz') && this._autoOPSZInput.checked;
    }

    static copyValue(valueArray) {
        return valueArray.map(([axisTag, axisValue])=>[axisTag, Object.assign({}, axisValue)]);
    }

    static CUSTOM_STYLE_VALUE = 'custom'; //jshint ignore:line

    _newStyleSelect() {
        let container = this._domTool.createElementfromHTML('label', {}
                        , `Style: <select><select/>`);
        return {
            container: container
          , input: container.querySelector('select')
          , _domTool: this._domTool
          , _instances: []
          , _locationsIndex: new Map()
          , setInstances(instances) {
                this._instances = instances;
                // instances = this._parentAPI.getFont().instances
                const makeOption = (value, label)=>this._domTool
                                .createElement('option', {value}, label)
                  , options = []
                  ;

                if(instances.length)
                    this.container.style.removeProperty('display');
                else
                    this.container.style.display = 'none';


                options.push(makeOption(
                    UIManualAxisLocations.CUSTOM_STYLE_VALUE, '(custom value)'));

                this._locationsIndex.clear();

                for(const [i, [name, locations]] of instances.entries()) {
                    const key = this._locationsToKey(locations);
                    this._locationsIndex.set(key, i);
                    options.push(makeOption(i, name));
                }
                this._domTool.clear(this.input);
                this.input.append(...options);
                this.input.value = UIManualAxisLocations.CUSTOM_STYLE_VALUE;
            }
          , get value() {
                return this._getCurrentLocations();
            }
          , set value(locations) {
                this.input.value = this._getInstanceValueForLocations(locations);
            }
          , remove: function(){
                this.container.remove();
            }
          , _locationsToKey(locations) {
                return Object.entries(locations)
                            .sort(([tagA], [tagB])=>{
                                   if (tagA < tagB)
                                        return -1;
                                    if (tagA > tagB)
                                        return 1;
                                    return 0;
                            })
                            .map(([axisTag, val])=>`${axisTag}:${val}`)
                            .join(';')
                            ;
            }
          , _getCurrentLocations() {
                if(this.input.value === UIManualAxisLocations.CUSTOM_STYLE_VALUE)
                    return undefined;
                return this._instances[this.input.value]?.[1];
            }
          , _getInstanceValueForLocations(locations) {
                const key = this._locationsToKey(locations)
                  , value = this._locationsIndex.get(key)
                  ;
                return value !== undefined
                                ? value
                                : UIManualAxisLocations.CUSTOM_STYLE_VALUE
                                ;
            }
        };
    }

    _styleSelectChangeHandler(/*event*/){
        const locations = this._styleSelect.value;
        if(!locations)
            return;
        for(let [axisTag, location] of Object.entries(locations))
            this._value.get(axisTag).location = location;
        this._updateUI(`AXIS_CHANGE@style`);
        this._parentAPI.stateChangeHandler();
    }

    _updateStyleSelectOptions() {
        const instances = this._parentAPI.getFont().instances;
        this._styleSelect.setInstances(instances);
    }

    update(...changedDependencyNames) {
        console.log('UIManualAxisLocations.update', ...changedDependencyNames);
        let dependencies = new Set(changedDependencyNames)
          , changed = false
          ;

        if(dependencies.has('fontSize') && this.opszIsAuto) {
            // FIXME: setting an axis value could be a method!
            let value = this._parentAPI.getFontSize();
            this._axesInterfaces.get('opsz').value = value;
            const axisValue = this._value.get('opsz');
            axisValue.location = value;
            axisValue.autoOPSZ = true;
            changed = true;
        }
        if(dependencies.has('fontName')) {
            this._updateStyleSelectOptions();
            changed = true;
        }
        return changed;
    }
    // FIXME: value needs to be more complex, e.g. OPSZ can be toggled
    // to use the same as font-size. It would be nice to hace it disabled
    // then, but show the used font-size.
    // Similarly, other axes should be set to "explicit-default" or
    // manual, otherwise we can't determine if the dialed in value is
    // meant to be explicit when it is also the default value. However,
    // in this case, it's maybe sufficient to just use exlicit-default mode
    // when it is the same value.
    get value() {
        // Intended is to return just a readable, hence the deepFreeze,
        // view of the value, the copy, via Object.assign,
        // is made because that way the
        // internal value is still readable. It's also not a
        // live-value-changing semantic.
        return _deepFreeze(this.constructor.copyValue(Array.from(this._value)));
    }
    set value(val) {
        if(!Array.isArray(val)) {
            // don't accept nothing
            throw new Error(`TYPE ERROR: manualAxisLocations set value is not an Array! Should be something! SET BETTER DEFAULTS: ${val}`);
        }
        else
            this._value = new Map(this.constructor.copyValue(val));
        this._initUI();
    }

    uiEnable() {
        this._state = 'enabled';
        this.active = true;
        this._parentAPI.insertElement(this.element);
        for(const axisUI of this._axesInterfaces.values())
            axisUI.uiEnable();
    }
    uiDisable() {
        this._state = 'disabled';
        this.active = false;
        DOMTool.removeNode(this.element);
        for(const axisUI of this._axesInterfaces.values())
            axisUI.uiDisable();
    }

    _axisChangeHandler(axisTag) {
        const axisValue = this._value.get(axisTag);
        axisValue.location = this._axesInterfaces.get(axisTag).value;
        this._updateUI(`AXIS_CHANGE@${axisTag}`);
        this._parentAPI.stateChangeHandler();
    }

    _setAutoOPSZ(autoOPSZ) {
        if(!this._value.has('opsz'))
            return;
        if(autoOPSZ === undefined)
            autoOPSZ = true;
        let axisUI = this._axesInterfaces.get('opsz')
          , axisValue = this._value.get('opsz')
          ;
        if(!autoOPSZ) {
            axisUI.passive = false;
            axisValue.autoOPSZ = false;
            this._autoOPSZInput.checked = false;
        }
        else {
            axisUI.passive = true;
            axisValue.autoOPSZ = true;
            this._autoOPSZInput.checked = true;
            let value = this._parentAPI.getFontSize();
            axisUI.value = value;
            axisValue.location = value;
        }
    }

    _autoOPSZChangeHandler(/*event*/) {
        this._setAutoOPSZ(this._autoOPSZInput.checked);
        this._updateUI(`AXIS_CHANGE@autoOPSZ`);
        this._parentAPI.stateChangeHandler();
    }

    _newCheckbox(label) {
        let container = this._domTool.createElementfromHTML('label', {}
                        , `<input type="checkbox" /> ${label}`);
        return {
            container: container
          , input: container.querySelector('input')
          , get checked(){
                return this.input.checked;
            }
          , set checked(val){
                this.input.checked = !!val;
            }
          , remove: function(){
                this.container.remove();
            }
          , setDisplay(show) {
                if(show)
                    this.container.style.removeProperty('display');
                else
                    this.container.style.display = 'none';
            }
        };
    }

    _newAutoOPSZInput() {
        return this._newCheckbox('Mirror size changes');
    }

    _newViewAllAxes() {
        return this._newCheckbox('View all axes');
    }

    _toggleAxesDisplay() {
        const displayAll = this._viewAllAxes.checked
          , alwaysDisplayed = new Set(UIManualAxisLocations.REGISTERED_AXES_ORDERED)
          ;
        for(const [axesTag, input] of this._axesInterfaces.entries()) {
            if(alwaysDisplayed.has(axesTag))
                // Never hidden, must not be turned back on.
                continue;
            if(displayAll)
                input.element.style.removeProperty('display');
            else
                input.element.style.display = 'none';
        }
    }

    _initUI() {
        console.log('UIManualAxisLocations._initUI');
        const insertElement = element=>this.element.append(element);
        for(const axisUi of this._axesInterfaces.values())
            axisUi.destroy();
        this._axesInterfaces.clear();
        if(this._autoOPSZInput) {
            this._autoOPSZInput.remove();
            this._autoOPSZInput = null;
        }

        if(!this._styleSelect) {
            this._styleSelect = this._newStyleSelect();
            this._updateStyleSelectOptions();
            this._styleSelect.input.addEventListener('change', this._styleSelectChangeHandler.bind(this));
            insertElement(this._styleSelect.container);
        }

        if(!this._viewAllAxes) {
            // This is kind of internal state an currently not serialized or a dependency of something.
            this._viewAllAxes = this._newViewAllAxes();
            this._viewAllAxes.input.addEventListener('change', ()=>this._toggleAxesDisplay());
            insertElement(this._viewAllAxes.container);
        }

        const alwaysDisplayed = new Set(UIManualAxisLocations.REGISTERED_AXES_ORDERED)
          , locations = []
          ;
        let hasHiddenAxes = false
          , hasNonDefaultHiddenAxes = false
          ;
        for(const axisTag of [UIManualAxisLocations.REGISTERED_AXES_ORDERED, ...this._value.keys()]) {
            if(this._axesInterfaces.has(axisTag))
                //seen
                continue;
            if(!this._value.has(axisTag))
                // It's in REGISTERED_AXES_ORDERED but not in the font
                continue;

            const {name, min, max, step, location, 'default':defaultVal, autoOPSZ} = this._value.get(axisTag);

            if(!alwaysDisplayed.has(axisTag)){
                hasHiddenAxes = true;
                if(defaultVal !== location)
                    hasNonDefaultHiddenAxes = true;
            }

            if(axisTag === 'opsz') {
                this._autoOPSZInput = this._newAutoOPSZInput();
                this._autoOPSZInput.checked = autoOPSZ === undefined
                            ? true
                            : autoOPSZ
                            ;
                this._autoOPSZInput.input.addEventListener('change',
                                this._autoOPSZChangeHandler.bind(this));
            }
            const input = new UINumberAndRangeInput(
                    {
                        insertElement: insertElement
                      , enableElement: this._parentAPI.enableElement
                      , disableElement: this._parentAPI.disableElement
                      , stateChangeHandler: ()=>this._axisChangeHandler(axisTag)
                    }
                  , this._domTool, `axis-${axisTag}`, `${name} (${axisTag})`, undefined
                  , {min, max, step, value: (
                            axisTag === 'opsz' && this.opszIsAuto
                                ? this._parentAPI.getFontSize()
                                : location
                            )
                    }
                )
              ;
            if(axisTag === 'opsz') {
                insertElement(this._autoOPSZInput.container);
                if(this.opszIsAuto)
                    input.passive = true;
                locations[axisTag] = this._autoOPSZInput.checked
                                            ? defaultVal
                                            : parseFloat(input.value)
                                            ;
            }
            else
                locations[axisTag] = location;
            this._axesInterfaces.set(axisTag, input);
        }

        // Not sure if this automatic behavior will be annoying.
        // We could either not do it, ot save the toggle state along
        // with this._value.
        this._viewAllAxes.checked = hasNonDefaultHiddenAxes;
        this._toggleAxesDisplay();
        this._viewAllAxes.setDisplay(hasHiddenAxes);

        // FIXME: initUI should not manipulate the value!
        if(this._autoOPSZInput)
            this._setAutoOPSZ(this._autoOPSZInput.checked);

        this._styleSelect.value = locations;
    }

    _updateUI(via) {
        console.log('UIManualAxisLocations._updateUI via', via);
        const locations = {};
        for(const [axisTag, axisValue] of this._value.entries()) {
            const axisUI = this._axesInterfaces.get(axisTag);
            if(axisUI.value !== axisValue.location)
                axisUI.value = axisValue.location;
            if(axisTag === 'opsz') {
                this._setAutoOPSZ(axisValue.autoOPSZ);
                locations[axisTag] = axisValue.autoOPSZ === false
                            ? axisValue.location
                            : axisValue.default
                            ;
            }
            else
                locations[axisTag] = axisValue.location;
        }
        this._styleSelect.value = locations;
    }
}

// Keep for example with timeline (Multiple Targets=== multiple keyframes)...
class UIMultipleTargets extends _UIBase {

    isSynchronisationItem = true; // jshint ignore:line

    constructor(parentAPI, requiresUpdateDependencies) {
        super();
        this._parentAPI = parentAPI;

        this._states = null;  // this will hold the states array

        this.uiStateFields = null;
        this._uiStateFieldsSet = null;
        this.isActive = false; // will we use this ever?
        this._amountOfTargets = 0;
        this._activeTarget = 0;
        this.requiresUpdateDependencies = new Set(requiresUpdateDependencies);
    }

    get states () {
        // Would be better to return something immutable.
        return this._states;
    }

    // not sure if this will be required
    get value() { throw new Error(`NOT IMPLEMENTED getting value of multipleTargets.`); }
    set value(val) { throw new Error(`NOT IMPLEMENTED setting value of multipleTargets: ${val}`); }

    get activeState() {
        return this._states[this._activeTarget];
    }

    hasField(name) {
        return this._uiStateFieldsSet.has(name);
    }

    // FIXME: in this particular case e.g. when fontName chnages we should
    //        update (maybe newly initialized/initTargets) all states,
    //        also inactive ones, to contain the new font defaults, and
    //        then, the proof must be updated (but not newly initialized).
    setValue (name, value) {
        // This is interesting as we get informed about fontName changes
        // in here, but in the current version/use case we don't want to
        // set that value, but rather update all values according to a plan
        //
        // in dependency thinking, we could argue changing fontName should
        // trigger "initTargets" much more than this method, it's semantically
        // different! There, the `defaults` argument would change and
        // likely the other arguments would stay the same. So, it could be
        // split into two methods, on just to reset the defaults. It should,
        // however, happen at the same early stage as setValue.
        // Maybe this requires a new kind of dependency declaration...!T
        //
        // BUT WHERE and HOW?
        if(this.uiStateFields.indexOf(name) === -1)
            throw new Error(`KeyError "${name}" not in: ${this.uiStateFields.join(', ')}.`);
        // FIXME: add comparison for more complex values! (fontLeading, manualAxisLocations)
        const changed = this.activeState[name] !== value;
        if(changed)
            this.activeState[name] = value;
        return changed;
    }

    getValue (name) {
        if(this.uiStateFields.indexOf(name) === -1)
            throw new Error(`KeyError "${name}" not in: ${this.uiStateFields.join(', ')}.`);
        return this.activeState[name];
    }

    setActiveTarget(activeTarget) {
        // Collect current values at _activeTarget
        // (should rather be always up to date) and
        // save to this._states[this._activeTarget]..
        console.log('multipleTargets.setActiveTarget to:', activeTarget, 'was:', this._activeTarget, );
        this._activeTarget = activeTarget;
        this._parentAPI.stateChangeHandler();
    }

    getActiveTarget() {
        return this._activeTarget;
    }

    update(...changedDependencyNames) {
        if(!this._updateFunc)
            return;
        let defaults = this._updateFunc(...changedDependencyNames);
        if(defaults)
            return this._updateTargets(defaults);
    }

    _updateTargets(defaults) {
        const changedActiveFields = [];

        for(let i=0;i<this._amountOfTargets;i++) {
            let state = {};
            // if(!this.activeState || i !== this._activeTarget) {
            //     state = {}
            //     this._states[i] = state;
            // }
            // If it weren't about the Error, this loop could be just a
            // copy of the object:
            //    state[k] = Object.assign({}, defaults[i]);
            for(let k of this.uiStateFields) {
                if(!defaults[i] || !(k in defaults[i])) {
                // This is drastic, but a missing state or
                // e.g. a default like `null` that needs to
                // be handled specially is not really better.
                // But, a state field, like `manualAxisLocations`
                // could come with/be initialized with generic
                // default values, could be better than having
                // repeated empty defaults attached to the template.
                // Also, not sure the template should know how or
                // decide about values of external fields so much.
                    throw new Error(`Initial default value missing for target #${i} state field ${k}`);
                }
                const value = defaults[i][k];
                // this is also called on init, before there's an activeState
                if(this.activeState && i === this._activeTarget) {
                    let changed = this.setValue(k, value);
                    if(changed)
                        changedActiveFields.push(k);
                }
                //else
                    // CAUTION: is a reference if mutable,
                    // hence, defensive deepCopy here would be an option
                    // However, I prefer deepFreeze from the caller/owner
                    // of defaults as a workaround, it will raise much
                    // closer to where an actual copy is required.
                state[k] = value;
            }
            this.states[i] = state;
        }
        return changedActiveFields;
    }

    initTargets (amountOfTargets, uiStateFields, updateFunc, defaults) {
        if(!this.isActive)
            // Not so important, rather just to support
            // my own mental model of application
            // control flow.
            throw new Error('multipleTargets: Called init before uiEnable.');

        this._updateFunc = updateFunc;
        this.uiStateFields = Object.freeze(uiStateFields.slice());
        this._uiStateFieldsSet = new Set(this.uiStateFields);
        this._amountOfTargets = amountOfTargets;
        this._states = [];

        // that's like a reset
        this._updateTargets(defaults);
        // the target UIs will need to be updated!


        return this.states;
    }

    uiEnable () {
        if(this.isActive)
            // Rather important, as we must subscribe/unsubscribe
            // and if there's a subscription already, we should
            // not forget to unsubscribe from it.
            // However, unsubscription could be handled here
            // instead of throwing the error.
            throw new Error('multipleTargets.uiEnable called but is already active!');
        this.isActive = true;
    }

    uiDisable () {
        console.log('multipleTargets.uiDisable', this);
        this.uiStateFields = null;
        this._uiStateFieldsSet = null;
        this._states = null; // de-init here?
        this.isActive = false;
    }
}


const UI_NUMBER_AND_RANGE_INPUT_TEMPLATE = `<div
id='container'
class="number-and-range-input"
>
    <label for="range"><!-- insert: label --></label>
    <input type='number' id="number" size="3" /><!-- insert: unit -->
    <input type='range' id="range" />
</div>`;
class UINumberAndRangeInput extends _UIBase {
    constructor(parentAPI, domTool, baseID, label, unit, minMaxValueStep) {
        super();
        this._parentAPI = parentAPI;
        this._domTool = domTool;

        [this.element, this._inputs] = this._initTemplate(baseID, label, unit, minMaxValueStep);

        this._changeHandler = e=>{
            e.preventDefault();
            for(let input of this._inputs) {
                if(e.target === input) continue;
                // synchronize the other element(s)
                input.value = e.target.value;
            }
            this._parentAPI.stateChangeHandler();
        };

        for(let elem of this._inputs)
            // is not yet removed ever anymore...
            elem.addEventListener('input', this._changeHandler);
    }

    _initTemplate(baseID, label, unit, minMaxValueStep) {
        const fragment = this._domTool.createFragmentFromHTML(UI_NUMBER_AND_RANGE_INPUT_TEMPLATE)
          , CONTAINER_RAW_ID = 'container'
          , container = fragment.getElementById(CONTAINER_RAW_ID)
          ;
        this._domTool.insertAtMarkerComment(container, 'insert: label', label);
        if(unit) {
            this._domTool.insertAtMarkerComment(container, 'insert: unit', unit);
            // No-breaking-space as a separator, this will end up between
            // the marker comment and the actual unit.
            // FIXME: Should rather be done with CSS by putting the unit
            // into a span container, seems like the Nbsp doesn't prevent
            // the line from breaking anyways!
            this._domTool.insertAtMarkerComment(container, 'insert: unit', '\xA0');
        }
        for(const id of [CONTAINER_RAW_ID, 'number', 'range']) {
            const elem = fragment.getElementById(id);
            elem.id = `${baseID}_${id}`;
        }
        for(const label of container.querySelectorAll('label'))
            // htmlFor gets/sets the `for` attribute
            label.htmlFor = `${baseID}_${label.htmlFor}`;

        const inputs = Array.from(container.getElementsByTagName('input'));
        for(const [k,v] of Object.entries(minMaxValueStep)) {
            // all of min, max, step, value work as properties
            for(const elem of inputs)
                elem[k] = v;
        }
        this._parentAPI.insertElement(container);
        return [container, inputs];
    }

    destroy() {
        this.element.remove();
    }

    // Basically this._inputs[0].value is the model state location.
    get value (){ return parseFloat(this._inputs[0].value); }
    set value(val) {
        for(let input of this._inputs)
            input.value = val;
    }
    // Do on this.element!
    // FIXME: do we need to enableElement/disableElement inputs?
    // It seems like we could get away without!
    uiEnable () {
        this._inputs.map(this._parentAPI.enableElement);
        this._parentAPI.enableElement(this.element);
    }
    uiDisable () {
        this._inputs.map(this._parentAPI.disableElement);
        this._parentAPI.disableElement(this.element);
    }

    set passive(val) {
         this._inputs.map(input=>input.disabled = !!val);
    }

    get passive(){
        return this._inputs[0].disabled;
    }
}

// Uh, so this won't be a const eventually, it should even be dynamic, as
// a plugin can register states and have em de-registered when shut down.
const STATE_SETUP = {
    'proofId' // string/unique id: AKA: proofFormatTag (rename?)

    'fontName' // string/unique id: via fontParticles

    'fontSize' // number
    'autoOPSZ' // bool, can't be just a UI internal thing :-/

    // complex, via manualAxisLocations, depends on fontSize for opsz and autoOPSZ(bool)
    // actually, fontSize could be not set/unavailable as well, in which case
    // autoOPSZ should be treated as true?? OR opsz should be set to default???
    // it may depend on the actual proof how to handle this.
    // font-size is also NOT part of the original GENERAL_STATE_STRUCTURE
    // as it wasn't treated as this in videoproof.
    'axisLocations' // array [axisTag, value, axisTag, value ....]

    'customText' // string

    'comment' // string
    'showComment' // bool, we may not serialize it, by default: showComment = comment.length > 0
    'highlightSelection' // text-selection:pathRanges
}

In videoproof axisLocations are set from the animation state, it has no fontSize, autoOPSZ
In typetools axisLocations are set via manualAxisLocations, it has fontSize, autoOPSZ
so, maybe these are different dependency trees and axisLocations is just a data type!
on the other hand, axis locations doesn't have to be complete, if a location
is not set explicitly, the font default is assumend. So the manualAxisLocations
UI is indeed dependent on fontSize, autoOPSZ and axisLocations, and it can also
changes all of these.
the question is where and how to handle these getting out of sync? there's oviously
a state changing phase, where the resulting values must make sense.


fontname changes
 => available axis change
    => hence axisLocations need to change
 => depending on the value for autoOPSZ opsz in axisLocations has to change too
 => autoOPSZ may be considered a userInterface thing, thus the manualAxisLocations
    must register some kind of handler to go from
    vanilla axisLocations to axisLocations with opsz
    and, there must be no cyclic dependencies on the way.
 => only after all states have been calculated, the UI will receive the
    updated values

// a value
axisLocations(fontName, autoOPSZ, fontSize)



// The way to remove cyclic dependencies is to create a governing container

axisStyleGoverneur(style, AxisLocations) => style, AxisLocations

manualAxisLocations(fontName, fontSize, autoOPSZ, axisStyleGoverneur.AxisLocations)
// hidden: show all checkbox
// set to a fvar value if it's on a manualAxisLocations
// set to a
style(axisStyleGoverneur.style)

=> hmm in this case, I would expect style to set axisLocations
and to be set by axisLocations, e.g. when there's a match with
axis locations style is set to the appropriate option, otherwise, it's
going to be UIManualAxisLocations.CUSTOM_STYLE_VALUE.
style select is so far part of UIManualAxisLocations, so, we don't need
to worry.






proof(fontName, fontSize, axisLocations)

class _BaseModel{

    // qualifiedKey => can distinguish between alias/shortcut and
    // absolut entry. e.g. "@firstChild" vs ".0"
    function get(qualifiedKey){
        throw new Error(`Not implemented get (of "${qualifiedKey}") in ${this}.`);
    }

    // use only for console.log/Error/debugging purposes
    function toString(){
        return `[_BaseModel ${this.constructor,name}]`;
    }
}

// generic map/dictionary type
// Not sure we'll ever need this!
class MapModel extends _BaseModel{}


// list/array type
// items are accessed by index
// has a size/length
// I'd prefer to have a single type for all items, that way,
// we can't have undefined entries, however, a type could be
// of the form TypeOrEmpty...
// MultipleTargets ...!
class ListModel extends _BaseModel{}


class _AbstractStructModel _BaseModel{}


const ExampleLayoutModel = structModelFactory(
    ['fontName', fontNameModel]??? => requires axcess to the fonts?
    ['']

    ['autoOPSZ']
    ['axisLocations']
    //... this can come from a central definition, but, e.g. highlightSelection
    //    may not work for all layouts, so we should be able to exclude this!
    ['customText', simpleText /* could be restrained to a type of one line, but html can handle any text*/]
    ['comment', simpleText/*could be markdown*/]
    ['highlightSelection', // text-selection:pathRanges]
)

    // parent state??
    'proofId' // string/unique id: AKA: proofFormatTag (rename?)

    //
    'fontName' // string/unique id: via fontParticles

    'fontSize' // number
    'autoOPSZ' // bool, can't be just a UI internal thing :-/

    // complex, via manualAxisLocations, depends on fontSize for opsz and autoOPSZ(bool)
    // actually, fontSize could be not set/unavailable as well, in which case
    // autoOPSZ should be treated as true?? OR opsz should be set to default???
    // it may depend on the actual proof how to handle this.
    // font-size is also NOT part of the original GENERAL_STATE_STRUCTURE
    // as it wasn't treated as this in videoproof.
    'axisLocations' // array [axisTag, value, axisTag, value ....]

    'customText' // string

    'comment' // string
    'showComment' // bool, we may not serialize it, by default: showComment = comment.length > 0
    'highlightSelection' // text-selection:pathRanges


applicationModel => not sure we need to formalize this!
    fonts
    otherResources?
    layouts
    activeLayout/proofId
    // activeFont ??? => rather part of the layout model, because some may use multiple fonts


// axisValue, e.g. for opsz could contain an explicit autoOPSZ switch
class AxisLocationModel {
    axisTag
    axisValue
}
// could create one dynamically for each font?
// on the other hand, this seems to me a good case for a MapModel
class AxisLocationsModel



// visitor pattern getter
function getFromModel(model/*_BaseModel*/, pathString)  { // =>
    // think of pathString as a simplified selector, we're not going into
    // more complex
    let pathParts = pathString.split(PATH_SEPARATOR/*likeley more complex*/)

    return pathParts.reduce((accumModel, key)=>accumModel.get(pathPart));
}



MyLayoutModel


// eventually?
state = new State(MyLayoutModel, data/*if any*/);


setStateValue(state, pathInstance, value) {

}
getStateValue(state, pathInstance) {

}



[myUIElement, /*dependsOn:*/ new Set([pathStr, pathStr, pathStr])];
// also the other way around possible somewhere
myPath, /*repesented in ui by*/ [MyUIElement/*(this is likely a factory!)*/]







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
        this._activeOneToManySynchronisations = new Set();
        this._dependentsRequiringUpdate = new Map();

        // animation state
        this._animationFrameRequestId = null;

        this._animationState = null;

        this._setStateLinkTimeout = null;

        this._ui = null;// TODO: improve these apis!
        this._uiElementToName = new Map();

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
            .catch(error=>this.uiReportError('VideoproofController constuctor allUIPromise', error))
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
               .catch(error=>this.uiReportError('VideoproofController constuctor initial resources', error));
    }

    __allInitialResourcesLoaded(remoteResources/*, uiDependencies*/) {
        Object.defineProperty(this, 'appReady', {value: true});
        console.log('_allInitialResourcesLoaded');
        // Ensure proof ui elements are initialized properly.
        this._stateChangeHandlerSilent('proof');
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
        let fontBuffer_
          , fontObject
          ;

        try {
            fontBuffer_ = fontBuffer;
            fontObject = opentype.parse(fontBuffer_);
        }
        catch(e) {
                                   // original message
            if( e.message.indexOf('Unsupported OpenType signature wOF2' !== -1
                                   // changed message, still in a PR
                || e.message.indexOf("WOFF2 require an external decompressor") !== -1
                )
            ) {
                let ttfFontBufferView = await woff2decompress(fontBuffer);
                fontBuffer_ = ttfFontBufferView.buffer.slice(
                    ttfFontBufferView.byteOffset,
                    ttfFontBufferView.byteLength + ttfFontBufferView.byteOffset
                );
                fontObject = opentype.parse(fontBuffer_);
            }
            else
                throw e;
        }
        const fontFace = new contentDocument.defaultView.FontFace('LOADING', fontBuffer_)
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
    uiReportError(callerId, error) {
         console.error(`via ${callerId}:`, error);
         // FIXME
         alert(`via ${callerId}:${error}`);
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
            .catch(error => this.uiReportError('loadFontsFromFiles', error));
    }

    async loadFontsFromUrls(...urls) {
        return Promise.all(urls.map(url=>this._loadFontFromUrl( url )))
            .then(fonts=>this._registerAndActivateLoadedFonts(...fonts))
            .catch(error => this.uiReportError('loadFontsFromUrls', error));
    }

    async _loadFontsFromFetchPromises(...promises) {
        let fontsPromises = promises.map(promise=>promise.then(
                    response=>this._loadFontFromFetchResponse(response)));
        return Promise.all(fontsPromises)
            .then(fonts=>this._registerAndActivateLoadedFonts(...fonts))
            .catch(error => this.uiReportError('_loadFontsFromFetchPromises', error));
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
            .catch(error=>this.uiReportError('_loadRemoteResourcesFromFetchPromises', error));
    }

    // FIXME: this should be handled external to the shell, fonts should
    //        only be added to the fonts state not directly to the interface.
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
    // HOWEVER, it is obsolete ...
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
        this._setStateLink();
        return result;
    }

    // Runs when the ui can be build, but does not require resources like
    // the fonts to be available yet.
    async _initUI({mainUIElement, charGroups}) {
        console.log('_initUI', {mainUIElement, charGroups});
        this._mainUIElement = mainUIElement;

        // FIXME: not used in minimal shell!
        this._charGroups = charGroups;

        const domTool = new DOMTool(mainUIElement.ownerDocument);

        let doc = this._mainUIElement.ownerDocument
          , proof = doc.getElementById('the-proof')// doc.createElement('div')
          , addFonts = doc.getElementById('add-your-own-button')
          , selectFonts = doc.getElementById('select-font')
          , selectLayout = doc.getElementById('select-layout')
          , commentBox = doc.getElementById('comment-box')
          , comment = commentBox.querySelector('textarea')
          , commentSetHighlight = doc.getElementById('comment-set-highlight')
          , showComment = doc.getElementById('show-comment-ui')
          , reset = doc.getElementById('reset')
          , fontSize = doc.getElementById('edit-size') // type: number min='8' max='288' value='12'
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

        /*
         * FF
         *     not fired when ctrl multi selecting
         *     not fired when selection is dropped
         *     always followed by selectionchange
         *     not fired when just clicking around without dragging, selectionchange fires
         * Chrome
         *     no ctrl-multi select
         *     fires always, also when just clicking around and on new click and drags
         *     also fires on shift + click (which keeps the start and changes the end)
         *     and fires on droping selection
         * iOS
         *     There's no selectionstart event in iOS, but, there's also
         *     no collapsed selection, always at least one char is selected,
         *         and there's no modifier key anyways, SO, that together could
         *     help. Multi-select will need an interface here! I.e. an extra
         *     button to add to the already highlighted.
         */
        doc.addEventListener('selectstart', (/* evt */)=>{
            let mergedPathRanges
              , {wipRanges, temporayMultiSelectionRanges, normalizedRanges} = this._getUISelection()
              ;
            // This is not available on iOS(-Safari etc.)
            // In FireFox, due to native multi-select, we don't receive a
            // selectstart during multi-select (only selection change)
            // Hence, the first case below does not apply.
            if(this._multiSelectModifierKeyPressed) {
                // merge normalized wip-range(s) in temporayMultiSelectionRanges
                mergedPathRanges = mergePathRanges(
                      ...temporayMultiSelectionRanges
                    , ...getFullPathsFromRanges(proof, ...clipAndFilterRanges(proof, wipRanges))
                );
            }
            else
                mergedPathRanges = []; // drop

            this._resetUISelection({
                    wipRanges: [] // drop wipRanges
                  , temporayMultiSelectionRanges: mergedPathRanges
                  , normalizedRanges // keep normalizedRanges
            });
            this._applyTemporaryMultiSelectionToProof();
        });

        /**
         * Not required for Firefox, as it supports multi-select.
         */
        doc.addEventListener('selectionchange', (/* evt */)=>{
            let selection = doc.getSelection();

            // Just store the ranges, overide previous ranges.
            const wipRanges = []
              , {temporayMultiSelectionRanges, normalizedRanges} = this._getUISelection()
              ;
            for(let i=0, l=selection.rangeCount; i<l; i++)
                // These wip ranges are very short lived, so we can
                // store the actual objects unserialzied. In Firefox
                // multi-selection is available, so we can get multiple
                // ranges here, not so for other browsers, but in FireFox,
                // we also won't use these wipRanges.
                wipRanges.push(selection.getRangeAt(i));

            this._resetUISelection({
                    wipRanges // updated
                  , temporayMultiSelectionRanges // keep
                  , normalizedRanges // keep
            });
        });

        /**
         * TODO: for iOS, there's no selectionstart event, but also no
         * modifier key. In order to make multiple selection possible,
         * we should add a button to add to the highlighted selectio
         * directly, i.e. like this, but as if this._multiSelectModifierKeyPressed
         * is always true.
         */
        commentSetHighlight.addEventListener('click',evt=>{
            evt.preventDefault();
            const { proof } = this._ui
              , selection = doc.getSelection()
              , { temporayMultiSelectionRanges, normalizedRanges:oldNormalizedRanges} = this._getUISelection()
              , currentSelectionRanges = []
              , normalizedRanges = []
              ;

            for(let i=0, l=selection.rangeCount; i<l; i++)
                currentSelectionRanges.push(selection.getRangeAt(i));

            selection.removeAllRanges();
            // Remove temp-selection elements, this happens this._uiSetState
            // because we unset temporayMultiSelectionRanges below.
            // markupSelectionStructureSave(proof, 'temp-selection', []);

            const normalizedCurrentSelection = normalizeRanges(proof
                    , 'span.selection'
                    , ...clipAndFilterRanges(proof, currentSelectionRanges))
              ,  normalizedMultiSelectionRanges = normalizePathsRanges(proof
                    , 'span.selection'
                    , ...temporayMultiSelectionRanges)
              ;
            if(this._multiSelectModifierKeyPressed)
                normalizedRanges.push(...oldNormalizedRanges);
            normalizedRanges.push(...normalizedMultiSelectionRanges, ...normalizedCurrentSelection);

            this._resetUISelection({normalizedRanges});
            this._stateChangeHandler('textSelection');
        });


        let layoutToolsExamples = [
            // [{proof-tag}, {label}], ...
            // proof-tag needs to be unique inside of layoutTools
            // label will be for human reading.
                ['example', 'Initial Example']
              // , ['another', 'Another Tool']
            ]
          //, layoutToolsAnimation = [
                // [{proof-tag}, {label}], ...
          //   ]
          , layoutOptions = []
          , layoutTools = [
                ['examples', 'Examples', layoutToolsExamples]
               // , ['animation', 'Animation Tools', layoutToolsAnimation]
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
        selectLayout.value = layoutTools[2][0][0]; // a proofTag
        selectLayout.addEventListener('change', (/*e*/)=>this._stateChangeHandler('proof'));

        // should be it's own UIClass!
        let customText = domTool.createElement('input', {
                type: 'text'
              , id: 'custom-text'
              , name: 'text'
              , placeholder: 'Type your own'
           })
         , customTextLabel = domTool.createElement('label', {}, ['Text:', ' ', customText])
         ;
        customText.value = 'Type your own';
        DOMTool.insertAtMarkerComment(mainUIElement, 'insert: customText', customTextLabel);
        customText.addEventListener('input', (/*e*/)=>this._stateChangeHandler('customText'));

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

        reset.addEventListener('click', (evt)=>{
            evt.preventDefault();
            this._reset();
        });

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
              , dragend: dragRemoveClass
              , drop: dragRemoveClass
            }
          ;
        _makeFileInput (files=>this.loadFontsFromFiles(...files), addFonts,
                                        dropElement, fileInputDragCallbacks);

        selectFonts.addEventListener('change', ()=>this.activateFont(selectFonts.value));

        fontSize.addEventListener('input', (/*e*/)=>this._stateChangeHandler('fontSize'));

        this._ui = {
            status, proof
          , addFonts, selectFonts
          , selectLayout, customText
          , commentBox, comment
            // This is only a fake element, not even a proper
            // UI-element  so maybe a good hint that we need
            // another level of abstraction between model and UI.
            // It could have been a input type=hidden, but there's
            // no actual use for the overhead.
          , manualAxisLocations: new UIManualAxisLocations(
                { getFont: ()=>this.getFont(this._animationState.fontName)
                , insertElement: element=>DOMTool.insertAtMarkerComment(mainUIElement, 'insert: manualAxisLocations', element)
                , enableElement: this._enableElement.bind(this)
                , disableElement: this._disableElement.bind(this)
                , getCurrentFrame: ()=> this._animationState.lastYield[0]
                , getFontSize: ()=>parseFloat(this._ui.fontSize.value)
                , stateChangeHandler: ()=>this._stateChangeHandler('manualAxisLocations')
                }
              , domTool
              , doc.createElement('div')
                // requiresUpdateDependencies,  state dependencies ...
              , ['fontSize', 'fontName']
            )
          , fontSize
        };
        for(let [name, element] of Object.entries(this._ui))
            this._uiElementToName.set(element, name);
    }

    __reset() {
        // TODO: in Ramp Mode (ManualAxis + MultipleTargets but no
        // animation etc. this shouuld re-init the proof and it's default
        // values ...
        // Also, trigger 'click' on keyFramesContainer.querySelector('li a')
        // is not ideal, as we should reset the value and have the UI follow.
    }
    _reset() {
        this._cmd('__reset');
    }

    __setStateLink() {
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

    // Throttle calls to actual implementation __setStateLink.
    _setStateLink() {
        if(this._setStateLinkTimeout !== null)
            return;
        const { setTimeout } = this._contentWindow;
        this._setStateLinkTimeout = setTimeout(()=>{
            this._setStateLinkTimeout = null;
            // Since this is async, animation could be paused by now.
            this.__setStateLink();
        }, 1000);
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
        // This should be done in animation, it's expensive and
        // not the major use case, but for completeness. Otherwise the
        // temp selection boxes won't animate with the font.
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

    getFont(fontName) {
        let font = this._fonts.get(fontName);
        if(!font)
            throw new Error(`FONT NOT FOUND: ${fontName}`);
        return font;
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

        // FIXME!!!
        let animationState = this._initAnimationGenerator(font);
        this._setAnimationState(animationState);
    }
    activateFont(fontName) {
        return this._cmd('__activateFont', fontName);
    }


    // Should start right here and right now with separation of state and ui!

    __uiSetState() {
        if(!this.appReady) {
            console.warn(`_uiSetState: UI not yet available for activating ${this._animationState.fontName}.`);
            return false;
        }

        console.warn('__uiSetState quitting early!');
        if(true) return;

        let requireProofInit = this._checkProofRequireInit(...this._uiStateChanges);

        if(this._uiStateChanges.has('proof') || requireProofInit)
            this._uiProofCleanElementAttributes();
        let { selectFonts, proof } = this._ui;
        if(selectFonts !== selectFonts.ownerDocument.activeElement && selectFonts.value !== this._animationState.fontName)
            selectFonts.value = this._animationState.fontName;

        // TODO: apply (maybe a class) for a font-variation-setttings rule
        // with css-custom properties
        // could also have all axes with default values to axes defaults,
        // but that could make standard css usage harder (I don't think we
        // need standard css, we rather need full control)
        setStyleProperty(proof, 'font-variation-settings', fontVariationSettings);
        setStyleProperty(proof, 'font-family', this._animationState.fontName);


        // FIXME:
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
            console.log('_uiInitProof: this._uiStateChanges.has("proof"):', ...this._uiStateChanges);
            this._uiInitProof();
        }
        else if(requireProofInit) {
            console.log('_uiInitProof: requireProofInit (via _checkProofRequireInit):', ...this._uiStateChanges);
            this._uiInitProof(); // implies this._ui._proofAPI.update()
        }
        else if(this._ui._proofAPI && this._ui._proofAPI.update) {
            // FIXME: should this require the updated state information???
            // also, maybe we should only call this if explicit dependencies
            // changed?
            this._ui._proofAPI.update(this._uiStateChanges);
        }
        // Check if the selection is still valid for the proof.
        // FIXME: not sure if this check is sufficient, it will likeley
        //        break in the future but it is good enough for now.
        // Maybe, this._ui._proofAPI.update(); can also return some indicator
        // whether a selection can be kept or must be removed.
        // ALSO, it may be of value to remove the existing selection markup
        // prior to this._ui._proofAPI.update(); in some future cases.
        // This is still WORK IN PROGRESS to figure out how to do it best.
        if(this._uiStateChanges.has('highlightSelection')) {
            // console.warn('highlightSelection!');
            // when it comes from _setState (via the link coment)
            this._applyTextSelectionToProof();
        }
        else if(!requireProofInit && !this._uiStateChanges.has('proof')) {
            // console.warn('highlightSelection proof changed:', this._uiStateChanges.has('textSelection'));
            if(this._uiStateChanges.has('textSelection'))
                // This will persist once rendered, when using markupSelectionInline.
                this._applyTextSelectionToProof();
            // else: expext the selection is already rendered
        }
        else {
            // drop all selections
            this._resetUISelection();
        }
        // Will drop or update the temporary multiple selection
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
              , 'typespec': ['typespec']
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
    __uiInitProof() {
        let { selectLayout, proof } = this._ui;
        console.log('START __uiInitProof', selectLayout.value);
        // From here, it's good to call after  __uiSetState as the
        // intProof* method can consider the state of the proof element
        DOMTool.dispatchEvent(proof, 'destroy');
        DOMTool.clear(proof, 'destroy');

        // called by _uiSetState
        // This is interesting so that the proof can update internally,
        // after all outside changes have been made.
        const intProof = {
                    'example': this._uiInitProofExample
              }[selectLayout.value]
              /**
               * FIXME: These interface methods are underdocumented!
               * {
               *      update: function, no arguments, called when proof
               *              needs to update its state, e.g. to resize
               *              its contents. FIXME: be more specific here
               *              especially in which case update is called.
               * }
               */
            , proofAPI = intProof.call(this)
            ;
        this._ui._proofAPI = typeof proofAPI === 'object'
                    ? proofAPI
                    : null // no API
                    ;
        console.log('END __uiInitProof', selectLayout.value);
    }

    _uiInitProof() {
        return this._cmd('__uiInitProof');
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
        const SKIP = new Set(['fontName']);
        for(let proofDependency of allProofDependencies) {
            if(SKIP.has(proofDependency))
                continue;
            let element = this._ui[proofDependency];
            if(!element) {
                // If this occurs handle it elsewhere, e,g if expected add to SKIP!
                console.warn(`_changeProof: skipping NOT FOUND ui element ${proofDependency}`);
                continue;
            }
            if(PROOF_UI_DEPENDENCIES[proofTag].indexOf(proofDependency) !== -1) {
                // activate
                this._enableElement(element);
            }
            else {
               // deactivte
               this._disableElement(element);
            }
        }
    }

    _checkProofRequireInit(...stateDependencyNames) {
        let { selectLayout } = this._ui
          , proofTag = _formatProofTag(selectLayout.value)
          , dependencies = new Set(
                (proofTag in PROOF_REQUIRE_INIT_DEPENDENCIES
                        ? PROOF_REQUIRE_INIT_DEPENDENCIES
                        : PROOF_STATE_DEPENDENCIES
                )[proofTag]
            )
          ;
        for(let dependencyName of stateDependencyNames) {
            if(dependencies.has(dependencyName))
                return true;
        }
        return false;
    }


    /**
     * Connect one model item that represents many values with their
     * ui-elements. That means when the one element is changed, all
     * associated ui-elements must follow and the other way around.
     *
     * The "multipleTargets" element can hold multiple states for a
     * set of ui-elements and switch between these. This function
     * makes sure everything stays in sync and that the active state
     * of the multiple targets item is up to date with the ui.
     */
    _updateOneToManySync(synchronisationName, ...dependencyNames) {
        const synchronisationItem = this._ui[synchronisationName]
          , changedNames = new Set()
          ;
        for(const dependencyName of dependencyNames) {
            // If both are in dependencyNames maybe the first occurence
            // should wins. Coul also be always synchronisationName
            // or always the other...
            if(changedNames.has(dependencyName))
                // this doesn't look very correct :-/
                // but it's maybe also a none-case!
                continue;

            if(dependencyName === synchronisationName) {
                // this is like a one-to-many case

                // TODO: use central standard method to get value from field
                let values = synchronisationItem.activeState;
                for(const [fieldName, value] of Object.entries(values)) {
                    const field = this._ui[fieldName]
                        // FIXME: for multipleAxisLocation it would be nice
                        // to compare an array here. But maybe we can also
                        // use a string normalization
                      , changed = field.value !== value
                      ;
                    if(changed) {
                        field.value = value;
                        changedNames.add(fieldName);
                    }
                }
            }
            else if(synchronisationItem.hasField(dependencyName)) {
                // this is the many-to-one case
                const field = this._ui[dependencyName];
                    // TODO: use central standard method to get value from field
                    //       and to set dependencyName to multipleTarget
                // TODO: if e.g. fontName changes, multipleTargets should
                //       update all of it's states, and then would maybe
                //       also have to set or return the names of the
                //       active fields?
                //       For the proof, if there's a proofAPI.update, it
                //       will be executed.
                const changed = synchronisationItem.setValue(dependencyName, field.value);
                if(changed)
                    changedNames.add(synchronisationName);
            }
        }
        return changedNames;
    }

    // Yet another method to describe and enforce a dependency.
    // Eventually required is a propper declarationa and loop detecting
    // impelemtnation.
    // This is intended to describe a dependency that is required to update
    // by some means when one value changes.
    // It's also important to not that I think this makes the situation
    // rather worse than better!
    _updateDependencies(...changedDependencyNames) {
        const dependents = new Map();
        for(const changedDependencyName of changedDependencyNames) {
            // _dependentsRequiringUpdate
            //      fontname: {multipleTargets}
            //      dependencyName: {dependentNames, ...}
            const dependentsNames = this._dependentsRequiringUpdate.get(changedDependencyName);
            if(dependentsNames) {
                for(const dependentName of dependentsNames) {
                    const changedDependencyNames = _mapGetOrInit(
                                dependents, dependentName, ()=>new Set());
                    changedDependencyNames.add(changedDependencyName);
                }
            }
        }
        // Decided to collect and call once for all dependencies, so the
        // implementation can choose how to handle. Otherwise, calling
        // update for each changedDependencyNames could create overhead.
        const changedFields = [];
        for(const [dependentName, changedDependencyNames] of dependents.entries()) {
            // not sure if it is required to return the changedValues as an array
            // maybe just a boolean is sufficient.
            // See FIXME comment below.
            let changedValues = this._ui[dependentName].update(...changedDependencyNames);
            if(changedValues === true || Array.isArray(changedValues) && changedValues.length)
                changedFields.push(dependentName
                    // FIXME: I feel like we should also return the "changedValues"
                    // array, but I believe it will keeep those UI-fields from
                    // getting updated!
                    // The fix would be to completely separate states from UIs!
                    // NOTE also that we did not actually update, concretely,
                    // manualAxisLocations, but only multipleValues, the
                    // state-UI-object of manualAxisLocations was not touched!
                    // _updateOneToManySyncs should take care of this.
                    //
                    // Otherwise: uncomment:
                    //          , ...changed
                );
        }
        return changedFields;
    }

    _updateOneToManySyncs(...dependencyNames) {
        const moreDependencies = [];
        for(let synchronisationName of this._activeOneToManySynchronisations)
            moreDependencies.push(...this._updateOneToManySync(
                                synchronisationName, ...dependencyNames));
        return moreDependencies;
    }

    /**
     * Called as an event-handler to prepare calling _uiSetState.
     */
    _stateChangeHandlerSilent(...dependencyNames) {
        if(!dependencyNames.length)
            return;

        dependencyNames.push(...this._updateDependencies(...dependencyNames));
        dependencyNames.push(...this._updateOneToManySyncs(...dependencyNames));
        for(const dependencyName of dependencyNames)
            this._uiStateChanges.add(dependencyName);
    }

    _stateChangeHandler(...dependencyNames) {
        if(!dependencyNames.length)
            return;
        this._stateChangeHandlerSilent(...dependencyNames);
        this._uiSetState();
    }

    // depends on
    //      showExtendedGlyphs
    //      customText
    //      (future: a boolean option: "avoid line breaks" that defaults to true
    //              see how the legacy version handles this)
    _uiInitProofExample() {
        // was type your own
        // had it's own fit to space implementation
        // I'd like this to use manual axis locations, as this includes a
        // complex setup of UI tools!
        let { proof, customText} = this._ui;
        // TODO: Will need a better central solution.

        let text = customText.value.trim();

        const originalAPI = initExample(proof, text)
          , augmentedAPI = originalAPI ? Object.create(originalAPI) : {}
          ;
        augmentedAPI.update = (changedDependencyNamesSet)=>{
            if(changedDependencyNamesSet.has('colors'))
                this._setColorsToProof();
            return originalAPI?.update();
        };

        this._setColorsToProof();

        return augmentedAPI;
    }

    getStateForSerialization() {
        let font = this.getFont(this._animationState.fontName)
            // We need frame, but t, fromKeyFrameIndex and keyFrameT
            // can be used to compare with the state after deserialization
            // but therefore, it's just logged.
            // duration: could be serialized as well!
          , [frame, /*t*/, /*duration*/, /*fromKeyFrameIndex*/, /*keyFrameT*/
                    ] = this._animationState.lastYield
          , { selectLayout, colors } = this._ui
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
            // FIXME: This should be driven by the contents of \
            // GENERAL_STATE_STRUCTURE, this way it's a redundancy IN
            // _serializeStateForURL which depends on generalState.
          , generalState = {
                dateTime: new Date()
              , fontParticles: font.serializationNameParticles
              , axisLocations: frame.map(([k, v])=>[k, Math.round(v)])
              , proofFormatTag
              , comment: this._uiCommentIsActive()
                            ? this._ui.comment.value.trim()
                            : ''
              , highlightSelection: this._getMergedSelectionRanges()
              , colors: colors.value
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
            else if(typeof value === 'number')
                // FIXME: does not deserialize as number.
                serialized = value.toString(10);
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

    _getUIElementType(proofDependency) {
        const { Element } = this._mainUIElement.ownerDocument.defaultView
          , element = this._ui[proofDependency]
          ;
        let type;

        if(!element)
            throw new Error(`UI dependency element not found for: ${proofDependency}`);

        if(element instanceof Element) {
                type = element.tagName === 'SELECT'
                    ? 'select'
                    : element.type.toLowerCase()
                    ;
        }
        else if('value' in element) {
            type = 'pseudo';
        }
        else
            throw new Error(`Don't know what to do with type of "${proofDependency}": ${element}`);
        return [type, element];
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
        // how to build, in That case, we build the closest state we can
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

        let { selectLayout, colors } = this._ui
          , proofTag = _formatProofTag(generalState.proofFormatTag)
          ;
        let dependencies = PROOF_STATE_DEPENDENCIES[proofTag]
                                    // that's a "virtual" dependency,
                                    // it doesn't have a this._ui entry
                                    // directly.
                                    .filter(name=>name!=='fontName');
        for(let i=0,l=dependencies.length;i<l;i++) {
            let proofDependency = dependencies[i];
            if(['manualAxisLocations', 'multipleTargets', 'typeSpecTemplate', 'fontLeading', 'colors', 'variationSettingsFlags'].indexOf(proofDependency) !== -1) {
                console.warn(`setState: PROOF_STATE_DEPENDENCIES skipping ${proofDependency} NOT IMPLEMENTED.`);
                continue;
            }

            let [type, element] =  this._getUIElementType(proofDependency)
              , value = proofState[proofDependency]
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
                case 'number':
                case 'range':
                case 'pseudo':
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
            colors.value = generalState.colors;
        else
            // hard coded defaults for now
            colors.setDefault();
        changedDependencyNames.add('colors');

        // If there's no comment, the comment ui should be hidden
        // similarly, if the comment ui is shown and is changed to a none
        // value it shold be hidden again.
        this._setComment(generalState.comment);

        this._resetUISelection({normalizedRanges: generalState.highlightSelection});
        changedDependencyNames.add('highlightSelection');

        let animationDependencies = this._getAnimationStateChanges(this._animationState, animationState);
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
            if(proofDependency === 'fontName')
                // This is stored in the general state already
                // it also is not an item in this._ui.
                continue;
            if(['manualAxisLocations', 'multipleTargets', 'typeSpecTemplate', 'fontLeading', 'colors', 'variationSettingsFlags'
                    ].indexOf(proofDependency) !== -1) {
                console.warn(`TODO getProofStateForSerialization: Skipping `
                            + `${proofDependency}: NOT IMPLEMENTED`);
                values.push(null);
                continue;
            }

            let [type, element] = this._getUIElementType(proofDependency);

            if(element.disabled) {
                values.push(null);
                continue;
            }
            switch(type) {
                case "checkbox":
                     values.push(element.checked);
                     break;
                case "select":
                case "number":
                case "range":
                case "pseudo":
                    values.push(element.value);
                    break;
                case "text":
                    values.push(element.value.trim());
                    break;
                default:
                    throw new Error(`NOT IMPLEMENTED serialize input type "${type}".`);
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
              ;
            if(proofDependency === 'typeSpecTemplate') {
                 console.warn(`TODO _deserializeProofState: Skipping `
                            + `${proofDependency}: NOT IMPLEMENTED`);
                continue;
            }
             let [type, element] = this._getUIElementType(proofDependency)
              , value, message
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
                case "number": // input type number
                case "range":
                case 'pseudo':
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

    _disableElement(element) {
        if(typeof element.uiDisable === 'function') {
            element.uiDisable();
            const name = this._uiElementToName.get(element);
            if(element.isSynchronisationItem)
                this._activeOneToManySynchronisations.delete(name);
            if(element.requiresUpdateDependencies) {
                for(let dependencyName of element.requiresUpdateDependencies) {
                    let dependants = this._dependentsRequiringUpdate.get(dependencyName);
                    if(!dependants)
                        continue;
                    dependants.delete(name);
                    // Cleaning up is not so important, could even cause
                    // worse performance than just keeping the set around.
                    // ALSO: the set could be attached to each state directly,
                    // when they have their own base class.
                    if(!dependants.size)
                        this._dependentsRequiringUpdate.delete(dependencyName);
                }
            }
        }
        else if(element.nodeType === Node.ELEMENT_NODE) {
            element.disabled = true;
            element.classList.add('input-disabled');
        }
    }

    _enableElement(element) {
        if(typeof element.uiEnable === 'function') {
            element.uiEnable();
            const name = this._uiElementToName.get(element);
            if(element.isSynchronisationItem)
                this._activeOneToManySynchronisations.add(name);
            if(element.requiresUpdateDependencies) {
                for(let dependencyName of element.requiresUpdateDependencies) {
                    const dependants = _mapGetOrInit(
                        this._dependentsRequiringUpdate, dependencyName, ()=>new Set());
                    dependants.add(name);
                }
            }
        }
        else if(element.nodeType === Node.ELEMENT_NODE) {
            element.disabled = false;
            element.classList.remove('input-disabled');
        }
    }
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

function _decodeURIComponent(str) {
    let message;
    return [decodeURIComponent(str), message];
}


// The Order in PROOF_STATE_DEPENDENCIES is crucially important to never change ever!
// Appending new entries is OK. This is because externally stored
// state links rely on this order and changing it would invalidate these
// links.
const TYPESPEC_MULTIPLE_TARGETS = ['fontSize', 'fontLeading', 'alignment', 'colors'
                 /* manualAxisLocations: should include "fontStyle"
                  * as a shortcut to dial in location numbers */
              , 'manualAxisLocations'
      ]
  , PROOF_STATE_DEPENDENCIES = {
        //"_uiInitProof" => selectLayout/proofFormatTag
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
      , "TYPESPEC": ['columnWidth'
                , 'typeSpecTemplate' // we don't really have a choice yet, but this prepares it.
                , 'variationSettingsFlags'
                // everything after multipleTargets is for those multiple targets
                // though, maybe some (like alignment and color) could be
                // global.
              , 'multipleTargets' /* TODO: how to initate different typpgraphic-targets? */
                /* out of these, font-size is the most important */
              , ...TYPESPEC_MULTIPLE_TARGETS
        ]
    }
    // Falls back to PROOF_STATE_DEPENDENCIES if the key is not in PROOF_REQUIRE_INIT_DEPENDENCIES.
  , PROOF_REQUIRE_INIT_DEPENDENCIES = {
        // TYPESPEC: needs only to run its own update function when the other
        // state values change.
        "TYPESPEC": ['typeSpecTemplate']
    }
    // These are intended to be turned on/off per proof, they don't
    // necessarily cary state for serialization themselves, but e.g.
    // animation controls (play/pause etc.)
  , VIDEPROOF_UI_DEPENDENCIES = ['keyframesdDisplayContainer', 'moarAxesDisplay'
                , 'animationControls', 'animationDurationContainer', 'aniparams'
                , 'selectGlyphsContainer', 'colors']
  , PROOF_UI_DEPENDENCIES = {
        "GRID": [...PROOF_STATE_DEPENDENCIES.GRID, ...VIDEPROOF_UI_DEPENDENCIES]
      , "TYPE_YOUR_OWN": [...PROOF_STATE_DEPENDENCIES.TYPE_YOUR_OWN, ...VIDEPROOF_UI_DEPENDENCIES]
      , "CONTEXTUAL": [...PROOF_STATE_DEPENDENCIES.CONTEXTUAL, 'contextualPadModeContainer'
                , 'contextualPadCustomContainer', ...VIDEPROOF_UI_DEPENDENCIES]
      , "TYPESPEC": [...PROOF_STATE_DEPENDENCIES.TYPESPEC , 'columnWidth'
                , 'typographyContainer',  'alignmentColorContainer'
                 // This is to get informed when the font changes.
                 // We'll have to update especially the manualAxisLocations
                 // but for automated leading, this is relevant as well.
                 //
                 // The wiring of this is done in _uiInitProofTypespec. ??
                 // so there's a duplication of dependency descriptions.
                 // It would be better when enabling/including multipleTargets
                 // it would itself include it's dependencies. In the end
                 // I guess we want a flat, ordered list and make surre
                 // there are no loops. (Because there are no loops we can
                 // order it in a way that all dependencies are already
                 // updated fullfilled when the dependent it is its turn.
                 // HOWEVER, I also see that there must be a difference
                 // between more demanding/effortful initializing/rebuilding
                 // and just updating, so maybe we build two dependency
                 // trees, one for each where: if(needsRebuild) else if(needsUpdate)
                 // because a rebuild must always also include the work of
                 // an update. To be sure there's no code duplication, it
                 // could be possible that the initialize/rebuild method
                 // requests to run the update method subsequently, but it
                 // could similarly be solved internally in the implementaton.
                 //
                 // For this to work, initialize/rebuild dependencies must
                 // be a superset to update dependencies, containing all
                 // update dependencies and more. Othwerwise
                 // update would never run (may be fine). Initialize/rebuild
                 // also must have full access to all update dependencies.
                 // In other words, initalize is only triggered when the
                 // depedencies that channged are in initilaize but not
                 // in update.
                 //
                 //
                 // CAUTION: fontName here actually stands for font, as
                 //          changing the font changes the fontName, nothing
                 //          else and as here, the actual contents of the
                 //          font (axis names and defaults etc.) are
                 //          required information.
                 , 'fontName'
                ]
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
//      , ['colors', _serializeRGBColors, _deserializeRGBColors]
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


