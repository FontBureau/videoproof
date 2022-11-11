/* jshint esversion: 11, browser: true, unused:true, undef:true, laxcomma: true, laxbreak: true, devel: true */


const _NOTDEF = Symbol('_NOTDEF')
    , REQUIRES =  Symbol('REQUIRES')
    , PROVIDES = Symbol('PROVIDES')
    ;

class _BaseModel {
    // qualifiedKey => can distinguish between alias/shortcut and
    // absolut entry. e.g. "@firstChild" vs ".0"
    get(qualifiedKey) {
        throw new Error(`Not implemented get (of "${qualifiedKey}") in ${this}.`);
    }

    // Each model will have to define this.
    get value() {
        throw new Error(`Not implemented get value in ${this}.`);
    }

    // use only for console.log/Error/debugging purposes
    toString() {
        return `[model ${this.constructor.name}]`;
    }

    fromRawValue(raw) {
        // static on the class!
        return this.constructor.fromRawValue(raw);
    }
}

class _BaseContainerModel extends _BaseModel {
    *[Symbol.iterator](){
        yield *this.value.entries();
    }
    get(key) {
        throw new Error(`Not implemented get(key) in ${this}.`);
    }
    set(key, entry) {
        throw new Error(`Not implemented get(key) in ${this}.`);
    }
}

// generic map/dictionary type
// Not sure we'll ever need this!
// class MapModel extends _BaseModel{}


// list/array type
// items are accessed by index
// has a size/length
// I'd prefer to have a single type for all items, that way,
// we can't have undefined entries, however, a type could be
// of the form TypeOrEmpty...
// MultipleTargets ...!
// class ListModel extends _BaseModel{}


class _AbstractStructModel extends _BaseContainerModel {
    // See _AbstractStructModel.concreteFactory
    static get fields() {
        // NOT IMPLEMENTED fields is not defined in _AbstractStructModel
        throw new Error(`NOT IMPLEMENTED fields is not defined in ${this.name}`);
    }
    // fields: [string fieldName, instanceof _BaseModel (duck typed?)] ...
    static concreteFactory(className, ...fields) {
            console.log(className, 'raw fields:', fields);
            if(typeof className !== 'string')
                throw new Error(`className must be string but is ${typeof string}`);
            const filteredFields = fields.filter(field=>
                    typeof field !== 'function'
                    && field[0] !== REQUIRES
                    && field[0] !== PROVIDES);
            // this way name will naturally become class.name.
        const result = {[className]: class extends this {
            static fields = Object.freeze(new Map(filteredFields));
        }};
        // Can't override class.fields anymore, would be possible w/o the freeze.
        Object.freeze(result[className]);
        return result[className];
    }
    constructor(entries) {
        super();

        const value = Object.assign(Object.create(null),
             Object.fromEntries(entries.filter(([name,])=>this.fields.has(name)))
        );
        // Do type checking and completeness checking.
        {
            const missing = []
              , types = []
              ;
            for(const [key, Type] of this.fields.entries()) {
                if(!Object.hasOwn(value, key)) {
                    missing.push(key);
                    continue;
                }
                if(!(value[key] instanceof Type))
                    types.push(`${key} is not ${Type.name}`);
            }
            if(missing.length || types.length)
                throw new Error(`TYPE ERROR can't initialize ${this.constructor.name}`
                        + (missing.length ? `; missing items: ${missing.join(', ')}` : '')
                        + (types.length ? `; wrong types: ${types.join(', ')}` : '')
                        + '.'
                );
        }
        Object.defineProperty(this, 'value', {
            value: Object.freeze(value)
          , writable: false
        });
    }
    *[Symbol.iterator](){
        yield *Object.entries(this.value);
    }
    // This is only to demonstrate dynamic, instance access to the static
    // fields Map.
    get fields() {
        return this.constructor.fields;
    }
    static fromRawValue(raw) {
        console.log(this, 'raw', raw);
        console.log('this.fields', this.fields);
        const entries = raw.map(([name, ...rawValue])=>{
                    console.log('name', name);
                    const Model = this.fields.get(name);
                    return [name, Model.fromRawValue(...rawValue)];
                });
        // FIXME: if entry can be empty and is missing we should
        //        push ['entryName'] to entries ...
        // could also be part of the constructor.
        return new this(entries);
    }
    has(key) {
        return Object.hasOwn(this.value, key);
    }
    get(key, defaultReturn=_NOTDEF) {
        if(this.has(key))
            return this.value[key];
        if(defaultReturn !== _NOTDEF)
            return defaultReturn;
        throw new Error(`KEY ERROR "${key}" not found in ${this}.`);
    }
    set(key, entry) {
        // could return this
        console.warn(`!!!!! set "${key}" in ${this}.`);
        if(this.has(key) && this.value[key] === entry){
            console.warn(`>>>>>Value at "${key}" equals entry in ${this}.`, entry);
            return this;
        }
        const newValue = Object.assign({}, this.value, {[key]: entry});
        return new this.constructor(Object.entries(newValue));
    }
}

