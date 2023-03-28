/* jshint esversion: 11, browser: true, unused:true, undef:true, laxcomma: true, laxbreak: true, devel: true */

import {
    Path
//  , COMPARE_STATUSES
  , StateComparison
  , ForeignKey
  , getEntry
  , unwrapPotentialWriteProxy
} from '../metamodel2.mjs';

import {
    ExampleLayoutModel
  , ExampleKeyMomentsLayoutModel
} from '../model.mjs';


// To mark the update strategy of the widget
export const UPDATE_STRATEGY_SIMPLE = Symbol('UPDATE_SIMPLE')
    // Maybe requires a renaming, but it means the update strategy
    // that receives "compareResult" as argumnet (not changeMap)
  , UPDATE_STRATEGY_COMPARE = Symbol('UPDATE_COMPARE')
    // this is where the widget stores the UPDATE_STRATEGY_{***} marker
  , UPDATE_STRATEGY = Symbol('UPDATE_STRATEGY')
  ;

function makeFileInput (handleFiles, clickElement, dropElement, dragCallbacks) {
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

// base class for all UI elements
// mainly to describe general interfaces
export class UIBase {
    [UPDATE_STRATEGY] = UPDATE_STRATEGY_SIMPLE; // jshint ignore:line

    get _domTool() {
        return this.parentAPI.domTool;
    }
    _insertElement(...args) {
        return this.parentAPI.insertElement(...args);
    }
    getEntry(...args) {
        return this.parentAPI.getEntry(...args);
    }
    getEntryRaw(...args) {
        return this.parentAPI.getEntryRaw(...args);
    }
    _changeState(fn) {
        return this.parentAPI.withChangeState(fn);
    }
    // This is a decorator, it return a function that when called
    // wraps fn into a call to this.parentAPI.withChangeState,
    // applying the ...args to fn when executed.
    _changeStateHandler(fn) {
        return (...args)=>this._changeState(()=>fn(...args));
    }

    constructor(parentAPI) {
        this.parentAPI = parentAPI;
    }
    /* Remove all elements inserted using the domInsert method.
     * Remove all EventListeners especialy those to elements outside,
     * e.g. sometimes a listener must be attached to window.
     *
     * There could be a pattern via DOM events:
     *      // In the destroy method:
     *      // clean up external side effects
     *
     *      // If there are children widgets, call their destroy methods.
     *      // For covencience, parentAPI.insertElement keeps track
     *      // of all elements it inserted and removes them when from the
     *      // dom just before calling destroy.
     */
    destroy () {
        // Not raising this anymore, as it is not often that an actual
        // action is required on destroy, the default is to do nothing.
        // throw new Error(`NOT IMPLEMENTED: ${this.constructor.name}.destroy!`);
    }

    /**
     * changedMap is a map with all changed dependecies of the widgets set
     * unchanged dependencies are not included
     * The actual description and mapping of the dependencies must happen
     * in the parent, here's no mechanism that checks if the method is
     * called correctly yet.
     * The order in which changed dependencies are updated in the widgets
     * is up to the implementation (and sometimes it matters), but it
     * should react to all updated dependencies that are present.
     */
    update(changedMap) {
        // jshint unused: vars
        throw new Error(`NOT IMPLEMENTED: ${this.constructor.name}.update!`);
    }

    // CAUTION: should not use these anymore, as the state/model that was
    // the UI before required this in videoproof, but the concept has changed.
    set value(value) {
        /*jshint unused: false */
        throw new Error(`DEPRECATED: ${this.constructor.name}.set value!`);
    }
    get value() {
        throw new Error(`DEPRECATED: ${this.constructor.name}.get value!`);
    }
}

export class FontSelect extends UIBase {
    // jshint ignore:start
    static TEMPLATE = `<label class="ui_font-select">
    <span class="ui_font-select_label">Family</span>
    <select class="ui_font-select_select"></select>
</label>`;
    // jshint ignore:end
    constructor(parentAPI) {
        super(parentAPI);
        [this.element, this._label, this._select] = this.initTemplate();
    }

    initTemplate() {
        const frag = this._domTool.createFragmentFromHTML(this.constructor.TEMPLATE)
          , element = frag.querySelector('.ui_font-select')
          , label = frag.querySelector('.ui_font-select_label')
          , select = frag.querySelector('.ui_font-select_select')
          ;
        this._insertElement(element);
        select.addEventListener('change', this._changeStateHandler((/*event*/)=>{
            // const value = this.getEntry('value');
            // value.set(this._select.value);
            this.getEntry('value').set(this._select.value);
            // could do more e.g.:
            // const options = this.parentAPI.getEntry('options');
            // deleted = options.arraySplice(0, 3);
        }));
        return [element, label, select];
    }

    update(changed) {
        console.log('FontSelect update changed:', ...changed.keys(), changed);
        // Should probably use availableFonts and activeFontKey
        // directly in this case, but for more generic interfaces,
        // it is important that we can rewrite names from external
        // model names to internal widget names. So I can start with
        // as well righ now.
        if(changed.has('options'))
            this._updateOptions(changed.get('options'));
        if(changed.has('value'))
            this._updateValue(changed.get('value'));
    }
    _updateOptions(availableFonts/* changes */) {
        console.log('_updateOptions:', availableFonts);
        // Just rebuild all options, it's straight forward
        const value = this._select.value // keep around to set back later
          , optGroups = {}
          , createOptGroup = name=>{
                const optgroup = this._domTool.createElement('optgroup');
                switch(name) {
                    case 'from-url':
                        optgroup.label ='Included fonts';
                        break;
                    case 'from-file':
                        optgroup.label = 'Your local fonts';
                        break;
                    default:
                        optgroup.label = `Origin: ${name}`;
                }
                return optgroup;
            }
          , getOptGroup = name=>{
                if(!(name in optGroups))
                    optGroups[name] = createOptGroup(name);
                return optGroups[name];
            }
          ;
        for(const [key, {value:font}] of availableFonts) {
            const optGroup = getOptGroup(font.origin.type)
              , textContent = font.nameVersion
              , option = this._domTool.createElement('option')
              ;
            option.value = key;
            option.textContent = textContent;
            optGroup.append(option);
        }
        this._domTool.clear(this._select);
        const seen = new Set();
                           // Some fixed order.
        for(const name of ['from-url', 'from-file', ...Object.keys(optGroups)]){
            if(seen.has(name)) continue;
            seen.add(name);
            // Fixed order items may not exist.
            if(!(name in optGroups)) continue;
            this._select.append(optGroups[name]);
        }
        // Set back original value, if this is not available, it has changed
        // and the new value will be set by the shell.
        this._select.value = value;
    }
    // Should be called after updateOptions if that was necessaty, as
    // the new options may no longer contain the old value.
    // This follows the same dependency hierarchy as the model definition
    // with foreignKeys etc.
    _updateValue(activeFontKey) {
        this._select.value = activeFontKey.value;
    }
}


export class AddFonts extends UIBase {
    //jshint ignore:start
    static TEMPLATE = `<a
    class="ui_font-select"
    title="…or drag a font file onto the window">+ Add your own
</a>`;
    //jshint ignore:end
    constructor(parentAPI) {
        super(parentAPI);
        [this.addFontsElement , this.dropElement] = this.initTemplate();
    }

    initTemplate() {
        const frag = this._domTool.createFragmentFromHTML(this.constructor.TEMPLATE)
          , addFonts = frag.firstElementChild
          , dropElement = this._domTool.document.body
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
        this._insertElement(addFonts);
        makeFileInput(files=>this.parentAPI.loadFontsFromFiles(...files), addFonts,
                                        dropElement, fileInputDragCallbacks);

        return [addFonts, dropElement];
    }

    destroy() {
        // Raise, as dropElement, which is <body> has a load of
        // event handlers attached. But right now it's not planned to
        // remove the AddFonts interface.
        throw new Error(`NOT IMPLEMENTED but there are event listeners `
                      + `attached to <body> that must get removed.`);
    }
}

export class GenericSelect extends UIBase {
    // jshint ignore:start
    static TEMPLATE = `<label class="ui_generic_select">
    <span class="ui_generic_select-label">Something</span>
    <select class="ui_generic_select-select"></select>
</label>`;
    // jshint ignore:end
    constructor(parentAPI, baseClass, labelContent, optionGetLabel) {
        super(parentAPI);
        if(optionGetLabel)
            this._optionGetLabel = optionGetLabel;
        [this.element, this._label, this._select] = this.initTemplate(baseClass, labelContent);
    }
    initTemplate(baseClass, labelContent) {
        const frag = this._domTool.createFragmentFromHTML(this.constructor.TEMPLATE)
          , element = frag.querySelector('.ui_generic_select')
          , label = frag.querySelector('.ui_generic_select-label')
          , select = frag.querySelector('.ui_generic_select-select')
          ;
        element.classList.add(`${this._baseClass}`);
        label.classList.add(`${this._baseClass}-label`);
        this._domTool.clear(label);
        label.append(labelContent);
        select.classList.add(`${this._baseClass}-select`);

        this._insertElement(element);
        select.addEventListener('change', this._changeStateHandler((/*event*/)=>{
            // const value = this.getEntry('value');
            // value.set(this._select.value);
            this.getEntry('value').set(this._select.value);
            // could do more e.g.:
            // const options = this.parentAPI.getEntry('options');
            // deleted = options.arraySplice(0, 3);
        }));
        return [element, label, select];
    }

    update(changed) {
        console.log('GenericSelect ${this._label.textContent} update changed:', ...changed.keys(), changed);
        // Should probably use availableFonts and activeFontKey
        // directly in this case, but for more generic interfaces,
        // it is important that we can rewrite names from external
        // model names to internal widget names. So I can start with
        // as well righ now.
        if(changed.has('options'))
            this._updateOptions(changed.get('options'));
        if(changed.has('value'))
            this._updateValue(changed.get('value'));
    }

    /* Override via constructor. */
    _optionGetLabel(key/*, value*/){
        return key;
    }

    _updateOptions(availableOptions/* changes */) {
        // Just rebuild all options, it's straight forward
        const value = this._select.value // keep around to set back later
          , options = []
          ;
        for(const [key, value] of availableOptions) {
            const textContent = this._optionGetLabel(key, value)
              , option = this._domTool.createElement('option')
              ;
            option.value = key;
            option.textContent = textContent;
            options.push(option);
        }
        this._domTool.clear(this._select);
        this._select.append(...options);
        // Set back original value, if this is not available, it has changed
        // and the new value will be set by the shell.
        this._select.value = value;
    }
    // Should be called after updateOptions if that was necessary, as
    // the new options may no longer contain the old value.
    _updateValue(activeKey) {
        this._select.value = activeKey.value;
    }
}


class UINumberAndRangeInput extends UIBase {
    //jshint ignore:start
    static TEMPLATE = `<div id="container" class="number-and-range-input">
    <label for="range"><!-- insert: label --></label>
    <input type='number' id="number" size="3" /><!-- insert: unit -->
    <input type='range' id="range" />
</div>`;
    //jshint ignore:end
    /**
     * NOTE: how parentAPI can inject changeHandler! Maybe that's a better
     *      model in general. Under observation!
     */
    constructor(parentAPI, baseID, label, unit, minMaxValueStep) {
        super(parentAPI);
        this._passive = false;
        this._minMaxValueStep = minMaxValueStep;
        [this.element, this._inputs] = this._initTemplate(baseID, label, unit, minMaxValueStep);
        this._changeHandler = this.parentAPI.changeHandler
              ? (event)=>{
                    event.preventDefault();
                    this.parentAPI.changeHandler(parseFloat(event.target.value));
                }
              : this._changeStateHandler((event)=>{
                    event.preventDefault();
                    this.getEntry('value').set(parseFloat(event.target.value));
                });
        for(const elem of this._inputs)
            // is not yet removed ever anymore...
            elem.addEventListener('input', this._changeHandler);
    }

    _initTemplate(baseID, label, unit, minMaxValueStep) {
        const fragment = this._domTool.createFragmentFromHTML(this.constructor.TEMPLATE)
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
            elem.id = `${baseID}-${id}`;
        }
        for(const label of container.querySelectorAll('label'))
            // htmlFor gets/sets the `for` attribute
            label.htmlFor = `${baseID}-${label.htmlFor}`;

        const inputs = Array.from(container.getElementsByTagName('input'))
          , minMaxValueStep_ = (!('step' in minMaxValueStep)
                                 && 'min' in minMaxValueStep
                                 && 'max' in minMaxValueStep)
                            ? Object.assign({step: _getInputStepsSizeForMinMax(minMaxValueStep.min, minMaxValueStep.max)}, minMaxValueStep)
                            : minMaxValueStep
          ;
        for(const [k,v] of Object.entries(minMaxValueStep_)) {
            // all of min, max, step, value work as properties
            for(const elem of inputs)
                elem[k] = v;
        }
        this._insertElement(container);
        return [container, inputs];
    }

    update(changedMap) {
        if(changedMap.has('value')) {
            const value = changedMap.get('value').value
                // Clamp/clip/cutoff displayed value to min/max limits as configured.
              , min = 'min' in this._minMaxValueStep ? this._minMaxValueStep.min : value
              , max = 'max' in this._minMaxValueStep ? this._minMaxValueStep.max : value
              , limited = Math.min(max, Math.max(min, value))
              ;
            for(let input of this._inputs) {
                if(this._domTool.document.activeElement === input)
                    // has focus
                    continue;
                // synchronize the other element(s)
                input.value = limited;
            }
        }
    }

    // use e.g. by UIManualAxesLocations
    set passive(val) {
         this._passive = !!val;
         this._inputs.map(input=>input.disabled = !!val);
    }

    get passive(){
        return this._passive;
    }

    setDisplay(show) {
        if(show)
            this.element.style.removeProperty('display');
        else
            this.element.style.display = 'none';
    }
}

