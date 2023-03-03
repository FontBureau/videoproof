/* jshint esversion: 11, browser: true, unused:true, undef:true, laxcomma: true, laxbreak: true, devel: true */


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
    get _domTool() {
        return this._parentAPI.domTool;
    }
    _insertElement(...args) {
        return this._parentAPI.insertElement(...args);
    }
    getEntry(...args) {
        return this._parentAPI.getEntry(...args);
    }
    getEntryRaw(...args) {
        return this._parentAPI.getEntryRaw(...args);
    }
    _changeState(fn) {
        return this._parentAPI.withChangeState(fn);
    }
    // This is a decorator, it return a function that when called
    // wraps fn into a call to this._parentAPI.withChangeState,
    // applying the ...args to fn when executed.
    _changeStateHandler(fn) {
        return (...args)=>this._changeState(()=>fn(...args));
    }

    constructor(parentAPI) {
        this._parentAPI = parentAPI;
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
        throw new Error(`NOT IMPLEMENTED: ${this.constructor.name}.destroy!`);
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
            // const options = this._parentAPI.getEntry('options');
            // deleted = options.arraySplice(0, 3);
        }));
        return [element, label, select];
    }

    destroy() {
        // nothing to do
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
        makeFileInput(files=>this._parentAPI.loadFontsFromFiles(...files), addFonts,
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
        this._changeHandler = this._parentAPI.changeHandler
              ? (event)=>{
                    event.preventDefault();
                    this._parentAPI.changeHandler(parseFloat(event.target.value));
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

    destroy() {
        // nothing to do
    }

    // use e.g. by UIManualAxisLocations
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
       if(changedMap.has('font')) {
           const font = changedMap.get('font').value;
           this.element.style.setProperty('font-family', `"${font.fullName}"`);
        }
        if((changedMap.has('fontSize')))
            this.element.style.setProperty('font-size', `${changedMap.get('fontSize').value}pt`);
    }
    destroy() {
        // nothing to do
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

class UIManualAxisLocations extends UIBase {
    // Order of the legacy variable type tools app appearance,
    // which actually uses the order of axis as in the font.
    // However, the axis order seems  to have changed and the order
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
                {class: 'manual_axis_locatioms'},
                this._domTool.createElement('h3', {}, 'Manual Axis Locations'));

        this._insertElement(this.element);

        this._axesInterfaces = new Map();
        this._autoOPSZInput = null;
        this._viewAllAxes = null;
        this._styleSelect = null;

        this._insertedElements = [];
        this._font = null;
        this._fontSize = null;
        this._localAxisLocations = {};
        this._axisLocations = null;
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
        this.getEntry('autoOPSZ').set(this._autoOPSZInput.checked);

        if(this._autoOPSZInput.checked) {
            const axisLocations = this.getEntry('axisLocations')
              , axisTag = 'opsz'
              , value = this._fontSize
              , defaultValue = this.axesGet(axisTag)['default']
              ;
            this._setOrReset(axisLocations, axisTag, value, defaultValue);
        }
    }

     /* Run within transaction context */
    __axisChangeHandler(axisTag, value) {
        const axisLocations = this.getEntry('axisLocations');
        axisLocations.setSimpleValue(axisTag, value);
    }

    /* Run within transaction context */
    __styleSelectChangeHandler(locations) {
        // if(!locations) // was in old code, does this hapen?
        //     return;
        const axisLocations = this.getEntry('axisLocations');
        for(const [axisTag, value] of Object.entries(locations)) {
            // TODO: 'opsz' consider if and how this must be special handled.
            const defaultValue = this.axesGet(axisTag)['default'];
            this._setOrReset(axisLocations, axisTag, value, defaultValue);
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
              , remove: function() {
                    this.container.remove();
                }
              , destroy: function(){/* nothing to do */}
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
            }
          ;
        widget.input.addEventListener('change', (/*event*/)=>changeHandler(widget.value));
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
          , alwaysDisplayed = new Set(UIManualAxisLocations.REGISTERED_AXES_ORDERED)
          ;
        for(const [axesTag, widget] of this._axesInterfaces.entries()) {
            if(alwaysDisplayed.has(axesTag))
                // Never hidden, must not be turned back on.
                continue;
            widget.setDisplay(displayAll);
        }
    }

    _cleanUp() {
        this._localAxisLocations = {};
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

        const alwaysDisplayed = new Set(UIManualAxisLocations.REGISTERED_AXES_ORDERED);
        let hasHiddenAxes = false
        //  , hasNonDefaultHiddenAxes = false => would be nice on font change/initially to detect and then show the hidden axes
          ;
        for(const axisTag of [UIManualAxisLocations.REGISTERED_AXES_ORDERED, ...this.axesTags()]) {
            if(this._axesInterfaces.has(axisTag))
                //seen
                continue;
            if(!this.axesHas(axisTag))
                // It's in REGISTERED_AXES_ORDERED but not in the font
                continue;

            const {name, min, max, 'default':defaultVal} = this.axesGet(axisTag);
            this._localAxisLocations[axisTag] = defaultVal;

            if(!alwaysDisplayed.has(axisTag))
                hasHiddenAxes = true;

            const input = new UINumberAndRangeInput(
                    Object.assign(
                        Object.create(this._parentAPI)
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
        return this._axisLocations.has(axisTag)
                    ? this._axisLocations.get(axisTag).value
                    : this.axesGet(axisTag)['default']
                    ;
    }

    _updateValueToAxisInterface(axisTag, value) {
        if(!this._axesInterfaces.has(axisTag))
            throw new Error(`KEY ERROR axis interface for axis tag "${axisTag}" not found.`);

        console.log('_updateValueToAxisInterface', axisTag, value);
        const widget = this._axesInterfaces.get(axisTag);
        widget.update(new Map([['value', {value}]]));
        this._localAxisLocations[axisTag] = value;
    }

    /**
     * opsz slider value depends on:
     * though, if there's no opsz, we don't need to care!
     *          font (has opsz, defaultVal)
     *          autoOPSZ: true false
     *          if autoOPSZ:
     *              fontSize
     *          else:
     *              axisLocations: get('opsz') or font.opsz.defaultVal
     */
    _updateOPSZAxisInterface(changedMap) {
        const autoOPSZ = this._autoOPSZInput.checked
          , requireUpdate = changedMap.has('autoOPSZ') // always
                      || changedMap.has('font') // always
                      || (autoOPSZ
                                ? changedMap.has('fontSize')
                                : changedMap.has('axisLocations')
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

        if(changedMap.has('autoOPSZ') && this.axesHas('opsz')) {
            this._autoOPSZInput.checked = !!changedMap.get('autoOPSZ').value;
            this._axesInterfaces.get('opsz').passive = this._autoOPSZInput.checked;
        }

        // axisLocations
        //    axes in the font that are not in axisLocations should be set to their default
        //    I'm kind of interested to distinguish between explicitly default, i.e. the location
        //    equals the default value vs. implicitly default, i.e. no explicit location is set.
        //    Would be nice to control this in the UI as well.
        //    The control so far
        //           explicit: the value is in axisLocations
        //           implicit: the value is not axisLocations
        if(changedMap.has('axisLocations')) {
            const axisLocations = changedMap.get('axisLocations');
            this._axisLocations = axisLocations;
            for(const axisTag of this.axesTags()) {
                if(axisTag === 'opsz')
                    // taken care of separately
                    continue;
                const value = this._getValueForAxis(axisTag);
                // It's interesting: in a way, the sub-ui's could listen
                // directly to their entry at axisLocations/{axisTag}
                // but on the other hand, because we want to set defaults
                // in here when nothing is in axisLocations and that requires
                // updating as well, we do it directly here.
                // Maybe there will be/is a nicer way to implement behavior
                // like this. I.e. when the entry is DELETED the UI knows
                // it's default and sets it by itself.
                this._updateValueToAxisInterface(axisTag, value);
            }
        }

        // TODO: Where to put?

        // this is to mark the style as selected, ignoring opsz
        // maybe we can have a better mechanism here, i.e.
        // marking opsz explicitly to be ignored.
        // this._localAxisLocations['opsz'] = !this._autoOPSZInput.checked
        //                     ? axisValue.location // take the location
        //                     : axisValue.default  // take the default
        //                     ;

        if(this.axesHas('opsz'))
            // run this last, it depends on the previous values
            this._updateOPSZAxisInterface(changedMap);
    }

    update(changedMap) {
        // Because of the handling of this._localAxisLocations
        // the actual this._update(changedMap); is wrapped in
        // a try finally block, so we can reset this._localAxisLocations
        // again if required.
        // detecting local change of absolute axis coordinates
        const originalLocations = this._localAxisLocations;
        // Note: this._cleanUp will replace this._localAxisLocations
        this._localAxisLocations =  Object.create(originalLocations);

        try {
            this._update(changedMap);
        }
        finally {
            this._updateStyleSelect(originalLocations);
        }
    }

    _updateStyleSelect(originalLocations) {
        // only update when there are changes!
        let requireUpdateStyleSelect = false;
        if(Object.getPrototypeOf(this._localAxisLocations) === originalLocations) {
            if(Object.keys(this._localAxisLocations).length > 0) {
                // found changed keys, replace with flattened update ...
                this._localAxisLocations = Object.assign({}, originalLocations, this._localAxisLocations);
                requireUpdateStyleSelect = true;
            }
            else
                // no require change, rewind...
                this._localAxisLocations = originalLocations;
        }
        else
            // this._localAxisLocations was replaced (by this._cleanUp)
            requireUpdateStyleSelect = true;

        if(requireUpdateStyleSelect && this._styleSelect)
            this._styleSelect.value = this._localAxisLocations;
    }
}

class WidgetWrapper {
    constructor(hostElement, parentAPI, dependencyMappings, WidgetClass, ...widgetArgs) {
        this.WidgetClass = WidgetClass;
        this.host = hostElement;
        // store inserted elements, to be removable again
        this.insertedElements = [];
        this.dependencyMapping = new Map(dependencyMappings);
        this.dependencyReverseMapping = new Map([...this.dependencyMapping]
                        .map(([external, internal])=>[internal, external]));

        this.parentAPI = Object.assign(Object.create(parentAPI), {
                insertElement: this.insertElement.bind(this)
              , getEntryRaw: parentAPI.getEntry
              , getEntry: (internalName)=>{
                  const externalName = this.dependencyReverseMapping.has(internalName)
                        ? this.dependencyReverseMapping.get(internalName)
                        : internalName
                        ;
                  return parentAPI.getEntry(externalName);
                }
        });
        this.widget = this.create(...widgetArgs);
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
    update (changedMap) {
        this.widget.update(changedMap);
    }
    create(...args) {
        return new this.WidgetClass(this.parentAPI, ...args);
    }
}


/**
 * This knows a lot about the host document structure, which must comply.
 * It lso knows about the model structure, but it translates that knowledge
 * to it's children so they can be more generic.
 */
export class MainUIController extends UIBase {
    // Looking initially for three (then four) target zones.
    //    main => in the sidebar in desktop sizes
    //    before-layout => where we put the animation controls
    //    layout => entirely controlled by the layout widget.
    //    (after-layout =>below proof, maybe for animation editing/keyframes etc. not yet implemented)
    constructor(parentAPI) {
        super(parentAPI);
        this._zones = new Map([
                ['main', '.typeroof-ui_main']
              , ['before-layout', '.typeroof-layout-before']
              , ['layout', '.typeroof-layout']
              , ['after-layout', 'typeroof-layout-after']
        ].map(([name, selector])=>[name, this._domTool.document.querySelector(selector)]));

        // We need a way to organize layout widgets/uis and to give them
        // a fixed place to be, maybe sub-zones or so, maybe the widget
        // could insert "insert: " comments into the zones and use those
        // to self-organize. no comment found or no target given: append
        // the rest is just about insertion order and widgets can of course
        // group themselves sub widgets together...

        // for now, to get started, just the permanent residents (font and layout chooser)
        this._widgets = [];
        {
            this._widgets.push(
                new WidgetWrapper(
                    this._zones.get('main')
                  , parentAPI
                  , [
                        // dependencyMappings
                        // path => as internal name
                        ['availableFonts', 'options']
                      , ['activeFontKey', 'value']
                    ]
                  , FontSelect
                )
              , new WidgetWrapper(
                    this._zones.get('main')
                  , parentAPI
                  , []
                  , AddFonts
                )
              , new WidgetWrapper(
                    this._zones.get('layout')
                  , parentAPI
                  , [
                        ['font', 'font']
                      , ['fontSize', 'fontSize']
                    ]
                  , SimpleProof
                )
              , new WidgetWrapper(
                    this._zones.get('main')
                  , parentAPI
                  , [
                        ['fontSize', 'value']
                    ]
                  , UINumberAndRangeInput
                  , 'font_size' // base-id
                  , 'Font Size' // label
                  , 'pt'// unit
                  , {min:6, max:280, value:6, step:1} // minMaxValueStep => set attribute
                )
              , new WidgetWrapper(
                    this._zones.get('main')
                  , parentAPI
                  , [
                        ['fontSize', 'fontSize']
                      , ['font', 'font']
                      , ['manualAxisLocations/axisLocations', 'axisLocations']
                      , ['manualAxisLocations/autoOPSZ', 'autoOPSZ']
                    ]
                  , UIManualAxisLocations
                )
            );
        }
    }

    destroy() {
        this._fontSelect.widget.destroy();
        for(const node of this._fontSelect.insertedElements)
            // not using node.remove(), because it may be an Element,
            // but it cold also be a textNode or a Comment etc. and
            // and only Element has the remove method.
            node.parentNode.removeChild(node);
    }

    get dependencies() {
        const dependencies = new Set();
        for(const entry of this._widgets) {
            for(const path of entry.dependencyMapping.keys(dependencies)) {
                dependencies.add(this.absPath(path));
            }
        }
        return dependencies;
    }

    absPath(path) {
        return path; // identity for now
    }

    update(state, changed) {
        for(const widgetWrapper of this._widgets) {
            const changedMap = new Map();
            // hmm, could also re-map path from local to absolute
            // at least when this operates on a deeper state.
            // or make sure that paths are always absolute, not sure
            // how this works in e.g. widgets of arrays items.
            // Obviously, the dependent widget would have to be destroyed
            // if its path disappears, or moved respectivley
            for(const [path, target] of widgetWrapper.dependencyMapping) {
                const absPath = this.absPath(path);
                if(changed.has(absPath))
                    changedMap.set(target, changed.get(absPath));
            }
            if(changedMap.size)
                widgetWrapper.update(changedMap);
        }
    }
}
