/* jshint esversion: 11, browser: true, unused:true, undef:true, laxcomma: true, laxbreak: true, devel: true */

/**
 * Building blocks and helper functions to define a Model.
 */

const _NOTDEF = Symbol('_NOTDEF');

// PROVIDES should be solvable by the names in the e.g. struct
//          maybe it's helpful though at some point
//          REQUIRES is interesting, as thos would trigger some update
//                   routine with the new value
export const REQUIRES =  Symbol('REQUIRES')
      // THIS may hint a way to create symbolic link like behavior
      // i.e. in MultipleTargets of ManualAxisLocations
      // The single UI for ManualAxisLocations shows the state of
      // the ActiveTarget, but that is so far just an index into
      // the List of ManualAxisLocations states. So the symbolic
      // link would always point to the actual state of the active
      // manualAxisLocations and the UI would subscribe to that link.
    , PROVIDES = Symbol('PROVIDES')
    ;


// Will prevent accidental alteration, howeber, this is not vandalism proof.
// I tried using Javascript Proxy for this, however, it is not vandalism
// proof either (e.g. via prototype pollution), if that is a concern, an
// object with an internal map as storage and the same interface as Map
// is be better.
export class FreezableMap extends Map {
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

export class FreezableSet extends Set {
    add(...args) {
        if (Object.isFrozen(this)) return this;
        return super.add(...args);
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

// Similar to Array.prototype.map
// The map() method creates a new array populated with the results of
// calling a provided function on every element in the iterable.
function iterMap(iterable, callbackFn, thisArg=null) {
    const result = [];
    for(const element of iterable) {
        // The reason not to pass index/i (as in Array.prototype.map)
        // is that access by index is likeley not supported by
        // the iterable.
        result.push(callbackFn.call(thisArg, element, iterable));
    }
    return result;
}
function iterFilter(iterable, callbackFn, thisArg=null) {
    const result = [];
    for(const element of iterable) {
        if(callbackFn.call(thisArg, element, iterable))
            result.push(element);
    }
    return result;
}

// Can be used/shared by default instead of creating new empty sets
// as dependencies.
const EMPTY_SET = Object.freeze(new FreezableSet());

export class _BaseModel {
    // qualifiedKey => can distinguish between alias/shortcut and
    // absolut entry. e.g. "@firstChild" vs ".0"
    get(qualifiedKey) {
        throw new Error(`NOT IMPLEMENTED get (of "${qualifiedKey}") in ${this}.`);
    }

    // Each model will have to define this.
    get value() {
        throw new Error(`NOT IMPLEMENTED get value in ${this}.`);
    }

    static dependencies = EMPTY_SET; // jshint ignore:line

    get dependencies() {
        return this.constructor.dependencies;
    }

    // use only for console.log/Error/debugging purposes
    toString() {
        return `[model ${this.constructor.name}]`;
    }

    toObject() { // => JSON compatible ...
         throw new Error(`NOT IMPLEMENTED toObject in ${this}.`);
    }

    fromRawValue(raw) {
        // static on the class!
        if(!('fromRawValue' in this.constructor))
            throw new Error(`NOT IMPLEMENTED static fromRawValue in ${this.constructor}.`);
        return this.constructor.fromRawValue(raw);
    }
}

export class _BaseContainerModel extends _BaseModel {
    *[Symbol.iterator](){
        yield *this.value.entries();
    }
    get(key) {
        // jshint unused: vars
        throw new Error(`NOT IMPLEMENTED get(key) in ${this}.`);
    }
    set(key, entry) {
        // jshint unused: vars
        throw new Error(`NOT IMPLEMENTED get(key) in ${this}.`);
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


const FOREIGN_KEY_NO_ACTION = Symbol('NO_ACTION')
  , FOREIGN_KEY_SET_NULL = Symbol('SET_NULL')
  , FOREIGN_KEY_SET_DEFAULT_FIRST = Symbol('SET_DEFAULT_FIRST')
  , FOREIGN_KEY_SET_DEFAULT_LAST = Symbol('SET_DEFAULT_LAST')
  , FOREIGN_KEY_SET_DEFAULT_FIRST_OR_NULL = Symbol('SET_DEFAULT_FIRST_OR_NULL')
  , FOREIGN_KEY_SET_DEFAULT_LAST_OR_NULL = Symbol('SET_DEFAULT_LAST_OR_NULL')
  , FOREIGN_KEY_SET_DEFAULT_VALUE = Symbol('SET_DEFAULT_VALUE')
  , FOREIGN_KEY_SET_DEFAULT_VALUE_OR_NULL = Symbol('SET_DEFAULT_VALUE_OR_NULL')
  , FOREIGN_KEY_CUSTOM = Symbol('CUSTOM')
  ;

export class ForeignKey {
    // jshint ignore: start
    // "nullConstraints"
    static NOT_NULL = Symbol('NOT_NULL');
    static ALLOW_NULL = Symbol('ALLOW_NULL');
    // This is a Key of target
    // it can be null, if target is empty or if not set
    // but if it is not null, it must exist in target.
    //
    // These "defaultConstraints" are implemented as pre-defined functions, similar
    // to coherence guards. They are applied of the key does not exist
    // in target, before validaton.
    // They can change the Key value (i.e. set a a new entry) but they
    // cannot change the referenced target itself or prevent it from being
    // changed. (like SQL CASCADE/RESTRICT).
    // For our case NO_ACTION and RESTRICT have a similar meaning,
    // because we can't restrict deletion of a referenced item, we
    // can only do nothing, and wait for the validation later to break,
    // which it will if the key does not exist.
    // NO_ACTION is not the default, because it is likely not the best
    // choice. However, in combination with an external coherence guard,
    // which can implement more complex constraints, it may be the best choice.
    static NO_ACTION = FOREIGN_KEY_NO_ACTION;
    // If the reference does not exist, this key will point to null,
    // this will only validate if the is allowed to be null.
    static SET_NULL = FOREIGN_KEY_SET_NULL;
    // In my opinion the best default behavior for most cases!
    static SET_DEFAULT_FIRST = FOREIGN_KEY_SET_DEFAULT_FIRST;
    static SET_DEFAULT_LAST = FOREIGN_KEY_SET_DEFAULT_LAST;
    static SET_DEFAULT_FIRST_OR_NULL = FOREIGN_KEY_SET_DEFAULT_FIRST_OR_NULL;
    static SET_DEFAULT_LAST_OR_NULL = FOREIGN_KEY_SET_DEFAULT_LAST_OR_NULL;
    // SET_DEFAULT_VALUE options must be followed by the actual value
    static SET_DEFAULT_VALUE = FOREIGN_KEY_SET_DEFAULT_VALUE;
    static SET_DEFAULT_VALUE_OR_NULL = FOREIGN_KEY_SET_DEFAULT_VALUE_OR_NULL;
    // More complex behavior can be implemented with a custom guard.
    // THE CUSTOM option must be followed by a function with the signature:
    // (targetContainer, currentKeyValue) => newKeyValue
    static CUSTOM = FOREIGN_KEY_CUSTOM;
    // jshint ignore: end

    constructor(targetName, nullConstraint,  defaultConstraint, ...config) {
        Object.defineProperty(this, 'targetName', {
            value: targetName
        });

        {
            const notNull = nullConstraint === this.constructor.NOT_NULL
              , allowNull = nullConstraint === this.constructor.ALLOW_NULL
              ;
            // No default, to human-read the model it is much better to
            // explicitly define one of these!
            if(!notNull && !allowNull)
                throw new Error(`TYPE ERROR ForeignKey for ${targetName} nullConstraint `
                                +`is neither NOT_NULL nor ALLOW_NULL which is ambigous.`);

            // This is exciting, if notNull is true, target can't be
            // empty as there must be a non-null key!
            Object.defineProperty(this, 'notNull', {
                value: nullConstraint === this.constructor.NOT_NULL
            });
            Object.defineProperty(this, 'allowNull', {
                value: nullConstraint === this.constructor.ALLOW_NULL
            });
        }

        if(!new Set([ this.constructor.NO_ACTION, this.constructor.SET_NULL
                    , this.constructor.SET_DEFAULT_FIRST, this.constructor.SET_DEFAULT_LAST
                    , this.constructor.SET_DEFAULT_FIRST_OR_NULL , this.constructor.SET_DEFAULT_LAST_OR_NULL
                    , this.constructor.SET_DEFAULT_VALUE, this.constructor.SET_DEFAULT_VALUE_OR_NULL
                    , this.constructor.CUSTOM
                ]).has(defaultConstraint))
            throw new Error(`TYPE ERROR ${this} defaultConstraint `
                        +`is unkown: "${defaultConstraint}".`);

        Object.defineProperty(this, 'defaultConstraint', {
            value: defaultConstraint
        });

        if(defaultConstraint === this.constructor.SET_DEFAULT_VALUE
                || defaultConstraint === this.constructor.SET_DEFAULT_VALUE_OR_NULL) {
            const defaultValue = config[0];
            // must be a valid key-value, usually string, number or in
            // some cases, if allowed, null.
            // However, the future may require more complex keys, e.g. tuples
            // and I don't want to stand in the way of that with enforcing
            // types now. Invalid keys will not pass validation in any way!
            //
            // TODO: With knowledge of the target class, we could check
            // if this is a valid type for a key!
            Object.defineProperty(this, 'defaultValue', {
                value: defaultValue
            });
        }
        else if(defaultConstraint === this.constructor.CUSTOM) {
            const customConstraintFn = config[0];
            if(typeof customConstraintFn !== 'function')
                throw new Error(`TYPE ERROR ${this} constraint is CUSTOM, `
                    + `but the custom argument is not a function: `
                    + `(${typeof customConstraintFn}) "${customConstraintFn}"`);
            Object.defineProperty(this, FOREIGN_KEY_CUSTOM, {
                value: customConstraintFn
            });
        }
    }
    // use only for console.log/Error/debugging purposes
    toString() {
        return `[${this.constructor.name}:${this.targetName} `
              +`${this.notNull ? 'NOT NULL' : 'or NULL'}]`;
    }

    [FOREIGN_KEY_NO_ACTION](targetContainer, currentKeyValue) {
        return currentKeyValue;
    }

    [FOREIGN_KEY_SET_NULL](targetContainer, currentKeyValue) {
        // jshint unused: vars
        return null;
    }

    [FOREIGN_KEY_SET_DEFAULT_FIRST](targetContainer, currentKeyValue) {
        // jshint unused: vars
        const firstKey = getFirst(targetContainer.keys(), null);
        if(firstKey === null)
            throw new Error(`CONSTRAINT ERROR ${this} Can't set first key, there is no first entry.`);
        return firstKey;
    }

    [FOREIGN_KEY_SET_DEFAULT_FIRST_OR_NULL](targetContainer, currentKeyValue) {
        // jshint unused: vars
        return getFirst(targetContainer.keys(), null);
    }

    [FOREIGN_KEY_SET_DEFAULT_LAST](targetContainer, currentKeyValue) {
        // jshint unused: vars
        const lastKey =  getLast(targetContainer.keys(), null);
        if(lastKey === null)
            throw new Error(`CONSTRAINT ERROR ${this} Can't set last key, there is no last entry.`);
        return lastKey;
    }

    [FOREIGN_KEY_SET_DEFAULT_LAST_OR_NULL](targetContainer, currentKeyValue) {
        // jshint unused: vars
        return getLast(targetContainer.keys(), null);
    }

    [FOREIGN_KEY_SET_DEFAULT_VALUE](targetContainer, currentKeyValue) {
        // jshint unused: vars
        if(!targetContainer.has(this.defaultValue))
            throw new Error(`CONSTRAINT ERROR ${this} Can't set defaultValue `
                    +   `"${this.defaultValue}" as key, there is no entry.`);
        return this.defaultValue;
    }

    [FOREIGN_KEY_SET_DEFAULT_VALUE_OR_NULL](targetContainer, currentKeyValue) {
        // jshint unused: vars
        if(!targetContainer.has(this.defaultValue))
            return null;
        return this.defaultValue;
    }

    constraint(targetContainer, currentKeyValue) {
        if(!targetContainer.has(currentKeyValue))
            // The default constraint is only required if the currentKeyValue
            // is not a ke of targetContainer.
            return this[this.defaultConstraint](targetContainer, currentKeyValue);
        return currentKeyValue;
    }
}

export class _BaseLink {
    // resolves KeyOf to the actual [key, value]
    // key must be defined in the parent model
    constructor(keyName) {
        Object.defineProperty(this, 'keyName', {
            value: keyName
        });
    }
    toString() {
        return `[${this.constructor.name} for Key: ${this.keyName}]`;
    }
}

/*
 * It's simpler at the moment not to do this, and
 * have the child explicitly request the foreign key as dependency
 * though, I'm not sure this is even interesting, from a data-hierarchical
 * point of view.
 * The simplification comes from not having to invent a new type for this,
 * which would also include the respective *OrEmpty-Types depnding on the
 * Key configuration.
export class KeyValueLink extends _BaseLink {
    // resolves KeyOf to the actual [key, value]
    // key must be defined in the parent model
}
*/
export class ValueLink extends _BaseLink {
    // resolves KeyOf to the actual value
    // key must be defined in the parent model
}


function getFirst(iter, defaultVal=_NOTDEF) {
    for(const item of iter)
        return item;

    if(defaultVal !== _NOTDEF)
        return defaultVal;

    throw new Error('KEY ERROR not found first item of iterator.');
}

function getLast(iter, defaultVal=_NOTDEF) {
    const items = Array.from(iter);
    if(items.length)
        return items.at(-1);

    if(defaultVal !== _NOTDEF)
        return defaultVal;

    throw new Error('KEY ERROR not found last item of iterator.');
}

// Set has no well defined order, we can just remove any item.
// Would be different with an explicitly "OrderedSet".
function setPop(s) {
    let item;
    // we now know one item, can stop the iterator imediately!
    for(item of s) break;
    s.delete(item);
    return item;
}

function _mapGetOrInit(map, name, init) {
    let result = map.get(name);
    if(result === undefined) {
        result = init();
        map.set(name, result);
    }
    return result;
}


// CAUTION noDepsSet and dependantsMap will be changed!
function _topologicalSortKahn(noDepsSet, requirementsMap, dependantsMap) {
    const topoList = []; // L ← Empty list that will contain the sorted elements (a topologically sorted order)
    // noDepsSet: S ← Set of all nodes with no incoming edge

    console.log('_topologicalSortKahn noDepsSet', noDepsSet);
    console.log('_topologicalSortKahn requirementsMap', requirementsMap);
    console.log('_topologicalSortKahn dependantsMap', dependantsMap);

    // Kahn's algorithm, took it from https://en.wikipedia.org/wiki/Topological_sorting
    while(noDepsSet.size) { // while S is not empty do
        const name  = setPop(noDepsSet);// remove a node n from S
        topoList.push(name);// add n to L
        console.log(`_topologicalSortKahn get name "${name}"`, 'requirementsMap.get(name)', requirementsMap.get(name));
        if(!requirementsMap.has(name)) continue;
        for(const nodeM of requirementsMap.get(name)) {// for each node m with an edge e from n to m do
            const dependencies = dependantsMap.get(nodeM);
            dependencies.delete(name); // remove edge e from the graph
            if(dependencies.size === 0) { //if m has no other incoming edges then
                noDepsSet.add(nodeM); // insert m into S
                dependantsMap.delete(nodeM);
            }
        }
    }

    if(dependantsMap.size) {//if graph has edges then
        //return error (graph has at least one cycle)
        const messages = Array.from(dependantsMap).map(
            ([dependant, dependencies])=> `"${dependant}"(${Array.from(dependencies).join(', ')})`
        );
        throw new Error(`CYCLIC DEPENDENCIES ERROR unresolvable:\n    ${messages.join('\n    ')}`
                      + `\nTopological order so far: ${topoList.join(', ')}`);
    }
    //  return L   (a topologically sorted order)
    return topoList;
}

function* allEntries(...withEntries) {
    for(const item of withEntries)
        yield* item.entries();
}

function* allKeys(...withKeys) {
    for(const item of withKeys)
        yield* item.keys();
}

function getTopologicallySortedOrder(fields, foreignKeys, links, childrenExternalDependencies) {
    console.log('getTopologicallySortedOrder fields', [...fields].map(([k, v])=>[k, v.name, [...v.dependencies] ]));
    console.log('getTopologicallySortedOrder keys', [...foreignKeys].map(([k, v])=>[k, v.toString()]));
    console.log('getTopologicallySortedOrder links', [...links].map(([k, v])=>[k, v.toString()]));
    console.log('getTopologicallySortedOrder childrenExternalDependencies', childrenExternalDependencies);

    // links depend on their link.keyName
    // keys depend on their key.targetName
    // fields depend on their field.dependencies
    const noDepsSet = new Set(allKeys(childrenExternalDependencies, fields, foreignKeys, links)) //S ← Set of all nodes with no incoming edge
        , requirementsMap = new Map()// [dependency] => {...dependants}
        , dependantsMap = new Map()
        ;
    for(const [name, entry] of allEntries(fields, foreignKeys, links)) {
        if(fields.has(name)) {
            console.log(' FFFIELDS has NAMMME:', name, fields.has(name), fields);
            // this is a field
            if(entry.dependencies.size !== 0) {
                noDepsSet.delete(name);
                dependantsMap.set(name, new Set(entry.dependencies));
                for(const dependeny of entry.dependencies)
                    _mapGetOrInit(requirementsMap, dependeny, ()=>[]).push(name);
            }
        }
        // keys and links: both have one dependency
        else if(foreignKeys.has(name)) {
            console.log(' KKKKEYS NAMMME', 'dep', name, '=>', entry.targetName);
            noDepsSet.delete(name);
            dependantsMap.set(name, new Set([entry.targetName]));
            _mapGetOrInit(requirementsMap, entry.targetName, ()=>[]).push(name);
        }
        else if(links.has(name)) {
            console.log(' LLLINKS NAMMME', name, '=>', entry.keyName);
            noDepsSet.delete(name);
            dependantsMap.set(name, new Set([entry.keyName]));
            _mapGetOrInit(requirementsMap, entry.keyName, ()=>[]).push(name);
        }
        else
            throw new Error(`NOT IMPLEMENTED ERROR don't know how to handle name "${name}".`);
    }
    return _topologicalSortKahn(noDepsSet, requirementsMap, dependantsMap);
}

export class _AbstractStructModel extends _BaseContainerModel {
    // See _AbstractStructModel.concreteFactory
    static get fields() { // fields => map string fieldName: instanceof _BaseModel
        // NOT IMPLEMENTED fields is not defined in _AbstractStructModel
        throw new Error(`NOT IMPLEMENTED fields is not defined in ${this.name}`);
    }
    // TODO could raise not implemented also for foreignKeys, links, more()?
    // fields: [string fieldName, instanceof _BaseModel (duck typed?)] ...

    static has(key) { // in all of the local name space
        // Own names, which override parent scope for children dependencies.
        for(const map of [this.fields, this.foreignKeys, this.links]) {
            if(map.has(key))
                return true;
        }
        return false;
    }
    // In all of the local name space returns a:
    //      an instance of _BaseModel from this.fields
    //      an instance of Key from this,keys
    //      an instance of _BaseLink from this.links
    // in that order or throws a KEY ERROR
    static get(key) {
        // Own names, which override parent scope for children dependencies.
        for(const map of [this.fields, this.foreignKeys, this.links]){
            if(map.has(key))
                return map(key);
        }
        throw new Error(`KEY ERROR "${key}" not found in local namespace of ${this.constructor.name}.`);
    }

    static *entries() { // => [name, instance of _BaseModel, Key or _BaseLink]
        yield* allEntries(this.fields, this.foreignKeys, this.links);
    }

    static fromRawValue(dependenciesData, rawEntriesList) {
        console.log(`${this.name}.fromRawValue:\n   dependenciesData`, dependenciesData, '\n   rawEntriesList', rawEntriesList);

        {
            const missing = [];
            for(const key of this.dependencies) {
                if(!(key in dependenciesData))
                    missing.push(key);
            }
            if(missing.length)
                throw new Error(`VALUE ERROR ${this.name}: missing dependency data for ${missing.join(', ')}.`);
        }
        const rawEntries = new Map();
        for(const [key, ...value] of rawEntriesList)
            rawEntries.set(key, value);

        const localScope = new Map()
                // localScope should already own external dependencies!!!
          , collectDependencies = dependencies=>Object.fromEntries(
                iterMap(dependencies, (key)=>[key, localScope.get(key)]));

        console.log('this.initOrder', this.initOrder);
        for(const name of this.initOrder) {
            // By the time each element in initOrder is at the turn,
            // its dependencies are already available in localScope
            // and they can be used.
            if(this.childrenExternalDependencies.has(name)) {
                console.log('init EXTERNAL:', name);
                if(!(name in dependenciesData))
                    throw new Error(`DEPENDENCY ERROR ${this.name} requires "${name}" in dependenciesData.`);
                localScope.set(name, dependenciesData[name]);
            }
            else if(this.fields.has(name)) {
                let Model = this.fields.get(name);
                console.log('init FIELD', name, 'is', Model.name);
                const childDependencies = collectDependencies(Model.dependencies)
                  , rawValue = rawEntries.get(name) || []
                  , instance = Model.fromRawValue(childDependencies, ...rawValue)
                  ;
                localScope.set(name, instance);
            }
            else if(this.foreignKeys.has(name)) {
                const rawValue = rawEntries.get(name) || []
                  , key = this.foreignKeys.get(name)
                  , target = localScope.get(key.targetName)
                    // If rawValue key is a key in target it will be
                    // kept anyway. If this is inappropriate, e.g. null
                    // but key is notNull or key does not exist it will
                    // fail later
                  , value = key.constraint(target, rawValue.length ? rawValue[0] : null)
                  ;
                console.log('init FOREIGN_KEY:', name, '::', value);
                localScope.set(name, value);
            }
            else if(this.links.has(name)) {
                // resolve:
                const link = this.links.get(name)
                  , key = this.foreignKeys.get(link.keyName)
                  , keyValue = localScope.get(link.keyName)
                  , target = localScope.get(key.targetName)
                  ;
                let value;
                if(keyValue === null) {
                    if(key.notNull)
                        throw new Error(`KEY ERROR ${this.name} key ${link.keyName} is null but null is not allowed.`);
                    // may be not allowed!
                    // ALSO if it *is* allowed, this should be wrapped
                    // in an {infer}OrEmpty type
                    value = null;
                }
                else if(target.has(keyValue)) {
                    // if not key.notNull/ if NULL is allowed, this must
                    // be wrapped intp a OrEmpty type!
                    value = target.get(keyValue);
                }
                else
                    throw new Error(`KEY ERROR ${this.name} key ${link.keyName}`);
                // FIXME: we have different link types so far
                //        and we must consider the Null/OrEmpty case!
                console.log('init LINK:', name, '::', value);
                localScope.set(name, value);
            }
            else
                throw new Error(`NOT IMPLEMENTED ${this.name} init unkown "${name}".`);
        }
        const ownEntries = []
          , ownDependenciesData = Object.fromEntries(
                iterMap(this.ownDependencies, key=>[key, dependenciesData[key]]))
          ;
        for(const name of allKeys(this.fields, this.foreignKeys/*, this.links*/)) {
            // links are not required here, as they have no inherent value
            ownEntries.push([name, localScope.get(name)]);
        }
        return new this(ownDependenciesData, ownEntries);
    }

    static concreteFactory(className, ...definitions) {
        console.log('\n' + new Array(30).fill('*+').join(''));
        console.log('START concreteFactory', className, 'raw fields:',    );
        console.log(new Array(30).fill('*+').join('') + '\n');
        if(typeof className !== 'string')
            throw new Error(`className must be string but is ${typeof string}`);

        const fields = new FreezableMap()
          , foreignKeys = new FreezableMap()
          , links = new FreezableMap()
          , other = []
          , requires = Object.seal({
                coherenceGuard: null
              , ownDependencies: EMPTY_SET
            })
          , _childrenAllDependencies = new FreezableSet()
          , seen = new Set()
          ;

        for(const definition of definitions) {
            // Thought I might need these, but I'm not concinced anymore.
            if(typeof definition === 'function'
                    || definition[0] === PROVIDES) {
                other.push(definition);
                continue;
            }

            const [name, value] = definition;

            if(seen.has(name))
                throw new Error(`VALUE ERROR ${className} multiple definitions for name "${name}".`);
            seen.add(name);

            if(name === REQUIRES) {
                const coherenceGuard = definition.at(-1)
                  , ownDependencies = new FreezableSet(definition.slice(1, -1))
                  ;
                if(typeof coherenceGuard !== 'function')
                    // There would be no way to do anything with the dependencies/requirements.
                    throw new Error(`VALUE ERROR: ${className} REQUIRES is defined but `
                        + `coherenceGuard is not a function type: ${typeof coherenceGuard} `
                        + `"${coherenceGuard}".`);
                Object.assign(requires, {coherenceGuard, ownDependencies});
                continue;
            }

            // from here on names must be string
            if(typeof name !== 'string')
                throw new Error(`VALUE ERROR ${className} definition name must be string but is ${typeof name}.`);
            if(value instanceof ForeignKey) {
                foreignKeys.set(name, value);
            }
            else if(value instanceof _BaseLink) {
                links.set(name, value);
            }
            else if(value.prototype instanceof _BaseModel) {
                // value can't be equal to _BaseModel, but that's not
                // intended for direct use anyways.
                // FIXME: We should even check if value is abstract
                // or meant to be used directly, by somehow marking
                // Abstract classes (with a static symbol?);
                fields.set(name, value);
                // All models must communicate this.
                for(const dependency of value.dependencies)
                _childrenAllDependencies.add(dependency);
            }
            else
                throw new Error(`VALUE ERROR: don't know how to handle defintion for ${className}: ${definition}`);
        }
        for(const [keyName, key] of foreignKeys) {
            if(!fields.has(key.targetName))
                throw new Error(`KEY ERROR: ${className} foreignKey "${keyName}" doesn't reference an existing field: ${key}.`);
        }
        for(const [linkName, link] of links) {
            if(!foreignKeys.has(link.keyName))
                throw new Error(`LINK ERROR: ${className} link "${linkName}" doesn't reference an existing foreignKeys: ${link}.`);
        }

        if(other.length)
            console.log(`NOT IMPLEMENTED ${className} other definitions:`, ...other);


        // bind an object as the thisval to the static has function.
        // This way, the definite dependencies property can be pre-calculated
        // with the same method that would be used in an on demand calculation.
        // but we can bind the soon-to-be namespace into it.
        // Could also be done like:
        //      this.has.call({fields, keys, links}, dependency)
        //  like:
        //       iterFilter(childrenDependencies, dependency=>!this.has.call({fields, keys, links}, dependency))
        //  also:
        //      filterFn = dependency=>!this.has.call({fields, keys, links}, dependency)
        //      iterFilter(childrenDependencies, filterFn)
        const staticHas = this.has.bind({fields, foreignKeys, links})
            // remove locally defined names
          , childrenExternalDependencies = new FreezableSet(iterFilter(_childrenAllDependencies, dependency=>!staticHas(dependency)))
          , dependencies = new FreezableSet([ //jshint ignore: line
                      // these are allways external even if this class
                      // itself defines one of these names. This is so
                      // that this element can e.g. redefine what "font"
                      // (or maybe font-size) is for sub-classes.
                      ...requires.ownDependencies
                      // This is communicated upwards local overrides
                      // of all children dependencies are not contained.
                    , ... childrenExternalDependencies
            ])
          , initOrder = getTopologicallySortedOrder(fields, foreignKeys, links, childrenExternalDependencies)// jshint ignore:line
          ;

        // The topological order, to determine child initialization order
        // can be determined in here also, already.


        // this way name will naturally become class.name.
        const result = {[className]: class extends this {
            // jshint ignore: start
            static fields = Object.freeze(fields);
            static foreignKeys = Object.freeze(foreignKeys);
            static links = Object.freeze(links);
            static coherenceGuard = requires.coherenceGuard;

            static ownDependencies = Object.freeze(requires.ownDependencies);
            static childrenExternalDependencies = Object.freeze(childrenExternalDependencies);
            static dependencies = Object.freeze(dependencies);
            static initOrder = Object.freeze(initOrder);
             // jshint ignore: end
        }};


        // Can't override class.fields anymore, would be possible w/o the freeze.
        Object.freeze(result[className]);

        console.log('\n' + new Array(30).fill('*+').join(''));
        console.log('DONE building', className);
        for(let prop of ['fields', 'foreignKeys', 'links', 'dependencies', 'childrenExternalDependencies', 'initOrder'])
            console.log(`    ${className}.${prop}:`, result[className][prop]);

        console.log(new Array(30).fill('*-').join(''));
        console.log(new Array(30).fill('*-').join('') + '\n');
        return result[className];
    }

    constructor(dependencies, entries) {
        super();
        if(this.constructor.ownDependencies.size) {
            console.log(`${this} ownDependencies `, this.constructor.ownDependencies, 'dependencies', dependencies);
            const missing = new Set();
            // It would possible to rewrite external dependency names
            // to internal ones (aliases) here in an attempt to make
            // a child fit into a parent it wasn't exactly designed for.
            // Putting this comment here, to not forget, if this.constructor.dependencies
            // were a Map (not a set) the rewriting could also be done
            // from outside by the initializing parent.
            // Putting this thought here to keep it around.
            for(const key of this.constructor.ownDependencies) {
                if(!Object.hasOwn(dependencies, key))
                    missing.add(key);
            }
            if(missing.size !== 0)
                throw new Error(`VALUE ERROR ${this} missing ownDependencies: ${[...missing].join(', ')}`);
        }
        // Required for e.g. this.set
        Object.defineProperty(this, 'dependencies', {
            value: Object.freeze(dependencies)
          , writable: false
        });

        const value = new FreezableMap(entries.filter(([name,])=>this.constructor.fields.has(name)));

        if(this.constructor.coherenceGuard)
            this.constructor.coherenceGuard.call(this, dependencies, value);

        {
            // validate value
            const missing = []
              , types = []
              ;
            for(const [key, Type] of this.constructor.fields.entries()) {
                if(!value.has(key)) {
                    missing.push(key);
                    continue;
                }
                if(!(value.get(key) instanceof Type))
                    types.push(`${key} is not ${Type.name}`);
            }
            if(missing.length || types.length)
                throw new Error(`TYPE ERROR can't initialize ${this.constructor.name}`
                        + (missing.length ? `; missing items: ${missing.join(', ')}` : '')
                        + (types.length ? `; wrong types: ${types.join(', ')}` : '')
                        + '.'
                );
        }
        {
            // validate keys
            const _keys = new FreezableMap(entries.filter(([name/*, value*/])=>this.constructor.foreignKeys.has(name)));
            for(const [keyName, keyDefinition] of this.constructor.foreignKeys) {
                // Using null to mark "not set" key, even though, maps can
                // theoretically have null keys. This makes that option
                // hardly usable.
                if(!_keys.has(keyName))
                    _keys.set(keyName, null);

                const target = value.get(keyDefinition.targetName)
                  , keyValue = _keys.get(keyName)
                  ;
                if(keyValue === null && keyDefinition.notNull)
                    throw new Error(`KEY ERROR key "${keyName}" is null but `
                                  + `null-key is not allowed: ${keyDefinition}.`);
                else if(keyValue !== null && !target.has(keyValue))
                    throw new Error(`KEY ERROR key "${keyName}" is set to "${keyValue}" `
                                  + `but does not exist in target ${keyDefinition}.`);
                // else
                //      either: null && keyDefinition.nullAllowed
                //      or: target.has(keyValue)
                value.set(keyName, keyValue);
            }
        }

        Object.defineProperty(this, 'value', {
            value: Object.freeze(value)
          , writable: false
        });
        Object.freeze(this);
    }

    *[Symbol.iterator]() {
        yield *this.value;
        // maybe use flags to decide what not to yield
        // users (data readers) may require
        // yield keys, links?

    }
    toObject() {
        const result = {};
        for(let k of allKeys(this.fields, this.foreignKeys))
            result[k] = this.value.get(k).toObject();
        return result;
    }

    size() {
        //  FIXME: Keys and original values are contained. What about Links?
        // I have a hunch that even links, should be contained, if we want
        // to be able to further reference them.
        return this.value.size();
    }
    has(key) {
        //  FIXME: Keys and original values are contained. What about Links?
        // I have a hunch that even links, should be contained, if we want
        // to be able to further reference them.
        return this.value.has(key);
    }

    keys() {
        //  FIXME: Keys and original values are contained. What about Links?
        // I have a hunch that even links, should be contained, if we want
        // to be able to further reference them.
        return this.value.keys();
    }

    get(key, defaultReturn=_NOTDEF) {
        if(this.has(key))
            return this.value.get(key);
        if(defaultReturn !== _NOTDEF)
            return defaultReturn;
        throw new Error(`KEY ERROR "${key}" not found in ${this}.`);
    }
    set(key, entry) {
        // could return this
        console.warn(`!!!!! set "${key}" in ${this}.`);
        if(this.has(key) && this.value.get(key) === entry) {
            console.warn(`>>>>>Value at "${key}" equals entry in ${this}.`, entry);
            return this;
        }
        // This can also set keys, the constructor will check!
        const newValue = [];
        for(const [k, v] of this.value)
            newValue.push(k, k===key ? entry : v);

        // FIXME: missing dependencies!
        return new this.constructor(this.dependencies, Object.entries(newValue));
    }
}

export class _AbstractListModel extends _BaseContainerModel {
    static get Model() {
        // NOT IMPLEMENTED Model is not defined in _AbstractListModel
        throw new Error(`NOT IMPLEMENTED Model is not defined in ${this.name}`);
    }

    static get dependencies() {
        return this.Model.dependencies;
    }

    static concreteFactory(className, Model /* a _BaseModel */) {
        // jshint unused: vars
        // this way name will naturally become class.name.
        const result = {
            // jshint ignore: start
            [className]: class extends this {
                static Model = Model;
            }
            // jshint ignore: end
        };
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
    toObject() {
        return this.value.map(entry=>entry.toObject());
    }
    static fromRawValue(raw) {
        return new this(raw.map(entry=>this.Model.fromRawValue(entry)));
    }

    get length() {
        return this.value.length;
    }
    get size() {
        return this.value.length;
    }

    has(key) {
        const index = parseInt(key, 10);
        return (index >= 0 && index < this.length);
    }

    keys() {
        return this.value.keys();
    }

    get(key, defaultReturn=_NOTDEF) {
        let index = parseInt(key, 10);
        if(index < 0)
            // like Array.prototype.at
            // HOWEVER, the key is not the canonical path in this case;
            index = this.value.length - index;
        if(index >= 0 && index < this.value.length)
            return this.value[key];
        if(defaultReturn !== _NOTDEF)
            return defaultReturn;
        throw new Error(`KEY ERROR index "${key}" not found, length ${this.value.length} in ${this}.`);
    }

    set(key, entry) {
        let index = parseInt(key, 10);
        if(index < 0)
            // like Array.prototype.at
            // HOWEVER, the key is not the canonical path in this case;
            index = this.value.length - index;
        if(this.value[index] === entry)
            return this;
        const newValue = this.value.slice();
        if(index >= 0 && index < this.value.length)
            newValue[index] = entry;
        else
            // See other array operations like push, pop, shift, unshift, splice
            throw new Error(`KEY ERROR index "${key}" not found, length ${this.value.length} in ${this}.`);
        return new this.constructor(newValue);
    }

    _add(method, ...entries) {
        if(entries.length === 0)
            return this;
        const newValue = this.value.slice();
        newValue[method](...entries);
        return new this.constructor(newValue);
    }
    push(...entries) {
        return this._add('push', ...entries);
    }
    unshift(...entries) {
        return this._add('unshift', ...entries);
    }

    _remove(method) {
        if(this.value.length === 0)
            return this;
        const newValue = this.value.slice();
        newValue[method]();
        return new this.constructor(newValue);
    }
    pop() {
        return this._remove('pop');
    }
    shift() {
        return this._remove('shift');
    }

    splice(start, deleteCount, ...entries) {
        if(deleteCount === 0 && entries.length === 0)
            return this;
        const newValue = this.value.slice();
        newValue.splice(start, deleteCount, ...entries);
        return new this.constructor(newValue);
    }
}

// Very similar to _AbstractListModel
export class _AbstractMapModel extends _BaseContainerModel {
    static get Model() {
        // NOT IMPLEMENTED Model is not defined in _AbstractMapModel
        throw new Error(`NOT IMPLEMENTED Model is not defined in ${this.name}`);
    }

    static get dependencies() {
        return this.Model.dependencies;
    }

    static concreteFactory(className, Model /* a _BaseModel */) {
        // jshint unused: vars
        // this way name will naturally become class.name.
        const result = {
            // jshint ignore: start
            [className]: class extends this {
                static Model = Model;
            }
            // jshint ignore: end
        };
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

    // Add a toMap method if a Map is desired.
    // This is used e.g. to put into JSON.
    toObject() {
        return Object.fromEntries(
            Array.from(this.value)
                 .map(([key, entry])=>[key, entry.toObject()])
        );
    }

    static fromRawValue(raw) {
        return new this(raw.map(([key, entry])=>[key, this.Model.fromRawValue(entry)]));
    }

    get size() {
        return this.value.size;
    }

    keys() {
        return this.value.keys();
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
    delete(key) {
        if(!this.value.has(key))
            return this;
        const newValue = new Map(this.value);
        newValue.delete(key);
        return new this.constructor(Array.from(newValue));
    }
}


// combines the order and inserting logic of the _AbstractListModel
// with the uniqueness by the keys of the _AbstractMapModel
export class _AbstractOrderedMapModel extends _BaseContainerModel {
    static get Model() {
        // NOT IMPLEMENTED Model is not defined in _AbstractMapModel
        throw new Error(`NOT IMPLEMENTED Model is not defined in ${this.name}`);
    }

    static get dependencies() {
        console.warn(`>>>get dependencies ${this.name} Model ${this.Model.name}.dependencies: `, this.Model.dependencies.size, ...this.Model.dependencies);
        return this.Model.dependencies;
    }

    static concreteFactory(className, Model /* a _BaseModel */) {
        // jshint unused: vars
        // this way name will naturally become class.name.
        const result = {
            // jshint ignore: start
            [className]: class extends this {
                static Model = Model;
            }
            // jshint ignore: end
        };
        // Can't override class.Model anymore, would be possible w/o the freeze.
        // Maybe only fix "Model" property?
        // Object.freeze(result[className]);
        return result[className];
    }

    constructor(entries) {
        const _values = []
          , _keys = new FreezableMap()
          ;

        super();
        {
            let index = 0;
            // made from an entries array : [[key, value], [key, value]]
            // or a map, which can be iterated that way.
            const typeFails = [];
            for(const [key, entry] of entries) {
                if(!(entry instanceof this.constructor.Model))
                    typeFails.push(`${key} [at ${index}] ("${entry.toString()}" typeof ${typeof entry})`);

                if(_keys.has(key)) {
                    // Could be an error as well, but the newer entry
                    // will override the older value;
                    _values[_keys.get(key)] = entry;
                }
                else {
                    _values.push(entry);
                    _keys.set(key, index);
                    index += 1;
                }
            }
            if(typeFails.length)
                throw new Error(`TYPE ERROR ${this.constructor.name} `
                    + `expects ${this.constructor.Model.name} `
                    + `wrong types in ${typeFails.join(', ')}`
                );
        }
        Object.defineProperty(this, '_values', {
            value: Object.freeze(_values)
          , writable: false
          , enumerable: true
        });
        Object.defineProperty(this, '_keys', {
            value: Object.freeze(_keys)
          , writable: false
          , enumerable: true
        });
    }

    static fromRawValue(childDependencies, raw) {
        return new this(raw.map(([key, entry])=>[key, this.Model.fromRawValue(childDependencies, entry)]));
    }

    entries() {
        const entries = [];
        for(const [key, index] of this._keys)
            entries[index] = [key, this._values[index]];
        return entries;
    }

    toObject() { // => JSON compatible ...
        this.entries().map(([k, v])=>[k, v.toObject()]);
    }

    get size() {
        return this._value.length;
    }

    has(key) {
        return this._keys.has(key);
    }

    get(key, defaultReturn=_NOTDEF) {
        if(this.has(key))
            return this._values[this._keys.get(key)];
        if(defaultReturn !== _NOTDEF)
            return defaultReturn;
        throw new Error(`KEY ERROR "${key}" not found in ${this}.`);
    }

    keys() {
        return this._keys.keys();
    }

    // This method can be handy for the slice method, which is handy together
    // with the splice method.
    indexOf(key) {
        return this.has(key) ? this._keys(key) : -1;
    }

    // this.indexOf(key) and this.size can be handy to use splice.
    // It uses the original Array.prototype.splice method, but it
    // returns a changed _AbstractOrderedMapModel instance if it detects
    // change (which doesn't do a too deep equality comparison).
    splice(startIndex, deleteCount, ...entries) {
        const newEntries = this.entries()
          , deleted = newEntries.splice(startIndex, deleteCount, ...entries)
          ;
        // Using deleted because splice accepts also a negative deleteCount
        // and checkung the result is just simpler.
        if(deleted.length === 0 && entries.length === 0)
            // TODO: Could check more thoroughly if it has changed, but this is
            // good enough for now.
            return this;
        return new this.constructor(newEntries);
    }

    // This method won't accept undefined keys, because the ordered insertion
    // intent is more explicitly expressed by the push, unshift, splice
    // methods to insert new values.
    set(key, newEntry) {
        // The KEY ERROR from the get method is intendet here if key does not exist!
        if(this.get(key) === newEntry)
            return this;
        // replace
        this.splice(this._keys.get(key), 1, [key, newEntry]);
    }

    delete(key) {
        if(!this.has(key))
            return this;
        return this.splice(this._keys.get(key), 1);
    }

    // append, add to end
    push(...entries) {
        return this._splice(this.size, 0, ...entries);
    }
    // add to front
    unshift(...entries) {
        return this._splice(0, 0, ...entries);
    }
    // remove from end
    pop(deleteCount=1) {
        return this._splice(this.size-deleteCount, deleteCount);
    }
    // remove from front
    shift(deleteCount=1) {
        return this._splice(0, deleteCount);
    }

}

// has a value or is empty
// get value => [bool isEmpty, null or value]
export class _AbstractOrEmptyModel extends _BaseModel {
    static get Model() {
        // NOT IMPLEMENTED Model is not defined in _AbstractOrEmptyModel
        throw new Error(`NOT IMPLEMENTED Model is not defined in ${this.name}`);
    }

    static get dependencies() {
        console.log(`${this.name} get dependencies`, this.Model.name, this.Model.dependencies, this.Model.dependencies.size);
        return this.Model.dependencies;
    }

    static concreteFactory(className, Model /* a _BaseModel */ ) {
        // jshint unused: vars
        // this way name will naturally become class.name.
        const result = {
            // jshint ignore: start
            [className]: class extends this {
                static Model = Model;
            }
            // jshint ignore: end
        };
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
    toObject() {
        // Could be not set in resulting parent object or null???
        // but I don't want to bloat this right away.
        return [this.isEmpty, ...( this.isEmpty ? [] : [this._value.toObject()] )];
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
export  class _AbstractGenericModel extends _BaseModel {
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
    toObject() {
        // not much knowledge about this!
        return this.value;
    }
    static fromRawValue(raw) {
        return new this(raw);
    }
}

// some basics
export const AnyModel = _AbstractGenericModel.concreteFactory('AnyModel')
  , IntegerModel = _AbstractGenericModel.concreteFactory('IntegerModel')
    // Beautiful
  , IntegerOrEmptyModel = _AbstractOrEmptyModel.concreteFactory('IntegerOrEmptyModel', IntegerModel)
  , NumberModel =  _AbstractGenericModel.concreteFactory('NumberModel')
  , NumberOrEmptyModel = _AbstractOrEmptyModel.concreteFactory('NumberOrEmptyModel', NumberModel)
  , BooleanModel = _AbstractGenericModel.concreteFactory('BooleanModel')
  , StringModel = _AbstractGenericModel.concreteFactory('StringModel')
  ;

export class Path {
    static SEPARATOR = '/'; // jshint ignore: line

    constructor(...pathParts) {
        for(let [i, part] of pathParts.entries()) {
            if(typeof part !== 'number' && part.indexOf(this.constructor.SEPARATOR) !== -1)
                throw new Error(`TYPE ERROR path parts must not contain SEPERATOR "${this.constructor.SEPARATOR}"`
                    + ` but found in part #${i} "${part}" ${this}.`);
        }
        const cleanParts = pathParts.filter(part=>part !== '');
        Object.defineProperty(this, 'parts', {
            value: Object.freeze(cleanParts)
          , enumerable: true
        });
    }
    static fromParts(...pathParts) {
        return new this(...pathParts);
    }
    static fromString(pathString) {
        return this.fromParts(...pathString.split(this.SEPARATOR));
    }
    fromString(pathString) {
        return this.constructor.fromString(pathString);
    }
    fromParts(...pathParts) {
        return this.constructor.fromParts(...pathParts);
    }
    toString() {
        return this.parts.join(this.constructor.SEPARATOR);
    }
    [Symbol.iterator](){
        return this.parts[Symbol.iterator]();
    }
    appendString(pathString) {
        return this.append(...this.fromString(pathString).parts);
    }
    append(...pathParts) {
        return this.fromParts(...this.parts, ...pathParts);
    }
    get isRoot(){
        return this.parts.length === 0;
    }
    get parent() {
        if(this.isRoot)
            throw new Error('Can\'t get parent path is root path.');
        return this.fromParts(...this.parts.slice(0, -1));
    }
}

export const IS_CONTAINER = Symbol('IS_CONTAINER');
export function *getAllPathsAndValues(state) {
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

export function getEntry(state, path, defaultVal=_NOTDEF) {
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

export function getValue(state, path, defaultVal=_NOTDEF) {
    const result = getEntry(state, path, defaultVal);
    return result === defaultVal ? result : result.value;
}

// How does changing the font trickle down to an updated axisLocations state!
// it seems that some knowledge about the font (READ ONLY) must be in some
// lower model.
// AND:

function* _getAllEntries(state, path) {
    const pathInstance = (typeof path === 'string' ? Path.fromString(path) : path);
    let current = state;
    yield current; // for the empty path
    for(let pathPart of pathInstance) {
        current = getEntry(current, pathPart);
        yield current;
    }
}


export function setEntry(state, path, entry) {
    const pathInstance = (typeof path === 'string' ? Path.fromString(path) : path)
        // pathInstance.parts[i] will be a key in entriesAlongPath[i]
        //    i.e.: entriesAlongPath[i].get(pathInstance.parts[i])
        // entriesAlongPath[i] is located at the empty path
        // Thus, path is than entriesAlongPath.
      , entriesAlongPath = [..._getAllEntries(state, path)]
      ;
    let updated = entry;
    for(let i=pathInstance.parts.length-1; i>=0; i--) {
        // We never access the last item in entriesAlongPath as
        // entriesAlongPath.length - 1 === pathInstance.parts.length
        const key = pathInstance.parts[i];
        // All of these must be container types, as they contain children.
        updated = entriesAlongPath[i].set(key, updated);
    }
    return updated;
}

export function getModel(Model, path) {
    const pathInstance = (typeof path === 'string' ? Path.fromString(path) : path);
    return pathInstance.parts.reduce((accum, key)=>{
        console.log('getModel:', key, 'from:', accum);
        if('Model' in accum)
            // We don't use key here, because this is a Map/List
            // and the key is just a placeholder, the Model is equal
            // for each element.
            return accum.Model;
        if('fields' in accum)
            return accum.fields.get(key);
        throw new Error(`KEY ERROR don't know how to get model from ${accum.name}`);
    }, Model);
}


// In this cases, for array/map types, path keys/indexes don't
// need to exist they can in fact be any value but not empty!.
export function fromRawValue(RootModel, path, rawValue) {
    const pathInstance = (typeof path === 'string' ? Path.fromString(path) : path)
      , Model = getModel(RootModel, pathInstance)
      ;
    return Model.fromRawValue(rawValue);
}

export function setRawValue(state, path, rawValue) {
    const pathInstance = (typeof path === 'string' ? Path.fromString(path) : path)
      , newEntry = fromRawValue(state.constructor, pathInstance, rawValue)
      ;
      // FIXME: Only do if value changes ... eq() ...
      //    because this would optimize required change/update work.
    console.log('setRawValue newEntry:', newEntry);
    return setEntry(state, pathInstance, newEntry);
}

export function changeEntry(state, path, method, ...args) {
    const pathInstance = (typeof path === 'string' ? Path.fromString(path) : path)
      , entry = getEntry(state, pathInstance)
      , newEntry = entry[method](...args)
      ;
    return setEntry(state, pathInstance, newEntry);
}

export function pushEntry(state, path, ...entries) {
    return changeEntry(state, path, 'push', ...entries);
}

export function popEntry(state, path) {
    return changeEntry(state, path, 'pop');
}

export function spliceEntry(state, path, start, deleteCount, ...items) {
    return changeEntry(state, path, 'splice', start, deleteCount, items);
}

export function deleteEntry(state, path, key) {
    return changeEntry(state, path, 'delete', key);
}

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
//      immutable/copy on write thing:
//          * get the state
//          * transform as much as you like
//          * set the state to the application.
//
// Inherent coherenceGuards!!!
//
// produce changed paths in a comparison(oldState, newState)
//          NOTE: in arrays/maps add/delete operation could be tracked
//                not sure we need this though, maybe just acknowledge that
//                the thing has changed???
//                especially for deletions, as for additons we can just
//                output the new path.
//                BTW: size/length could be treated as a change indicator
//                      so the ui knows wherther to rebuild a list rather
//                      than to update it?
//
// hmm for simple types and structs everything is always changed
// maps can also have added/deleted
// arrays can have added/deleted but also moves, when the element is still
// in the array but has another index.

class CompareStatus {
    constructor(name) {
        this.name = name;
        Object.freeze(this);
    }
    toString() {
        return `[compare ${this.name}]`;
    }
}
export const COMPARE_STATUSES = Object.freeze(Object.fromEntries([
        'EQUALS', 'CHANGED', 'NEW', 'DELETED', 'MOVED', 'LIST_NEW_ORDER'
    ].map(name=>[name, new CompareStatus(name)])
));

export function* rawCompare(oldState, newState) {
    if(!(oldState instanceof _BaseModel) || !(newState instanceof _BaseModel))
        throw new Error(`TYPE ERROR oldState ${oldState} and `
                + `newState ${newState} must be instances of _BaseModel.`);
    const {EQUALS, CHANGED, NEW, DELETED, MOVED, LIST_NEW_ORDER} = COMPARE_STATUSES;
    if(oldState === newState) {
        // return also equal paths for completeness at the beginning,
        // can be filtered later.
        // HOWEVER this return will prevent the alogrithm from descending
        // in the structure and thus we won't get all available paths anyways!
        yield [EQUALS, null];
        return;
    }

    // Not the same constructor, but instanceof is not relevant here
    // because a sub-class can change everything about the model.
    if(oldState.constructor !== newState.constructor) {
        yield [CHANGED, null];
        return;
    }

    // self yield? yes e.g. an array may not be equal (===) but contain
    // just equal items at the same position, still for strict equality
    // that doesn't matter because it's a diferent array?
    yield [CHANGED, null];

    // Now instanceof counts, because it tells us how to use/read the instances.
    if(oldState instanceof _AbstractStructModel) {
        // both states are expected to have the same key
        for(const [key, oldEntry] of oldState) {
            for(const [result, data, ...pathParts] of rawCompare(oldEntry, newState.get(key)))
                yield [result, data, key, ...pathParts];
        }
        return;
    }

    if(oldState instanceof _AbstractListModel) {
        // I think this is a very interesting problem. On the Array layer
        // we can deal with change, addition, deletion and also movement
        // change (replace) is like deletion plus addition, we can't decide
        // how it happened exactly, it indicates that the new value and the
        // old value are not identical, nor somewhere in the array as that
        // would jst be moved.
        // Should we find moves first (from index, to index) so we can
        // keep them of other comparisions.
        //
        // so, when the new array is shorter than the old one we got
        // netto more deletion
        // when it's longer, we got netto addition.
        //
        // When everything new in newState got changed or replaced, we don't
        // care? One question would be how to map this to deeper down
        // change operations, we don't want to rebuild all of the UIs within
        // the array, just because one value deep down changed. Need to be
        // more precise.
        //
        // but also, when just one value in a multi-axis slider changed,
        // the mapping/updating would likely be swift.
        //
        // another example would be a simple reordering operation, e.g.
        // move the keyframe at index 4 to index 1 ...
        //
        // One question is probably how to decide whether the UI should be
        // replaced or updated! There may be a sweet spot at which replacing
        // is better than updating!
        // Consequently, we need to find out why we don't rebuild all of
        // the UI all the time, e.g. one entry in the root struct changed,
        // that should not require to rebuild the wholde app.
        // Similarly the array case, but it's much harder to decide here
        // what to do!
        //
        // hmm, to keep identities, a map could be used. Order could be
        // stored as part of the value, or next to the map, And the key
        // would be an increasing number (easy to handle!) for new inserts.
        // (Or we use an OrEmpty Type in an array to delete stuff, but at
        // this point, the map which allows for deletions natively is nice.
        // The array could be used to keep an ordered list of the keys.
        // It could be serialized without revealing the complex structure.
        // That way, new order of the array, or any additions deletions
        // etc. could be handled nicely by the UI.

        // Ok, such an id-array, if implemented as it's own type, what
        // can it do?
        // IDs are internal, not global.
        // Since set requires the element to exist already, it would not
        // change the id. But we can have a "replace" method.
        // set access is still via indexes,
        // it's interesting, we should rather make the implementation a
        // pattern. Because that way we can access the list independently
        // from the values, and get info if the list changed or not, in
        // contrast to the map...
        // Maybe a struct{
        //      order => list of ids
        //    . entries => map id: entry
        // }
        // IT should be impossible to come up with external ids though!
        //
        // So what is the aim of this?

        // A) to distinguish between change and replace:
        //     change: same key-id different entry => deep compare
        //             => how does the ui know?
        //                 if deeply anything changed, it will create a path
        //                 otherwise, there will be no deep path.
        //                 Consequently, even if the id of the entry changed
        //                 it may still be equivalent and no action is required!
        //                 but, we rather don't want to do equivalence comparison!
        //                 Hence, we, should not apply the changed if it's equivalent!
        //     replace: old key-id deleted new key-id inserted, order changed as well
        //             as before, we should probably not apply a replace if it's equivalent
        //             but this will otherwise create a new id, so it must recreate the UI(?)
        //             and it won't go into deep comparison?
        //
        // At the moment, I feel like I should create a simple solution that
        // could be enhanced later, either by adding new types to the model,
        // coherenceGuards or by updating the compare method.


        // Deletions won't be mentioned, the new order length is the new lenght.
        // Entries are either old indexes, the new indexes are the
        // indexes of the order array.
        // new Order[3, 2, NEW, NEW, 4]: note how the last item did not change!
        // new Order[3, 2, NEW, NEW, EQUALS]
        // What if there are duplicates, i.e. entries that are equal?
        // Let's say they are consumend one by one! If oldState had two
        // entries of a kind and newState has three: []

        const newOrder = []
          , seen = new Map()
          , oldFoundIndexes = new Set()
          ;
        // for(const [oldIndex, oldEntry] of oldState) {
        //     const startIndex = seen.get(newEntry)
        //       , newIndex = newState.value.indexOf(oldEntry, startIndex)
        //       ;
        //     if(newIndex !== -1) {
        //         // found
        //         newOrder[newIndex] = oldIndex === newIndex ? [EQUALS] : [MOVED, oldIndex];
        //         seen.set(newEntry, oldIndex + 1);
        //     }
        //     else
        //         // Give indexOf a chance to search less, the result is
        //         // the same as not changing seen[newEntry], not sure if
        //         // this improves performance.
        //         seen.set(newEntry, Infinity);
        // }
        // for(const [newIndex, newEntry] of newState) {
        //     if(newOrder[newIndex])
        //         continue;
        //     newOrder[newIndex] = newIndex < oldState.value.length ? [CHANGED] : [NEW];
        // }

        for(const [newIndex, newEntry] of newState) {
            const startIndex = seen.get(newEntry)
              , oldIndex = oldState.value.indexOf(newEntry, startIndex)
              ;
            if(oldIndex === -1) {
                // Give indexOf a chance to search less, the result is
                // the same as not changing seen[newEntry], not sure if
                // this improves performance.
                seen.set(newEntry, Infinity);
                continue;
            }
            // found
            newOrder[newIndex] = oldIndex === newIndex
                                ? [EQUALS]
                                : [MOVED, oldIndex]
                                ;
            seen.set(newEntry, oldIndex + 1);
            oldFoundIndexes.add(oldIndex);
        }
        for(const [newIndex/*, newEntry*/] of newState) {
            if(newOrder[newIndex] !== undefined)
                continue;
            // not found in oldState
            newOrder[newIndex] = (oldFoundIndexes.has(newIndex) // marked as MOVED
                                    || newIndex >= oldState.value.length)
                                ? [NEW]
                                : [CHANGED]
                                ;
        }
        Object.freeze(newOrder);
        yield [LIST_NEW_ORDER, newOrder]; // !!! FIXME
        for(const [index, [status, /*oldIndex*/]] of newOrder.entries()) {
            if(status === EQUALS || status === MOVED || status === NEW) {
                // EQUALS: nothing to do.
                // MOVED: not compared, listener must reorder according to newOrder.
                // NEW: Item at index requires a new UI or such, there's nothing to compare.
                yield [status, null, index];
            }
            else if(status === CHANGED) {
                // There's already an item at that index, so we compare:
                const oldEntry = oldState.get(index)
                 , newEntry = newState.get(index)
                 ;
                for(const [result, data, ...pathParts] of rawCompare(oldEntry, newEntry))
                    yield [result, data, index, ...pathParts];
                continue;
            }
            else
                throw new Error(`Don't know how to handle status ${status}`);
        }
        return;
    }
    if(oldState instanceof _AbstractMapModel) {
        for(const [key, /*oldEntry*/] of oldState) {
            if(!newState.has(key))
                yield [DELETED, null, key];
        }
        for(const [key, newEntry] of newState) {
            if(!oldState.has(key)) {
                yield [NEW, null, key];
                continue;
            }
            const oldEntry = oldState.get(key);
            if(oldEntry === newEntry) {
                yield [EQUALS, null, key];
                continue;
            }
            // CHANGED: deep compare, both keys exist
            for(const [result, data, ...pathParts] of rawCompare(oldEntry, newEntry))
                yield [result, data, key, ...pathParts];
            continue;
        }
        return;
    }
    // * states should know how to compare
    // each level would produce changed keys, and we can recursively descend?
    // a verbose mode would provide all changed paths, where a compact mode
    // only keeps the longest unique paths, where the leaves changed, this
    // will be interesting!
    throw new Error(`VALUE ERROR Don't know how to compare ${oldState}`);
}


export function* compare(oldState, newState) {
    for(const [status, data, ...pathParts] of rawCompare(oldState, newState))
        yield [status, data, Path.fromParts(...pathParts)];
}

export function compareToLog(compareResult) {
    for(const [status, data, path] of  compareResult) {
        if(status === COMPARE_STATUSES.LIST_NEW_ORDER) {
            console.log(`    ${status}: ${path} ;;`);
            for(let [i, [st, ...val]] of data.entries())
                console.log(`        #${i} ${st} data:`, ...val, ';;');
        }
        else
            console.log(`    ${status}: ${path} ;;`);
    }
}

// Coherence guards:
//
// The UI of the type tools grid will serve here as a target, as it has
// a lot of inherent data logic, that should be separated. It also
// is layered several levlels deep, which makes it more interesting.
// At the outher most level e.g. an axis used in the dimension controls
// should not be used (be disabled) in manual axis locations.
// Then, between the (two) dimensions, the axis also must be mutual exclusive.
// On the level of the dimension itself, there's logic involved "massaging"
// stepping values with differnt constraints, min/max, being non-zero etc.
// also, about stepping, the model should be able to produce the "other value"
// either by exosing method or by exporting a static function or both.
//
//
// SQL Constraints come into mind, especially at this point e.g. UNIQUE:
//    NOT NULL - Ensures that a column cannot have a NULL value
//    UNIQUE - Ensures that all values in a column are different
//    PRIMARY KEY - A combination of a NOT NULL and UNIQUE. Uniquely identifies each row in a table
//    FOREIGN KEY - Prevents actions that would destroy links between tables
//    CHECK - Ensures that the values in a column satisfies a specific condition
//    DEFAULT - Sets a default value for a column if no value is specified
//    CREATE INDEX - Used to create and retrieve data from the database very quickly
//
// Maybe we can have layers of checks here, things like UNIQUE could easily
// be built in, while more complex stuff needs to be custom.
//
// Good thing we are immutable: We can build up the new model completeley
// and then validate it (also, ask/decide to skip validation while in progress)
// It's just important that eventually there's a coherent model.
// If the new model is invalid, we just don't apply it, and that's it.
//
// I'll have tp look into some nosql/object stores a bit!
// there's e.g. a common model to reference another value by unique ID
// which is very handy when normalizing stuff!. E.g. the activeTarget
// state is an index into the list of targets. And the dimension axis
// is an index into the list of available axes.
// Within a datastructure, uniqueness can also be achieved i.e. using a
// dictionary, where the keys are unique by default. Bue, e.g. references
// to those entries from further away.