class LineOfTextInput  extends UIBase {
    //jshint ignore:start
    static TEMPLATE = `<div class="line_of_text">
    <label><!-- insert: label -->
    <input type='text'/></label>
</div>`;
    //jshint ignore:end
    constructor(parentAPI, label) {
        super(parentAPI);
        this._passive = false;
        [this.element, this._input] = this._initTemplate(label);

    }

    _initTemplate(label) {
        const container = this._domTool.createFragmentFromHTML(this.constructor.TEMPLATE).firstElementChild
          , input = container.querySelector('input')
          ;

        input.addEventListener('input',  this._changeStateHandler((/*event*/)=>{
            this.getEntry('value').set(input.value);
        }));

        this._domTool.insertAtMarkerComment(container, 'insert: label', label);
        this._insertElement(container);
        return [container, input];
    }

    update(changedMap) {
        if(changedMap.has('value')) {
            if(this._domTool.document.activeElement !== this._input)
                 this._input.value = changedMap.get('value').value || '';
            // else has focus
        }
    }
}

export class SimpleProof extends UIBase {
    //jshint ignore:start
    static TEMPLATE = `<div class="simple-proof">Sample Text</div>`;
    //jshint ignore:end
    constructor(parentAPI) {
        super(parentAPI);
        this.element = this.initTemplate();
    }