class _AbstractListModel extends _BaseContainerModel {
    static get Model() {
        // NOT IMPLEMENTED Model is not defined in _AbstractListModel
        throw new Error(`NOT IMPLEMENTED Model is not defined in ${this.name}`);
    }

    static concreteFactory(className, Model /* a _BaseModel */) {
            // this way name will naturally become class.name.
        const result = {[className]: class extends this {
            static Model = Model;
        }};
        // Can't override class.Model anymore, would be possibl w/o the freeze.
        // Maybe only fix "Model" property?
        // Object.freeze(result[className]);
        return result[className];
    }

    constructor(entries) {
        super();
        {
            const typeFails = [];
            for(const [i, entry] of entries.entries()) {
                if(!(entry instanceof this.constructor.Model))
                    typeFails.push(`${i} ("${entry.toString()}" typeof ${typeof entry})`);
            }
            if(typeFails.length)
                throw new Error(`TYPE ERROR ${this.constructor.name} `
                    + `expects ${this.constructor.Model.name} `
                    + `wrong types in ${typeFails.join(', ')}`
                );
        }
        Object.defineProperty(this, 'value', {
            value: Object.freeze(Array.from(entries))
          , writable: false
          , enumerable: true
        });
    }

    static fromRawValue(raw) {
        return new this(raw.map(entry=>this.Model.fromRawValue(entry)));
    }

    get(key, defaultReturn=_NOTDEF) {
        const index = parseInt(key, 10);
        if(index >= 0 && index < this.value.length)
            return this.value[key];
        throw new Error(`KEY ERROR index "${key}" not found, length ${this.value.length} in ${this}.`);
    }
    set(key, entry) {
        // could return this
        if(this.value[key] === entry)
            return this;
        const newValue = this.value.slice()
          , index = parseInt(key, 10)
          ;
        if(index >= 0 && index < this.value.length)
            newValue[index] = entry;
        else
            // TODO: must allow more array operations
            // like push, pop, shift, unshift, splice
            // but it's not yet cleat how to use.
            throw new Error(`KEY ERROR index "${key}" not found, length ${this.value.length} in ${this}.`);
        return new this.constructor(newValue);
    }
}


// Will prevent accidental alteration, howeber, this is not vandalism proof.
// I tried using Javascript Proxy for this, however, it is not vandalism
// proof either (e.g. via prototype pollution), if that is a concern, an
// object with an internal map as storage and the same interface as Map
// is be better.
class FreezableMap extends Map {
    set(...args) {
        if (Object.isFrozen(this)) return this;
        return super.set(...args);
    }
    delete(...args){
        if (Object.isFrozen(this)) return false;
        return super.delete(...args);
    }
    clear() {
        if (Object.isFrozen(this)) return;
        return super.clear();
    }
}

// Very similar to _AbstractListModel
class _AbstractMapModel extends _BaseContainerModel {
    static get Model() {
        // NOT IMPLEMENTED Model is not defined in _AbstractMapModel
        throw new Error(`NOT IMPLEMENTED Model is not defined in ${this.name}`);
    }

    static concreteFactory(className, Model /* a _BaseModel */) {
            // this way name will naturally become class.name.
        const result = {[className]: class extends this {
            static Model = Model;
        }};
        // Can't override class.Model anymore, would be possible w/o the freeze.
        // Maybe only fix "Model" property?
        // Object.freeze(result[className]);
        return result[className];
    }

