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
        return (event, ...args)=>this._changeState(()=>fn(event, ...args));
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
            console.log('on change!', this._select.value);
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
        console.log(`${this.constructor.name}.this._parentAPI:`, this._parentAPI);
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
        this.widget = this.create(parentAPI, ...widgetArgs);
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