    initTemplate() {
        const frag = this._domTool.createFragmentFromHTML(this.constructor.TEMPLATE)
          , element = frag.firstElementChild
          ;
        this._insertElement(element);
        return element;
    }
    update (changedMap) {
       console.log(`${this.constructor.name}.update(changedMap):`, changedMap);

        // This would be a good method, ideally maybe:
        // const {axesLocations, autoOPSZ, ...} this.getEntries(changedMap, 'axesLocations', 'autoOPSZ')
        // would be interesting to also extract value if possible!
        const axesLocations = changedMap.has('axesLocations')
                        ? changedMap.get('axesLocations')
                        : this.getEntry('axesLocations')
          , autoOPSZ = (changedMap.has('autoOPSZ')
                        ? changedMap.get('autoOPSZ')
                        : this.getEntry('autoOPSZ')).value
          , fontSize = (changedMap.has('fontSize')
                        ? changedMap.get('fontSize')
                        : this.getEntry('fontSize')).value
          , font = (changedMap.has('font')
                        ? changedMap.get('font')
                        : this.getEntry('font')).value
          , hasOPSZ = 'opsz' in font.axisRanges
          ;

       if(changedMap.has('font'))
           this.element.style.setProperty('font-family', `"${font.fullName}"`);

        if((changedMap.has('fontSize')))
            this.element.style.setProperty('font-size', `${changedMap.get('fontSize').value}pt`);


        // Not sure about this optimization, it's complicated, especially
        // in the hasOPSZ case
        let requireVariationsUpdate = changedMap.has('axesLocations') // When axesLocations changed we always update.
            || (hasOPSZ
                // When axesLocations changed we always update.
                // => has opsz, axesLocations did not change
                && (changedMap.has('autoOPSZ') // always
                    // => autoOPSZ did not change, what's the value ...
                    || (autoOPSZ
                            // => we'll use fontSize and it changed
                            ? changedMap.has('fontSize')
                            // => we'll use the default value and the font changed
                            : changedMap.has('font')
                    )
                )
            );
        if(!requireVariationsUpdate)
            return;
        // requireVariationsUpdate!
        const variations = [];
        for(const [axisTag, value] of axesLocations)
            variations.push(`"${axisTag}" ${value.value}`);
        if(hasOPSZ && !axesLocations.has('opsz')) {
            // The browser defaults are flawed! At some point we may
            // still require showing the browser default, to show
            // how it is not the same as it should be OR to show
            // how it got fixed.
            const opsz = autoOPSZ
                ? fontSize
                : font.axisRanges.opsz.default
                ;
            variations.push(`"opsz" ${opsz}`);
        }
        this.element.style.setProperty('font-variation-settings', variations.join(','));
    }
}

/* Useful helper but may have room for improvement. */
function _getInputStepsSizeForMinMax(min, max) {
    let distance = Math.abs(min - max);
    if(distance >= 100) {
        return '1'; //10 ** 0
    }
    if(distance >= 10) {
        return '0.1'; // 10 ** - 1
    }
    return '0.01'; // 10 ** -2
}

class UIManualAxesLocations extends UIBase {
    // Order of the legacy variable type tools app appearance,
    // which actually uses the order of axes as in the font.
    // However, the axes order seems  to have changed and the order
    // seen in the app seems more intuitive to use, so here comes a
    // custom order, also, these axes displayed when "View all axes"
    // is not checked.
    static REGISTERED_AXES_ORDERED = ['wght', 'wdth', 'opsz', 'ital', 'slnt', 'grad', 'GRAD']; //jshint ignore:line

    constructor (parentAPI) {
        super(parentAPI);

        this._autoOPSZChangeHandler = this._changeStateHandler(this.__autoOPSZChangeHandler.bind(this));
        this._axisChangeHandler = this._changeStateHandler(this.__axisChangeHandler.bind(this));
        this._styleSelectChangeHandler= this._changeStateHandler(this.__styleSelectChangeHandler.bind(this));

        this.element = this._domTool.createElement('div',
                {class: 'manual_axes_locatioms'},
                this._domTool.createElement('h3', {}, 'Manual Axes Locations'));

        this._insertElement(this.element);

        this._axesInterfaces = new Map();
        this._autoOPSZInput = null;
        this._viewAllAxes = null;
        this._styleSelect = null;

        this._insertedElements = [];
        this._font = null;
        this._fontSize = null;
        this._localAxesLocations = {};
        this._axesLocations = null;
    }

    // could be static and stand alone
    _setOrReset(mapLike, key, value, defaultValue) {
        if(defaultValue === value)
            mapLike.delete(key);
        else
            mapLike.setSimpleValue(key, value);
    }

    /* Run within transaction context */
    __autoOPSZChangeHandler(event) {
        event.preventDefault();
        const autoOPSZ = this._autoOPSZInput.checked;
        this.getEntry('autoOPSZ').set(autoOPSZ);

        const axesLocations = this.getEntry('axesLocations')
          , axisTag = 'opsz'
          , defaultValue = this.axesGet(axisTag)['default']
          , value = autoOPSZ
                        ? defaultValue // will get deleted
                        : this._fontSize
                        ;
        this._setOrReset(axesLocations, axisTag, value, defaultValue);
    }

     /* Run within transaction context */
    __axisChangeHandler(axisTag, value) {
        const axesLocations = this.getEntry('axesLocations');
        axesLocations.setSimpleValue(axisTag, value);
    }

    /* Run within transaction context */
    __styleSelectChangeHandler(locations) {
        const axesLocations = this.getEntry('axesLocations');
        for(const [axisTag, locationValue] of Object.entries(locations)) {
            const defaultValue = this.axesGet(axisTag)['default']
              , value = (axisTag === 'opsz' && this.getEntry('autoOPSZ').value)
                    ? defaultValue // will get deleted
                    : locationValue
                    ;
            this._setOrReset(axesLocations, axisTag, value, defaultValue);
        }
    }

    static CUSTOM_STYLE_VALUE = 'custom'; //jshint ignore:line

    _newStyleSelect({insertElement, changeHandler},  instances) {
        const container = this._domTool.createElementfromHTML('label', {}
                        , `Style: <select><select/>`)
          , widget = {
                container: container
              , input: container.querySelector('select')
              , _domTool: this._domTool
              , _instances: []
              , _locationsIndexesCache: new Map()
              , _getLocationsIndex(ignoreSet) {
                    const keyOfIndex = (!ignoreSet || ignoreSet.size === 0)
                        ? ''
                        : Array.from(ignoreSet).sort().join(';')
                        ;
                    if(!this._locationsIndexesCache.has(keyOfIndex)) {
                        const index = new Map();
                        for(const [i, [/*name*/, locations]] of this._instances.entries()) {
                            const key = this._locationsToKey(locations, ignoreSet);
                            index.set(key, i);
                        }
                        this._locationsIndexesCache.set(keyOfIndex, index);
                    }
                    return this._locationsIndexesCache.get(keyOfIndex);
                }
              , setInstances(instances) {
                    this._instances = instances;
                    // instances = this.parentAPI.getFont().instances
                    const makeOption = (value, label)=>this._domTool
                                    .createElement('option', typeof value !== 'object' ? {value} : value, label)
                      , options = []
                      ;

                    if(instances.length)
                        this.container.style.removeProperty('display');
                    else
                        this.container.style.display = 'none';

                    options.push(makeOption({
                            value: UIManualAxesLocations.CUSTOM_STYLE_VALUE
                         , disabled: '1'
                    }, '(custom value)'));

                    this._locationsIndexesCache.clear();
                    for(const [i, [name/*, locations*/]] of instances.entries())
                        options.push(makeOption(i, name));

                    this._domTool.clear(this.input);
                    this.input.append(...options);
                    this.input.value = UIManualAxesLocations.CUSTOM_STYLE_VALUE;
                }

              , setValue(locations, autoOPSZ=false) {
                    this.input.value = this._getInstanceValueForLocations(locations, autoOPSZ);
                }
              , remove: function() {
                    this.container.remove();
                }
              , destroy: function(){/* nothing to do */}
              , _locationsToKey(locations, ignoreTags=null) {
                    return Object.entries(locations)
                                .sort(([tagA], [tagB])=>{
                                       if (tagA < tagB)
                                            return -1;
                                        if (tagA > tagB)
                                            return 1;
                                        return 0;
                                })
                                .filter(([axisTag])=>!(ignoreTags && ignoreTags.has(axisTag)))
                                .map(([axisTag, val])=>`${axisTag}:${val}`)
                                .join(';')
                                ;
                }
              , getCurrentLocations() {
                    if(this.input.value === UIManualAxesLocations.CUSTOM_STYLE_VALUE)
                        return undefined;
                    return this._instances[this.input.value]?.[1];
                }
              , _getInstanceValueForLocations(locations, autoOPSZ=false) {
                    // autoOPSZ===true means, if there's an opsz key
                    // in locations ignore it!
                    const ignoreSet = autoOPSZ ? new Set(['opsz']) : null
                      , key = this._locationsToKey(locations, ignoreSet)
                      , index = this._getLocationsIndex(ignoreSet)
                      , value = index.get(key)
                      ;
                    return value !== undefined
                                    ? value
                                    : UIManualAxesLocations.CUSTOM_STYLE_VALUE
                                    ;
                }
            }
          ;
        widget.input.addEventListener('change', (/*event*/)=>{
            const locations = widget.getCurrentLocations();
            if(!locations)
                return;
            changeHandler(locations);
        });
        widget.setInstances(instances);
        insertElement(widget.container);
        return widget;
    }