    constructor(entries) {
        super();
        {
            const typeFails = [];
            for(const [key, entry] of entries) {
                if(!(entry instanceof this.constructor.Model))
                    typeFails.push(`${key} ("${entry.toString()}" typeof ${typeof entry})`);
            }
            if(typeFails.length)
                throw new Error(`TYPE ERROR ${this.constructor.name} `
                    + `expects ${this.constructor.Model.name} `
                    + `wrong types in ${typeFails.join(', ')}`
                );
        }
        Object.defineProperty(this, 'value', {
            value: Object.freeze(new FreezableMap(entries))
          , writable: false
          , enumerable: true
        });
    }

    static fromRawValue(raw) {
        return new this(raw.map(([key, entry])=>[key, this.Model.fromRawValue(entry)]));
    }
    has(key) {
        return this.value.has(key);
    }

    get(key, defaultReturn=_NOTDEF) {
        if(this.value.has(key))
            return this.value.get(key);
        if(defaultReturn !== _NOTDEF)
            return defaultReturn;
        throw new Error(`KEY ERROR "${key}" not found in ${this}.`);
    }

    set(key, entry) {
        // could return this
        if(this.value.has(key) && this.value.get(key) === entry)
            return this;
        const newValue = new Map(this.value);
        newValue.set(key, entry);
        return new this.constructor(Array.from(newValue));
    }
}

// has a value or is empty
// get value => [bool isEmpty, null or value]
class _AbstractOrEmptyModel extends _BaseModel {
    static get Model() {
        // NOT IMPLEMENTED Model is not defined in _AbstractOrEmptyModel
        throw new Error(`NOT IMPLEMENTED Model is not defined in ${this.name}`);
    }
    static concreteFactory(className, Model /* a _BaseModel */ ) {
            // this way name will naturally become class.name.
        const result = {[className]: class extends this {
            static Model = Model;
        }};
        // Can't override class.Model anymore, would be possibl w/o the freeze.
        // Maybe only fix "Model" property?
        Object.freeze(result[className]);
        return result[className];
    }
    constructor(value=_NOTDEF) {
        super();
        Object.defineProperty(this, 'isEmpty',{
            value: value === _NOTDEF
          , writable: false
          , enumerable: true
        });
        if(!this.isEmpty && !(value instanceof this.Model))
            throw new Error(`TYPE ERROR ${this.constructor.name}`
                + ` value must be a ${this.Model.name}`
                + ` but is ${value.toString()} typeof ${typeof value}`);

        Object.defineProperty(this, '_value',{
            value: this.isEmpty ? undefined : value
          , writable: false
          , enumerable: true
        });
    }
    static fromRawValue(raw=_NOTDEF) {
        const value = raw === _NOTDEF
                ? _NOTDEF
                : this.Model.fromRawValue(raw)
                ;
        return new this(value);
    }

    get Model() {
        return this.constructor.Model;
    }

    get value() {
        return [this.isEmpty, ...( this.isEmpty ? [] : [this._value.value] )];
    }
}

/**
 * Rather a placeholder, to have quick type classes.
 */
class _AbstractGenericModel extends _BaseModel {
    static concreteFactory(className) {
            // this way name will naturally become class.name.
        const result = {[className]: class extends this {}};
        Object.freeze(result[className]);
        return result[className];
    }
    constructor(value=_NOTDEF) {
        super();
        if(value===_NOTDEF)
            throw new Error(`TYPE ERROR value must be set but is _NOTDEF in ${this}`);

        Object.defineProperty(this, 'value', {
            value: value
          , writable: false
          , enumerable: true
        });
    }
    static fromRawValue(raw) {
        return new this(raw);
    }
}

/*

> MyStructClass = _AbstractStructModel.concreteFactory('MyStructClass', ['a', 'hello'], ['b', 2])
[class MyStructClass extends _AbstractStructModel] {
  fields: Map(2) { 'a' => 'hello', 'b' => 2 }
}

> MyStructClass.fields
Map(2) { 'a' => 'hello', 'b' => 2 }

> _AbstractStructModel.fields
Uncaught Error: NOT IMPLEMENTED fields is not defined in _AbstractStructModel
    at get fields [as fields] (file:///home/commander/Projects/fontbureau/videoproof/lib/js/metamodel.mjs:37:15)

> myStruct = new MyStructClass()
MyStructClass {}

> myStruct.fields
[ 'a', 'b' ]

> myStruct + ''
'[_BaseModel MyStructClass]'

*/

// this is great so far, but the struct should be able to validate it's
// own integrity, in other words, it should not be possible to create an
// invalid/inconsistent state! At least, it should be possible to describe
// guards that try to keep the state consistent. How to?