    _newCheckbox({insertElement, changeHandler}, label) {
        const container = this._domTool.createElementfromHTML('label', {}
                        , `<input type="checkbox" /> ${label}`)
          , widget = {
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
              , destroy: function(){/*nothing to do*/}
              , setDisplay(show) {
                    if(show)
                        this.container.style.removeProperty('display');
                    else
                        this.container.style.display = 'none';
                }
              , disable() {
                    this.container.classList.add('disabled');
                    this.input.disabled = true;
                }
              , enable() {
                    this.container.classList.remove('disabled');
                    this.input.disabled = false;
                }
            }
          ;
        widget.input.addEventListener('change', changeHandler);
        insertElement(widget.container);
        return widget;
    }

    _toggleAxesDisplay() {
        const displayAll = this._viewAllAxes.checked
          , alwaysDisplayed = new Set(UIManualAxesLocations.REGISTERED_AXES_ORDERED)
          ;
        for(const [axesTag, widget] of this._axesInterfaces.entries()) {
            if(alwaysDisplayed.has(axesTag))
                // Never hidden, must not be turned back on.
                continue;
            widget.setDisplay(displayAll);
        }
    }

    _cleanUp() {
        this._localAxesLocations = {};
        for(const axisUi of this._axesInterfaces.values())
            axisUi.destroy();
        this._axesInterfaces.clear();

        if(this._styleSelect) {
            this._styleSelect.destroy();
            this._styleSelect = null;
        }

        if(this._autoOPSZInput) {
            this._autoOPSZInput.destroy();
            this._autoOPSZInput = null;
        }

        if(this._viewAllAxes) {
            this._viewAllAxes.destroy();
            this._viewAllAxes = null;
        }

        for(const element of this._insertedElements)
            this._domTool.removeNode(element);
        this._insertedElements.splice(0, Infinity);
    }

    _initUI() {
        const insertElement = (...elements)=>{
            this.element.append(...elements);
            this._insertedElements.push(...elements);
        };

        this._styleSelect = this._newStyleSelect({
            insertElement
          , changeHandler: this._styleSelectChangeHandler.bind(this)
        }, this._font.instances);

        // This is kind of internal state an currently not serialized or a dependency of something.
        this._viewAllAxes = this._newCheckbox({
            insertElement
          , changeHandler: this._toggleAxesDisplay.bind(this)
        }, 'View all axes');

        const opszDelayedInserted = [];
        if(this.axesHas('opsz')) {
            this._autoOPSZInput = this._newCheckbox({
                insertElement: (...elements)=>opszDelayedInserted.push(...elements)
              , changeHandler: this._autoOPSZChangeHandler.bind(this)
            }, 'Mirror size changes');
        }

        const alwaysDisplayed = new Set(UIManualAxesLocations.REGISTERED_AXES_ORDERED);
        let hasHiddenAxes = false
        //  , hasNonDefaultHiddenAxes = false => would be nice on font change/initially to detect and then show the hidden axes
          ;
        for(const axisTag of [UIManualAxesLocations.REGISTERED_AXES_ORDERED, ...this.axesTags()]) {
            if(this._axesInterfaces.has(axisTag))
                //seen
                continue;
            if(!this.axesHas(axisTag))
                // It's in REGISTERED_AXES_ORDERED but not in the font
                continue;

            const {name, min, max, 'default':defaultVal} = this.axesGet(axisTag);
            this._localAxesLocations[axisTag] = defaultVal;

            if(!alwaysDisplayed.has(axisTag))
                hasHiddenAxes = true;

            const input = new UINumberAndRangeInput(
                    Object.assign(
                        Object.create(this.parentAPI)
                      , {
                            insertElement: insertElement
                          , changeHandler: value=>this._axisChangeHandler(axisTag, value)
                        }
                    )
                  , `axis-${axisTag}`, `${name} (${axisTag})`, undefined
                  , {min, max, /*step,*/ value: defaultVal}
            );
            // insert after the element
            if(axisTag === 'opsz')
                insertElement(...opszDelayedInserted);

            this._axesInterfaces.set(axisTag, input);
        }

        this._viewAllAxes.setDisplay(hasHiddenAxes);
    }

    axesHas(axisTag) {
        return axisTag in this._font.axisRanges;
    }
    axesGet(axisTag) {
        if(!this.axesHas(axisTag))
            throw new Error(`KEY ERROR ${axisTag} not found in font "${this._font.fullName}".`);
        return this._font.axisRanges[axisTag];
    }
    axesTags() {
        return Object.keys(this._font.axisRanges);
    }

    *axesEntries() {
        for(const axisTag of this.axesTags())
            yield [axisTag, this.axesGet(axisTag)];
    }

    _getValueForAxis(axisTag) {
        return this._axesLocations.has(axisTag)
                    ? this._axesLocations.get(axisTag).value
                    : this.axesGet(axisTag)['default']
                    ;
    }

    _updateValueToAxisInterface(axisTag, value) {
        if(!this._axesInterfaces.has(axisTag))
            throw new Error(`KEY ERROR axis interface for axis tag "${axisTag}" not found.`);
        const widget = this._axesInterfaces.get(axisTag);
        widget.update(new Map([['value', {value}]]));
        this._localAxesLocations[axisTag] = value;
    }

    /**
     * opsz slider value depends on:
     * though, if there's no opsz, we don't need to care!
     *          font (has opsz, defaultVal)
     *          autoOPSZ: true false
     *          if autoOPSZ:
     *              fontSize
     *          else:
     *              axesLocations: get('opsz') or font.opsz.defaultVal
     */
    _updateOPSZAxisInterface(changedMap) {
        const autoOPSZ = this._autoOPSZInput.checked
          , requireUpdate = changedMap.has('autoOPSZ') // always
                      || changedMap.has('font') // always
                      || (autoOPSZ
                                ? changedMap.has('fontSize')
                                : changedMap.has('axesLocations')
                          )
          ;
        if(!requireUpdate)
            return;

        const value = autoOPSZ
                ? this._fontSize
                : this._getValueForAxis('opsz')
                ;
        this._updateValueToAxisInterface('opsz', value);
    }

    _update (changedMap) {
        console.log(`Widget ${this.constructor.name} changedMap:`, ... changedMap);
        if(changedMap.has('font')) {
            // Store this locally, for reading. Could also get
            // it anytime from the parentAPI, but we have the reference
            // now and we'll get informed when it changes.
            // Also, storing the raw value, not the Model wrapper.
            this._font = changedMap.get('font').value;
            // Do this now or maybe wait? Technically it has to come
            // first, the other changes should always be applicaple
            // to the widget state created here.
            this._cleanUp();
            this._initUI();

            // This is about internally managed state, however, after rebuilding
            // the axes in initUI we need to run this.
            this._toggleAxesDisplay();
        }
        // From now on expect that this._axesInterfaces is in sync
        // with the current font.

        if(changedMap.has('fontSize'))
            // depending on autoOPSZ must change opsz axis
            this._fontSize = changedMap.get('fontSize').value;

        if(this.axesHas('opsz') && (changedMap.has('autoOPSZ') || changedMap.has('font'))) {
            this._autoOPSZInput.checked = !!(changedMap.has('autoOPSZ')
                                                ? changedMap.get('autoOPSZ')
                                                : this.getEntry('autoOPSZ')
                                            ).value;
            this._axesInterfaces.get('opsz').passive = this._autoOPSZInput.checked;
        }

        // axesLocations
        //    axes in the font that are not in axesLocations should be set to their default
        //    I'm kind of interested to distinguish between explicitly default, i.e. the location
        //    equals the default value vs. implicitly default, i.e. no explicit location is set.
        //    Would be nice to control this in the UI as well.
        //    The control so far
        //           explicit: the value is in axesLocations
        //           implicit: the value is not axesLocations
        if(changedMap.has('axesLocations') || changedMap.has('font')) {
            const axesLocations = changedMap.has('axesLocations')
                                        ? changedMap.get('axesLocations')
                                        : this.getEntry('axesLocations')
                                        ;
            this._axesLocations = axesLocations;
            for(const axisTag of this.axesTags()) {
                if(axisTag === 'opsz')
                    // taken care of separately
                    continue;
                const value = this._getValueForAxis(axisTag);
                // It's interesting: in a way, the sub-ui's could listen
                // directly to their entry at axesLocations/{axisTag}
                // but on the other hand, because we want to set defaults
                // in here when nothing is in axesLocations and that requires
                // updating as well, we do it directly here.
                // Maybe there will be/is a nicer way to implement behavior
                // like this. I.e. when the entry is DELETED the UI knows
                // it's default and sets it by itself.
                this._updateValueToAxisInterface(axisTag, value);
            }
        }

        if(this.axesHas('opsz'))
            // run this last, it depends on the previous values
            this._updateOPSZAxisInterface(changedMap);
    }