// depends on font, fontSize (fontSize in case of autoOPSZ)
// how to read fontSize??? in a way this should also subscribe to changes!



const AnyModel = _AbstractGenericModel.concreteFactory('AnyModel')
  , IntegerModel = _AbstractGenericModel.concreteFactory('IntegerModel')
    // Beautiful
  , IntegerOrEmptyModel = _AbstractOrEmptyModel.concreteFactory('IntegerOrEmptyModel', IntegerModel)
  , NumberModel =  _AbstractGenericModel.concreteFactory('NumberModel')
  , NumberOrEmptyModel = _AbstractOrEmptyModel.concreteFactory('NumberOrEmptyModel', NumberModel)
  , BooleanModel = _AbstractGenericModel.concreteFactory('BooleanModel')
  , StringModel = _AbstractGenericModel.concreteFactory('StringModel')
  , AxisLocationModel = _AbstractStructModel.concreteFactory('AxisLocationModel'
            //, ['name', StringModel]
          , ['value', NumberOrEmptyModel]// => if null we can fall back to the default
                                        //    on the other hand, in that case,
                                        //    the AxisLocationValueModel could be an
                                        //    AxisLocationOrEmptyValueModel
            // min, max, default => could come from font => we'd build an
            // extra model on the fly per axis? That way, at least validation
            // could be truly inherent!
    )
    // Make an _AbstractMapModel, the values wouldn't require a name ... ?
  , AxisLocationsModel = _AbstractMapModel.concreteFactory('AxisLocationsModel', AxisLocationModel)
  , ManualAxisLocationsModel = _AbstractStructModel.concreteFactory(
        'ManualAxisLocationsModel'
        // requires
      , [REQUIRES, 'font', 'fontSize']
        // requires means: I don't know where it comes from but I need its
        // value and I need to get informed when it changes.
        // however, the value of this may or may not change subsequently.
        //
        // the counterpart to "requires" would be "provides", obiously
        // provides should be directed only at children. It could be,
        // however, maybe a rewrite,
        // Thinking about this as of the mantra right now. font would be
        // defined above, and just become part of the "scope" of this.
        // layers inbetween could rewrite the scope for their children.
        // provides could, while walking down the tree, be used to update
        // the active scope. It's a bit like css cascade. If a parent "provides"
        // it set's it to scope.
        // could be provided via a sibling maybe, rerouting ...
        // however, when sibling changes anywhere, everything that requires
        // must get updated.
        //
        // In a away, doing the order of evaluation in Mantra style is the
        // same as a topological order of a dependency tree. That way it
        // may even be simpler to implement! At least until a better image
        // evolves, doing it manually could be ideal.
        //
        // Also, try to do it immutable.
      , function coherenceGuard() {
            // This is only expected to set fontSize to opsz if
            // autoOPSZ is true (and if there is an opsz axis anyways).
            // In order to do that, it needs access to fontSize.
            // so, when fontSize changes, or when autoOPSZ is set to true,
            // this needs to run. Actually, when autoOPSZ is set to false,
            // opsz  will not be changed.
            // in order for opsz to be something else than font-size
            // autoOPSZ must be false.
            //
            // so a good example to set opsz to something else when
            // autoOPSZ is true as an compound action:
            //       set autoOPSZ = false
            //       set opsz = 123
            // the other way around must fail
            //       set opsz = 123 // -> ERROR cannot set opsz because autoOPSZ is true
            //       set autoOPSZ = false
            //
            // !!! There is an order that must be obeyed.
            // Should this be done internally? After all, setting single
            // values is chaotic anyways.
            //


        }
      , ['autoOPSZ', BooleanModel, /* default true*/ ]
      , ['axisLocations', AxisLocationsModel]
);
// above, it would make a lot of sense to add fontSize
// and also fontName
// HOWEVER:
// depending on the model/layout we need e.g. one fontName for many
// ManualAxisLocationsModel and hence, we don't want to store it here,
// but instead above, in a parent model. Here comes the requires part in
// into play, in order to check this, it needs these environment values.
//
// Maybe(!)