    update(changedMap) {
        // Because of the handling of this._localAxesLocations
        // the actual this._update(changedMap); is wrapped in
        // a try finally block, so we can reset this._localAxesLocations
        // again if required.
        // detecting local change of absolute axes coordinates
        const originalLocations = this._localAxesLocations;
        // Note: this._cleanUp will replace this._localAxesLocations
        this._localAxesLocations =  Object.create(originalLocations);

        try {
            this._update(changedMap);
        }
        finally {
            this._updateStyleSelect(originalLocations, this.axesHas('opsz') && this._autoOPSZInput.checked);
        }
    }

    _updateStyleSelect(originalLocations, autoOPSZ) {
        // only update when there are changes!
        let requireUpdateStyleSelect = false;
        if(Object.getPrototypeOf(this._localAxesLocations) === originalLocations) {
            if(Object.keys(this._localAxesLocations).length > 0) {
                // found changed keys, replace with flattened update ...
                this._localAxesLocations = Object.assign({}, originalLocations, this._localAxesLocations);
                requireUpdateStyleSelect = true;
            }
            else
                // no require change, rewind...
                this._localAxesLocations = originalLocations;
        }
        else
            // this._localAxesLocations was replaced (by this._cleanUp)
            requireUpdateStyleSelect = true;

        if(requireUpdateStyleSelect && this._styleSelect)
            this._styleSelect.setValue(this._localAxesLocations, autoOPSZ);
    }
}

class KeyMomentsTimeline extends UIBase {
    [UPDATE_STRATEGY] = UPDATE_STRATEGY_COMPARE; // jshint ignore:line
    //jshint ignore:start
    static TEMPLATE = `<div class="key_moments_timeline">
        <h3>Key-Moments Timeline</he>
        <ol class="key_moments_timeline-items"></ol>
        <div>
            <button class="key_moments_timeline-add_moment" title="Add Moment">+ add</button><!--
            --><button class="key_moments_timeline-remove_moment" title="Remove Active Moment">- remove</button>
        </div>
        <div>
            <button class="key_moments_timeline-select_previous" title="Select Previous">⇤ select previous</button><!--
            --><button class="key_moments_timeline-select_next" title="Select Next">select next ⇥</button>
        </div>
</div>`;
    static KEY_MOMENT_BUTTON_TEMPLATE=`<li>
    <button class="key_moments_timeline-button" title="Select"></button>
</li>`;
    //jshint ignore:end
    constructor(parentAPI) {
        super(parentAPI);
        [this.element, this.itemsContainer, this.addButton, this.removeButton
            , this.previousButton, this.nextButton] = this.initTemplate();
    }

    initTemplate() {
        const frag = this._domTool.createFragmentFromHTML(this.constructor.TEMPLATE)
          , element = frag.firstElementChild
          , itemsContainer = element.querySelector('.key_moments_timeline-items')
          , addButton = element.querySelector('.key_moments_timeline-add_moment')
          , removeButton = element.querySelector('.key_moments_timeline-remove_moment')
          , previousButton = element.querySelector('.key_moments_timeline-select_previous')
          , nextButton = element.querySelector('.key_moments_timeline-select_next')
          ;
        addButton.addEventListener('click', this._changeStateHandler((/*event*/)=>{
            const keyMoments = this.getEntry('keyMoments')
              , activeKeyMoment = this.getEntry('activeKeyMoment')
              ;
            if(activeKeyMoment.value !== ForeignKey.NULL) {
                    // Insert a copy of the active entry.
                    // Not sure if unwrapPotentialWriteProxy is required,
                    // but it doesn't hurt.
                const newEntry = unwrapPotentialWriteProxy(keyMoments.get(activeKeyMoment.value))
                    // Insert after active entry.
                  , index = parseInt(activeKeyMoment.value, 10) + 1
                  ;
                keyMoments.splice(index, 0, newEntry.isDraft ? newEntry.metamorphose({}) : newEntry);
                // select new entry
                activeKeyMoment.value = `${index}`;
            }
            else {
                      // FIXME: duplication, seen in model coherenceFunction "prepare"!
                const newEntry = keyMoments.constructor.Model.createPrimalState(keyMoments.dependencies)
                    // just insert at end
                  , size = keyMoments.push(newEntry)
                  ;
                // select new entry
                activeKeyMoment.value = `${size - 1}`;
            }
        }));
        removeButton.addEventListener('click', this._changeStateHandler((/*event*/)=>{
            const keyMoments = this.getEntry('keyMoments')
              , activeKeyMoment = this.getEntry('activeKeyMoment')
              ;
            if(activeKeyMoment.value !== ForeignKey.NULL)
                keyMoments.delete(activeKeyMoment.value);
        }));

        const _changeActiveMoment = changeAmount=>{
            const keyMoments = this.getEntry('keyMoments')
              , activeKeyMoment = this.getEntry('activeKeyMoment')
              , size = keyMoments.size
              ;
            if(size === 0)
                return ForeignKey.NULL;
            const maxIndex = size - 1;
            let newIndex;
            if(activeKeyMoment.value === ForeignKey.NULL) {
                if(changeAmount === 0)
                    newIndex = ForeignKey.NULL;
                else if(changeAmount > 0)
                    // (maxIndex + 1) % size === 0
                    newIndex = (maxIndex + changeAmount) % size;
                else
                    // (size - 1) % size = maxIndex
                    newIndex = (size + changeAmount) % size;
            }
            else {
                const current = parseInt(activeKeyMoment.value, 10);
                newIndex = (current + changeAmount) % size;
            }
            if(newIndex < 0)
                // We've used % size everywhere, thus this will result
                // in a valid index.
                newIndex = size + newIndex;
            activeKeyMoment.value = typeof newIndex === 'number'
                                            ? `${newIndex}`
                                            : newIndex
                                            ;
        };
        previousButton.addEventListener('click', this._changeStateHandler((/*event*/)=>{
            return _changeActiveMoment(-1);
        }));
        nextButton.addEventListener('click', this._changeStateHandler((/*event*/)=>{
            return _changeActiveMoment(+1);
        }));

        this._insertElement(element);
        return [element, itemsContainer, addButton, removeButton
              , previousButton, nextButton];
    }
    _createKeyMomentButton(key, keyMoment) {
        const listItem = this._domTool.createFragmentFromHTML(this.constructor.KEY_MOMENT_BUTTON_TEMPLATE).firstElementChild
          , button = listItem.querySelector('.key_moments_timeline-button')
          , label = keyMoment.get('label')
          ;
        button.textContent = label.value
            ? `#${key}: ${label.value}`
            : `#${key}`
            ;
        button.addEventListener('click', this._changeStateHandler((/*event*/)=>{
            const activeKeyMoment = this.getEntry('activeKeyMoment');
            activeKeyMoment.value = (activeKeyMoment.value === key)
                ? ForeignKey.NULL // unselect if active button is clicked
                : key
                ;
        }));
        return [listItem, button];
    }
    initialUpdate(rootState) {
        const compareResult = StateComparison.createInitial(rootState, this.parentAPI.wrapper.dependencyMapping);
        this.update(compareResult);
    }
    update(compareResult) {
        // console.log(`${this.constructor.name}.update(compareResult):`, compareResult);
        // compareResult.toLog();
        // console.log('dependencyMapping', this.parentAPI.wrapper.dependencyMapping);
        const changedMap = compareResult.getChangedMap(this.parentAPI.wrapper.dependencyMapping);
        // console.log('compareResult.getChangedMap(this.parentAPI.wrapper.dependencyMapping)', changedMap);
        // console.log('compareResult.getDetaislMap()', compareResult.getDetaislMap());

        // TODO: try out changing based on LIST_NEW_ORDER state
        if(changedMap.has('keyMoments')) {
            const keyMoments = changedMap.get('keyMoments')
              , activeKeyMoment = changedMap.has('activeKeyMoment')
                     ? changedMap.get('activeKeyMoment')
                     : this.getEntry('activeKeyMoment')
                // FIXME: I really dislike having to set state that
                //        did not change: need a way for this to be
                //        less effort!
                //        The pattern can be found more often above as well!
              , activeKey = activeKeyMoment.value === ForeignKey.NULL
                        ? null
                        : activeKeyMoment.value
              ;

            this.previousButton.disabled = keyMoments.size < 2;
            this.nextButton.disabled = keyMoments.size < 2;

            this._domTool.clear(this.itemsContainer);
            for(const [key, keyMoment] of keyMoments) {
                const [li] = this._createKeyMomentButton(key, keyMoment);
                if(activeKey === key)
                    li.classList.add('active');
                this.itemsContainer.append(li);
            }
        }

        if(changedMap.has('activeKeyMoment')) {
            const activeKeyMoment = changedMap.get('activeKeyMoment')
              , activeIndex = activeKeyMoment.value === ForeignKey.NULL
                        ? null
                        : parseInt(activeKeyMoment.value, 10)
              ;

            this.removeButton.disabled = activeIndex === null;

            for(const[i, li] of Array.from(this.itemsContainer.children).entries()){
                if(activeIndex === i)
                    li.classList.add('active');
                else
                    li.classList.remove('active');
            }
        }
    }
}


class WidgetWrapper {
    constructor(parentAPI, dependencyMappings
                , {hostElement=null, rootPath=null, activationTest=null}
                , WidgetClass, ...widgetArgs) {
        this.WidgetClass = WidgetClass;
        this.host = hostElement;
        this._activationTest = activationTest;
        // store inserted elements, to be removable again
        this.insertedElements = [];
        this.dependencyMapping = dependencyMappings;

        Object.defineProperty(this, 'dependencies', {
            // get: ()=>new Set(this.dependencyMapping.keys())
            get(){
                throw new Error(`NOT IMPLEMENTED getter "dependencies" in [object ${this.constructor.name}]`);
            }
        });


        this.dependencyReverseMapping = new Map([...this.dependencyMapping]
                        .map(([external, internal])=>[internal, external]));

        this.parentAPI = {
                ...parentAPI
              , insertElement: this.insertElement.bind(this)
              , rootPath: rootPath || parentAPI.rootPath
              , getEntryRaw: parentAPI.getEntry
              , getEntry: (internalName)=>{
                  const externalName = this.dependencyReverseMapping.has(internalName)
                        ? this.dependencyReverseMapping.get(internalName)
                        : internalName
                        ;
                  return parentAPI.getEntry(externalName);
                }
              , grandParentAPI: parentAPI
              , wrapper: this
        };
        this._widgetArgs = widgetArgs;
        this.widget = null;
    }
    // could be an exported function
    static insertElement (insertedElements, target, element) {
            const elements = [];
            if(element.nodeType === target.DOCUMENT_FRAGMENT_NODE)
                // resolve the fragment, so we can keep track of the
                // inserted elements
                elements.push(...element.childNodes);
            else
                elements.push(element);
            insertedElements.push(...elements);
            target.append(...elements);
    }
    insertElement(element) {
        this.constructor.insertElement(this.insertedElements, this.host, element);
    }

    activationTest() {
        if(!this._activationTest)
            // If there's no test, always activate!
            return true;
        return this._activationTest();
    }
    create() {
        if(this.widget !== null)
            throw new Error(`Widget, a ${this.WidgetClass.name}, is already created.`);
        this.widget = new this.WidgetClass(this.parentAPI, ...this._widgetArgs);
        return this.widget;
    }
    destroy() {
        if(this.widget)
            this.widget.destroy();
        this.widget = null;
        for(const node of this.insertedElements)
            // not using node.remove(), because it may be an Element,
            // but it cold also be a textNode or a Comment etc. and
            // and only Element has the remove method.
            node.parentNode.removeChild(node);
        this.insertedElements.splice(0, Infinity);
    }
}

export class UIControllerBase extends UIBase {
    [UPDATE_STRATEGY] = UPDATE_STRATEGY_COMPARE; // jshint ignore:line
    // Looking initially for three (then four) target zones.
    //    main => in the sidebar in desktop sizes
    //    before-layout => where we put the animation controls
    //    layout => entirely controlled by the layout widget.
    //    (after-layout =>below proof, maybe for animation editing/keyframes etc. not yet implemented)
    constructor(parentAPI, zones, widgets) {
        super(parentAPI);
        // We need a way to organize layout widgets/uis and to give them
        // a fixed place to be, maybe sub-zones or so, maybe the widget
        // could insert "insert: " comments into the zones and use those
        // to self-organize. no comment found or no target given: append
        // the rest is just about insertion order and widgets can of course
        // group themselves sub widgets together...
        this._zones = zones;

        // for now, to get started, just the permanent residents (font and layout chooser)
        this._widgets = [];
        for(const [settings, dependencyMappings, Constructor, ...args] of widgets) {
            const hostElement = this._zones.get(settings.zone) || null
              , absoluteDependencyMappings = this._absPathDependencies(dependencyMappings || [])
              , widgetWrapper = new WidgetWrapper(parentAPI, absoluteDependencyMappings
                                    , {hostElement, ...settings}
                                    , Constructor, ...args)
              ;
            this._widgets.push(widgetWrapper);
        }
    }

    _absPathDependencies(dependencyMappings) {
        let result = new Map();
        // For convenience, we can skip one part of a one to one mapping:
        //      entry = 'hello' =>   'hello': 'hello'
        //      entry = ['hello'] => 'hello': 'hello'
        //      entry = ['hello', 'world'] => 'hello': 'world'
        for(const entry_ of dependencyMappings) {
            const entry = Array.isArray(entry_) ? entry_ : [entry_]
              , external = entry.at(0)
              , internal = entry.at(-1) === undefined ? external : entry.at(-1)
              ;
                // without actually knowing the model structure, the save
                // way to do this is to remove single dot path parts and
                // reduce consecutive slashes into single slashes.
                // Double dots are be handled as well, e.g.:
                //      '/hello/beautiful/../world' => '/hello/world'
                // This is just simple path arithmetic, e.g. not following
                // links, which are implemented in the model. Links would
                // have to be resolved first in place, before applying
                // removal of path parts via "..".
            const absoluteExternal = external.startsWith('/')
                    ? Path.stringSanitize(external)
                    : this.parentAPI.rootPath.append(external).toString()
                    ;
            result.set(absoluteExternal, internal);
        }
        return result;
    }

    destroy() {
        for(const widgetWrapper of this._widgets)
            widgetWrapper.destroy();
    }

    *activeWidgets() {
        for(const widgetWrapper of this._widgets) {
            if(widgetWrapper.widget === null)
                continue;
            yield widgetWrapper;
        }
    }

    get dependencies() {
        const dependencies = new Set();
        for(const widgetWrapper of this.activeWidgets()) {
            for(const path of widgetWrapper.dependencyMapping.keys())
                dependencies.add(path);
            // NOTE: currently, intances of UIControllerBase are not
            //       using dependency mapping and hence, they don't produce
            //       dependencies via widgetWrapper.dependencies

            // This is old and can go.
            // I guess I skip these, as they are to be handled in the
            // UIControllerBase itself.
            // if(widgetWrapper.WidgetClass.prototype instanceof UIControllerBase) {
            //     // FIXME: widget might be null!
            //     for(const path of widgetWrapper.widget.dependencies)
            //         dependencies.add(path);
            // }
        }
        return dependencies;
    }