// One exercise here is to enforce activeTarget to be an index within targets
// when targets is changed, e.g. a pop(), activeTarget must changes as well
// say activeTarget is the last item of targets and we remove the first item
// how to keep activeTarget the last item (second to last etc.)
// It could be kept in sync if it was stored in targets, and maybe just
// be the first actice entry, but to keep that clean, we also need to
// enforce some rules ... (e.g. don't allow multiple actice items in targets)
const FontModel = _AbstractGenericModel.concreteFactory('FontModel')
  , MultipleManualAxisLocationsModel = _AbstractListModel.concreteFactory('MultipleManualAxisLocationsModel', ManualAxisLocationsModel)
  , ExampleLayoutModel = _AbstractStructModel.concreteFactory(
    'ExampleLayoutModel'
    //requires
  , [REQUIRES, 'templates' /* to initialize targets */] // e.g. available fonts? could be typed!
    // provides
  , [PROVIDES, 'font', 'fontSize']
  , ['font', FontModel]
  , ['fontSize', NumberModel] // when we control min/max and precision at this level we'll get a lot from it, could be used to configure a generic number ui

  // , ['templates', ExampleTemplatesModel]
  // , ['activeTemplate', IntegerOrEmptyModel] //
  // on init
  , ['targets', MultipleManualAxisLocationsModel] // not enough, there are also content implications on targets!
  , ['activeTarget', IntegerOrEmptyModel]
);

// Bootstrapping is hard!
let applicationFonts = [{name: 'fixture font'}];

let exampleLayoutState = ExampleLayoutModel.fromRawValue([
    // => above in ApplicationModel['fonts', applicationFonts]
    // i.e. when font changes, this will need to change as well
    // requires a 'font'
    ['font', applicationFonts[0]]
  , ['fontSize', 14 /*some default*/] // want this to experiment with autoOPSZ
    // requires targets, via template
    // template defines the targets actually
    // hence this depends on activeTemplate => templates

    // hmm want this to be dynamic, so going to start empty for now
  , ['targets', [
        [// manual axis locations
            ['autoOPSZ', true]
          , ['axisLocations', [
                ['opsz', [['value']]]
              , ['wght', [['value', 400]]]
            ]]
        ]
    ]]
  , ['activeTarget', 1]
]);

console.log('exampleLayoutState', exampleLayoutState);

//let [newExmpleLayoutState, changedPaths] = exampleLayoutState.transform(entries);



class Path {
    static SEPARATOR = '/';
    constructor(...pathParts) {
        Object.defineProperty(this, 'parts', {
            value: Object.freeze(pathParts.filter(part=>part !== ''))
          , enumerable: true
        });
    }
    static fromString(pathString) {
        return new this(...pathString.split(this.SEPARATOR));
    }
    fromString(pathString) {
        return this.constructor.fromString(pathString);
    }
    toString() {
        return this.parts.join(this.constructor.SEPARATOR)
    }
    [Symbol.iterator](){
        return this.parts[Symbol.iterator]();
    }
}

const IS_CONTAINER = Symbol('IS_CONTAINER')
  ;
function *getAllPathsAndValues(state) {
    const value = state.value;
    // This check should rather be "is a container type"
    // and that would mean it has entries and it has a
    // get function that returns values for keys...
    if(state instanceof _BaseContainerModel) {
        yield [IS_CONTAINER];
        for(const [keyOrIndex, entry] of state)
            for(const [value, ...path] of getAllPathsAndValues(entry))
                yield [value, keyOrIndex, ...path];
    }
    else
        yield [state.value];
}

for(const [value, ...path] of getAllPathsAndValues(exampleLayoutState))
    console.log(
            path.join(Path.SEPARATOR) + (value === IS_CONTAINER ? Path.SEPARATOR : ''),
            ...(value === IS_CONTAINER ? [] : [value])
    );


function getEntry(state, path, defaultVal=_NOTDEF) {
    console.log(`getEntry ${path}`);
    const pathInstance = (typeof path === 'string' ? Path.fromString(path) : path);
    try {
        return [...pathInstance].reduce((accum, part)=>{
            if(!(accum instanceof _BaseContainerModel))
                throw new Error('CONTAINER ENTRY ERROR no container at ${part} in ${path}');
            return accum.get(part);
        }, state);
    }
    catch(error) {
        // Could check if error is not a KEY ERROR type, but e don't!
        if(defaultVal !== _NOTDEF)
            return defaultVal;
        throw error;
    }
}