    _provisionWidgets() {
        const requiresFullInitialUpdate = new Set();
        for(const widgetWrapper of this._widgets) {
            const shouldBeActive = widgetWrapper.activationTest()
              , isActive = widgetWrapper.widget !== null
              ;
            if(shouldBeActive === isActive)
                // Nothing to do:
                //          shouldBeActive && isActive
                //       || !shouldBeActive && !isActive
                //  No action required here.
                continue;

            if(!shouldBeActive && isActive) {
                widgetWrapper.destroy();
            }
            else if(shouldBeActive && !isActive) {
                    widgetWrapper.create();
                    requiresFullInitialUpdate.add(widgetWrapper);
                    // TODO: requires full initial update!
                    // widgetWrapper.widget.initialUpdate(rootState);
            }
        }
        return requiresFullInitialUpdate;
    }

    initialUpdate(rootState) {
        const requiresFullInitialUpdate = this._provisionWidgets();
        // NOTE: initially all dependencies have changed from the perspective
        // of the UI. Later, we must do a similar thing when widget controllers
        // are initialized after change (or any UI element), however, this should
        // probably be handled by the MainUIController, which thus needs access to
        // the current root state (root from it's own perspective).

        console.log(`${this.constructor.name}.initialUpdate`, this, 'rootState', rootState);
        // FIXME: this is a good method to bootstrap any new
        //        UIController, it should be in general.mjs
        //
        // However, this is interesting, as A) we don't check if
        // path is actually in state!
        // And B) a new/changed  controllers will change dependencies
        // of this._ui dynamically.
        // Further C) it seems like this would produce changedMap entries
        // for UI-widgets that might get destroyrd when processing.
        // A) will be done in compareResult.getChangedMap, however it's not
        //    necessarily obious there that the missing path originated
        //   in ui.dependencies
        //  B) We'll have to execute this

        // for(let path of this.dependencies) {
        //     const pathInstance = Path.fromString(path);
        //     compareResult.push([COMPARE_STATUSES.NEW, undefined, pathInstance]);
        // }

        // This will only be complete for simple widgets, not container
        // widgets "UIControllerBase"
        const compareResult = StateComparison.createInitial(rootState, this.dependencies);
        this._update(compareResult, requiresFullInitialUpdate, true);
    }

    update(compareResult) {
        const requiresFullInitialUpdate = this._provisionWidgets();
        this._update(compareResult, requiresFullInitialUpdate, false);
    }

    // FIXME: this method still is under construction!
    _update(compareResult, requiresFullInitialUpdateSet, isInitialUpdate) {
        // FIXME: thinking in the update case, we should probably get
        //        rootState from the caller, to make it controllable
        //        that the compareResult is based on the same state.
        //        Especially if we're going to do delayed updates for
        //        some UI widgets, e.g. the window adress bar.
        const changedRootMap = compareResult.getChangedMap(this.dependencies, false);

        console.log(`${this.constructor.name}.update changedRootMap:`, changedRootMap);
        for(const widgetWrapper of this.activeWidgets()) {
            const requiresFullInitialUpdate = requiresFullInitialUpdateSet.has(widgetWrapper)
              , widget = widgetWrapper.widget
              ;
            if(widgetWrapper.widget[UPDATE_STRATEGY] === UPDATE_STRATEGY_SIMPLE) {
                // The child is a regular/simple type
                // FIXME: it may already be a full initial,
                //        if called via initialUpdate!
                //        actually
                const  _compareResult = (!isInitialUpdate && requiresFullInitialUpdate)
                        ? StateComparison.createInitial(compareResult.newState, widgetWrapper.dependencyMapping)
                        : compareResult
                    // This means just that the widget expects a changeLocaldMap
                    // not a more complex structure, but more complex structures will
                    // likely be required at some point.
                  , changeLocaldMap = _compareResult.getChangedMap(widgetWrapper.dependencyMapping, true)
                  ;
                if(changeLocaldMap.size)
                    widget.update(changeLocaldMap);
            }
            else if(widget[UPDATE_STRATEGY] === UPDATE_STRATEGY_COMPARE) {
                // e.g.  widgetWrapper.WidgetClass.prototype instanceof UIControllerBase

                // OK, so in this case the **child** is a container type
                // "UIControllerBase"  widgetWrapper.dependencies are ignored
                // and so far they don't produce any dependencies for this
                // kind anyways.


                // The update interface is already taken by this method
                // This basically means, so far, that dependencyMapping
                // for a UIControllerBase has no effect, as the update
                // method will be called anyways with the complete
                // changed-Map.
                if(requiresFullInitialUpdate)
                    widget.initialUpdate(compareResult.newState);
                else
                    // Use the original compare result to cause less
                    // updates i.e. only partial/required updates.
                    widget.update(compareResult);
            }
            else {
                console.log('widgetWrapper.widget', widget);
                throw new Error(`UPDATE_STRATEGY unkown for ${widget}: ${widget[UPDATE_STRATEGY].toString()}`);
            }
        }
    }
}

class ExampleLayoutController extends UIControllerBase {
    constructor(parentAPI, zones) {
        const widgets = [
            [
                {zone: 'layout'}
              , [
                    ['../font', 'font']
                  , 'fontSize'
                  , ['manualAxesLocations/axesLocations', 'axesLocations']
                  , ['manualAxesLocations/autoOPSZ', 'autoOPSZ']
                ]
              , SimpleProof
            ]
          , [
                {zone: 'main'}
              , [
                    ['fontSize', 'value']
                ]
              , UINumberAndRangeInput
              , 'font_size' // base-id
              , 'Font Size' // label
              , 'pt'// unit
              , {min:6, max:280, value:6, step:1} // minMaxValueStep => set attribute
            ]
          , [
                {zone: 'main'}
              , [
                    ['fontSize', 'fontSize']
                  , ['../font', 'font']
                  , ['manualAxesLocations/axesLocations', 'axesLocations']
                  , ['manualAxesLocations/autoOPSZ', 'autoOPSZ']
                ]
              , UIManualAxesLocations
            ]
        ];
        super(parentAPI, zones, widgets);
    }
}


// can be anything, a label etc...
export class StaticTag extends UIBase {
    constructor(parentAPI, tag, attr, contents) {
        super(parentAPI);
        this.element = this._domTool.createElement(tag, attr, contents);
        this._insertElement(this.element);
    }
}

class MoveItemInListButton extends UIBase {
    // jshint ignore:start
    static BACKWARD = Symbol('MOVE_ITEM_IN_LIST_BUTTON_BACKWARD');
    static FORWARD = Symbol('MOVE_ITEM_IN_LIST_BUTTON_FORWARD');
    static baseClass = 'ui_move_item_in_list_button';
    static setings = {
        [MoveItemInListButton.BACKWARD]: {
            title: 'Move item one position backward.'
          , classToken: 'backward'
          , label: '⇇ move backward'
        }
      , [MoveItemInListButton.FORWARD]: {
           title: 'Move item one position forward.'
         , classToken: 'forward'
         , label: 'move forward ⇉'
        }
    };
    // jshint ignore:end
    constructor(parentAPI, action) {
        super(parentAPI);
        const settings = this.constructor.setings[action];
        this.element = this._domTool.createElement('button', {
                'class': `${this.constructor.baseClass} ${this.constructor.baseClass}-${settings.classToken}`
              , title: settings.title
            }, settings.label);
        this.element.addEventListener('click', this._changeStateHandler((/*event*/)=>{
            const list = this.getEntry('list')
              , key =  this.getEntry('key')
              ;
            // Currently we don't show this widget if there's no
            // active KeyMoment, but the results of these checks
            // could also be used to change display properties in update ...
            if(list.size <= 1)
                // no elemet or one element: no move required
                return;
            if(key.value === ForeignKey.NULL)
                // no element to act on
                return;
            const index = parseInt(key.value, 10);
            if(action === MoveItemInListButton.FORWARD) {
                // [X, A, B, C, D] => [A, X, B, C, D] // X = 0 => .slice(0, 2, ...[A, X])
                // [A, X, B, C, D] => [A, B, X, C, D] // X = 0 => .slice(1, 2, ...[B, X])
                // [A, B, X, C, D] => [A, B, C, X, D] // X = 0 => .slice(2, 2, ...[C, X])
                // [A, B, C, X, D] => [A, B, C, D, X] // X = 0 => .slice(3, 2, ...[D, X])
                // FINALLY:
                // [A, B, C, D, X] => [X, A, B, C, D] // X = 0 => .slice(0, Infinity, ...[X, A, B, C, D])
                //                                                .push(.pop())
                if(index === list.size - 1)
                    list.unshift(list.pop());
                else
                    // we checked already, list.size is > 1
                    // also, index !== list.size - 1
                    list.splice(index
                              , 2
                              , list.get(index + 1)
                              , list.get(index)
                    );
                key.set( (index === list.size - 1) ? '0': `${list.keyToIndex(index + 1)[0]}`);
            }
            else if(action === MoveItemInListButton.BACKWARD){
                // [A, B, C, D, X] => [A, B, C, X, D] // X = 0 => .slice(3, 2, ...[X, D])
                // [A, B, C, X, D] => [A, B, X, C, D] // X = 0 => .slice(2, 2, ...[X, C])
                // [A, B, X, C, D] => [A, X, B, C, D] // X = 0 => .slice(1, 2, ...[X, B])
                // [A, X, B, C, D] => [X, A, B, C, D] // X = 0 => .slice(0, 2, ...[X, A])
                // FINALLY:
                // [X, A, B, C, D] => [A, B, C, D, X] // X = 0 => .slice(0, Infinity, ...[A, B, C, D, X])
                if(index === 0)
                    list.push(list.shift());
                else
                    list.splice(index - 1
                              , 2
                              , list.get(index)
                              , list.get(index - 1)
                    );
                key.set(`${list.keyToIndex(index - 1)[0]}`);
            }
            else
                throw new Error(`TYPE ERROR action unkown ${action.toString()}.`);
        }));
        this._insertElement(this.element);
    }
    update(changedMap) {
        const list = changedMap.has('list')
                        ? changedMap.get('list')
                        : this.getEntry('list')
          , key = changedMap.has('key')
                        ? changedMap.get('key')
                        : this.getEntry('key')
          ;
        this.element.disabled = key.value === ForeignKey.NULL || list.size < 2;
    }
}

class KeyMomentController extends UIControllerBase {
    constructor(parentAPI, zones) {
        const widgets = [
            [
                {zone: 'main'}
              , []
              , StaticTag
              , 'h3'
              , {}
              , 'Key-Moment'
            ]
            // label
          , [
                {zone: 'main'}
              , [
                    ['label', 'value']
                ]
              , LineOfTextInput
              , 'Label'
            ]
            // duration
          , [
                {zone: 'main'}
              , [
                    ['duration', 'value']
                ]
              , UINumberAndRangeInput // should be rather just a Number, as a range is not simple for this.
              , 'key_moment-duration' // base-id
              , 'Duration' // label
              , 'ms'// unit
              , {min:0, max:10000, value:1000, step:1} // minMaxValueStep => set attribute
            ]
          , [
                {zone: 'main'}
              , [
                    ['fontSize', 'value']
                ]
              , UINumberAndRangeInput // should be rather just a Number, as a range is not simple for this.
              , 'key_moment-font_size' // base-id
              , 'Font-Size' // label
              , 'pt'// unit
              , {min:0, max:244, step:1} // minMaxValueStep => set attribute
            ]
            , [
                {zone: 'main'}
              , [
                    ['fontSize', 'fontSize']
                  , ['/font', 'font']
                  , ['manualAxesLocations/axesLocations', 'axesLocations']
                  , ['manualAxesLocations/autoOPSZ', 'autoOPSZ']
                ]
              , UIManualAxesLocations
            ]
        ];

        const myParentAPI = {
            ...parentAPI
          , getEntry: (externalName) => {
                // rootPath e.g.: /activeState/keyMoment
                // externalName e.g.: /activeState/keyMoment/fontSize
                if(this.parentAPI.rootPath.isRootOf(externalName)) {
                    // FIXME: this is a hack: resolving the linl to edit
                    //        in here should not be required.
                    //        but keyMoments is a ValueLink
                    const rest = Path.fromString(externalName).parts.slice(this.parentAPI.rootPath.parts.length)
                      , basePath = this.parentAPI.rootPath.append('..')
                      , keyMoments = parentAPI.getEntry(basePath.append('keyMoments')) // linked list
                      , activeKeyMoment = parentAPI.getEntry(basePath.append('activeKeyMoment')) // foreign key
                      , restPath = Path.fromParts(activeKeyMoment.value, ...rest)
                      ;
                    return getEntry(keyMoments, restPath);
                }
                return parentAPI.getEntry(externalName);
            }
        };
        super(myParentAPI, zones, widgets);
    }
}

class ExampleKeyMomentsLayoutController extends UIControllerBase {
    constructor(parentAPI, zones) {
        const widgets = [
            [
                {zone: 'main'}
              , [
                    ['keyMoments', 'keyMoments']
                  , ['activeKeyMoment', 'activeKeyMoment']
                ]
              , KeyMomentsTimeline
            ]
          , [
                {zone: 'main'}
              , [
                    ['keyMoments', 'list']
                  , ['activeKeyMoment', 'key']
                ]
              , MoveItemInListButton
              , MoveItemInListButton.BACKWARD // action
            ]
          , [
                {zone: 'main'}
              , [
                    ['keyMoments', 'list']
                  , ['activeKeyMoment', 'key']
                ]
              , MoveItemInListButton
              , MoveItemInListButton.FORWARD // action
            ]
          , [
                {
                   rootPath: parentAPI.rootPath.append('keyMoment')
                 , activationTest:()=>{
                        const path = parentAPI.rootPath.append('keyMoment')
                          , keyMoment = this.parentAPI.getEntry(path)
                          ;
                        return keyMoment !== ForeignKey.NULL; // i.e. it's a KeyMomentModel
                   }
                }
              , []
              , KeyMomentController
              , zones
            ]
        ];
        super(parentAPI, zones, widgets);
    }
}


/**
 * This knows a lot about the host document structure, which must comply.
 * It lso knows about the model structure, but it translates that knowledge
 * to it's children so they can be more generic.
 */
export class MainUIController extends UIControllerBase {
    // Looking initially for three (then four) target zones.
    //    main => in the sidebar in desktop sizes
    //    before-layout => where we put the animation controls
    //    layout => entirely controlled by the layout widget.
    //    (after-layout =>below proof, maybe for animation editing/keyframes etc. not yet implemented)
    constructor(parentAPI) {
        const zones = new Map([
                ['main', '.typeroof-ui_main']
              , ['before-layout', '.typeroof-layout-before']
              , ['layout', '.typeroof-layout']
              , ['after-layout', 'typeroof-layout-after']
        ].map(([name, selector])=>[name, parentAPI.domTool.document.querySelector(selector)]));
        // [zoneName, dependecyMappings, Constructor, ...args] = widgets[0]
        const widgets = [
            [
                {zone: 'main'}
              , [
                // dependencyMappings
                // path => as internal name
                    ['availableFonts', 'options']
                  , ['activeFontKey', 'value']
                ]
              , FontSelect
            ]
          , [
                {zone: 'main'}
              , []
              , AddFonts
            ]
          , [
                {zone: 'main'}
              , [
                    ['availableLayouts', 'options']
                  , ['activeLayoutKey', 'value']
                ]
              , GenericSelect
              , 'ui_layout_select'// baseClass
              , 'Layout'// labelContent
              , (key, availableLayout)=>{ return availableLayout.get('label').value; } // optionGetLabel
            ]
            // only create when activeState instanceof ExampleLayoutModel
          , [
                {
                    rootPath: parentAPI.rootPath.append('activeState')
                  , activationTest:()=>{
                        const path = parentAPI.rootPath.append('activeState')
                          , activeState = this.parentAPI.getEntry(path)
                          ;
                        return activeState.WrappedType === ExampleLayoutModel;
                    }
                }
              , []
              , ExampleLayoutController
              , zones
            ]
          , [
                {
                    rootPath: parentAPI.rootPath.append('activeState')
                  , activationTest:()=>{
                        const activeState = this.parentAPI.getEntry(parentAPI.rootPath.append('activeState'));
                        return activeState.WrappedType === ExampleKeyMomentsLayoutModel;
                    }
                }
              , []
              , ExampleKeyMomentsLayoutController
              , zones
            ]
        ];
        super(parentAPI, zones, widgets);
    }
}