function getValue(state, path, defaultVal=_NOTDEF) {
    const result = getEntry(state, path, defaultVal);
    return result === defaultVal ? result : result.value;
}

let path = Path.fromString('targets/0/axisLocations/wght/value');
console.log(getValue(exampleLayoutState, path));

path = Path.fromString('targets/1/axisLocations/wght/value');
console.log(getValue(exampleLayoutState, path, null));

console.log(getEntry(exampleLayoutState, 'targets/0/axisLocations///wght/', null));


// How does changing the font trickle down to an updated axisLocations state!
// it seems that some knowledge about the font (READ ONLY) must be in some
// lower model.
// AND:

function* _getAllEntries(state, path) {
    const pathInstance = (typeof path === 'string' ? Path.fromString(path) : path);
    let current = state
    yield current;
    for(let pathPart of pathInstance) {
        current = getEntry(current, pathPart)
        yield current;
    }
}


function setEntry(state, path, entry) {
    const pathInstance = (typeof path === 'string' ? Path.fromString(path) : path)
      , entriesAlongPath = [..._getAllEntries(state, path)]
      ;
    let updated = entry, parent;
    console.log('setEntry', pathInstance.parts.length, ...pathInstance.parts);
    console.log('_____');
    console.log('entriesAlongPath:', entriesAlongPath.length, ...entriesAlongPath);
    console.log('_____');
    for(let i=pathInstance.parts.length-1; i>=0; i--) {
        const key = pathInstance.parts[i];
        parent = entriesAlongPath[i]
        // All of these must be container types, as they contain children.
        console.log('set', key, 'to ' + parent, 'as updated:', updated);
        updated = parent.set(key, updated);
    }
    console.log('####result updated:', updated, updated !== parent);
    return updated;
}

function getModel(Model, path) {
    const pathInstance = (typeof path === 'string' ? Path.fromString(path) : path);
    return path.parts.reduce((accum, key)=>{
        console.log('getModel:', key, 'from:', accum);
        if('Model' in accum)
            return accum.Model;
        if('fields' in accum)
            return accum.fields.get(key);
        throw new Error(`KEY ERROR don't know how to get model from ${accum.name}`);
    }, Model);
}

function setRawValue(state, path, rawValue) {
    const pathInstance = (typeof path === 'string' ? Path.fromString(path) : path)
      , Model = getModel(state.constructor, path)
        // TODO: Only do if value changes ... eq() ...
        //       because this would optimize required change/update work.
      , newEntry = Model.fromRawValue(rawValue)
      ;
    console.log('setRawValue newEntry:', newEntry);
    return setEntry(state, pathInstance, newEntry);
}

let changePath = Path.fromString('targets/0/axisLocations/wght/value');
// well if it was changed at all every entry along path has changed now.
// hence, changed should be a boolean
// however, a change because of coherenceGuards, more paths may have changed
const newState = setRawValue(exampleLayoutState, changePath, 500);
console.log('newState ' + newState, newState,  'eq exampleLayoutState:', newState===exampleLayoutState);
let newEntry = getEntry(newState, changePath);
let oldEntry = getEntry(exampleLayoutState, changePath);
console.log('newEntry', newEntry, 'oldEntry', oldEntry);
// did not change
let pathDidNotChange = Path.fromString('targets/0/axisLocations/opsz/value');
console.log('did not change assert TRUE:', getEntry(exampleLayoutState, pathDidNotChange) === getEntry(newState, pathDidNotChange));
// did change

console.log(oldEntry, newEntry);
console.log('did change assert FALSE:', oldEntry === newEntry);


// States need comparison, state.eq(otherState).
// Also, it would be very nice if state were immutable, thus:
//          state.setSomeValue() => aNewState;
// we would be recreating state a lot though as this would have to change application state.
// but we would move parallell/sibling states that did not change to the new object.
// and checkiing is always done on initialization.
//
//    No: this.value = ...
//    But: that = this.set(value);
// that === this === true === no change???
// It's interesting. but is it overkill?
// is it a big effort to teach the Model how to update itself?
// can a visitor do so?



//Allright: TODO:
//
// change multiple values
//      transaction like behavior is actually super easy when we do the
//      immutable/copy on write thing
// inherent coherenceGuards
//





const repl = await import('node:repl')
  , r = repl.start('> ')
  ;//.context.m = msg;
Object.assign(r.context, {_AbstractStructModel, exampleLayoutState});
