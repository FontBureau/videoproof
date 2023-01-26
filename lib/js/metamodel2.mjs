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

export class CoherenceFunction {
    constructor(dependencies, fn/*(valueMap)*/) {
        Object.defineProperties(this, {
            dependencies: {value: Object.freeze(new FreezableSet(dependencies))}
          , fn: {value: fn}
          , name: {value: fn.name || '(anonymous)'}
        });
    }
    // This way it goes nicely into the struct definition without
    // having to repeat the name!
    get nameItem() {
        return  [this.name, this];
    }
}

// Will prevent accidental alteration, however, this is not vandalism proof.
// I tried using Javascript Proxy for this, however, it is not vandalism
// proof either (e.g. via prototype pollution), if that is a concern, an
// object with an internal map as storage and the same interface as Map
// is better.
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
    /**
     * Lifecycle Protocol API:
     *
     * constructor(oldState=null, ...) => new Model(currentInstance)=> a draft
     * dependencies => a set of names or an empty set
     * static createPrimalState() => an immutable with "primal value" implementation specific
     * isDraft => bool
     * getDraf => a draft
     * metamorphose(...) => an immutable
     *
     */
    constructor(oldState=null) {
        if(oldState && oldState.constructor !== this.constructor)
            throw new Error(`TYPE ERROR: oldState must have the same constructor as this ${this}`);
        this[OLD_STATE] = oldState || null;
        Object.defineProperty(this, _IS_DRAFT_MARKER, {value: true, configurable: true});
    }

    static dependencies = EMPTY_SET; // jshint ignore:line

    get dependencies() {
        return this.constructor.dependencies;
    }

    static createPrimalState() {
        throw new Error(`NOT IMPLEMENTED createPrimalState in ${this}.`);
    }

    getDraft() {
        if(this.isDraft)
            throw new Error(`LIFECYCLE ERROR ${this} must be in immutable mode to get a draft for it.`);
        return new this.constructor(this);
    }

    get isDraft() {
        return this[_IS_DRAFT_MARKER];
    }

    metamorphose() {
        throw new Error(`NOT IMPLEMENTED metamorphose in ${this}.`);
    }

    // qualifiedKey => can distinguish between alias/shortcut and
    // absolut entry. e.g. "@firstChild" vs ".0"
    get(qualifiedKey) {
        throw new Error(`NOT IMPLEMENTED get (of "${qualifiedKey}") in ${this}.`);
    }

    // Each model will have to define this.
    get value() {
        throw new Error(`NOT IMPLEMENTED get value in ${this}.`);
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
    static NULL = Symbol('NOT_NULL');
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

        Object.defineProperty(this, 'NULL', {
            value: this.constructor.NULL
        });

        Object.defineProperty(this, 'targetName', {
            value: targetName
        });

        Object.defineProperty(this, 'dependencies', {
            value: Object.freeze(new FreezableSet([targetName]))
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
            // some cases, if allowed, ForeignKey.NULL.
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

    [FOREIGN_KEY_SET_NULL](targetContainer/*, currentKeyValue*/) {
        // jshint unused: vars
        return this.NULL;
    }

    [FOREIGN_KEY_SET_DEFAULT_FIRST](targetContainer/*, currentKeyValue*/) {
        // jshint unused: vars
        const firstKey = getFirst(targetContainer.keys(), this.NULL);
        if(firstKey === this.NULL)
            throw keyConstraintError(new Error(`CONSTRAINT ERROR ${this} Can't set first key, there is no first entry.`));
        return firstKey;
    }

    [FOREIGN_KEY_SET_DEFAULT_FIRST_OR_NULL](targetContainer/*, currentKeyValue*/) {
        // jshint unused: vars
        return getFirst(targetContainer.keys(), this.NULL);
    }

    [FOREIGN_KEY_SET_DEFAULT_LAST](targetContainer/*, currentKeyValue*/) {
        // jshint unused: vars
        const lastKey =  getLast(targetContainer.keys(), this.NULL);
        if(lastKey === this.NULL)
            throw new keyConstraintError(Error(`CONSTRAINT ERROR ${this} Can't set last key, there is no last entry.`));
        return lastKey;
    }

    [FOREIGN_KEY_SET_DEFAULT_LAST_OR_NULL](targetContainer/*, currentKeyValue*/) {
        // jshint unused: vars
        return getLast(targetContainer.keys(), this.NULL);
    }

    [FOREIGN_KEY_SET_DEFAULT_VALUE](targetContainer/*, currentKeyValue*/) {
        // jshint unused: vars
        if(!targetContainer.has(this.defaultValue))
            throw keyConstraintError(new Error(`CONSTRAINT ERROR ${this} Can't set defaultValue `
                    +   `"${this.defaultValue}" as key, there is no entry.`));
        return this.defaultValue;
    }

    [FOREIGN_KEY_SET_DEFAULT_VALUE_OR_NULL](targetContainer/*, currentKeyValue*/) {
        // jshint unused: vars
        if(!targetContainer.has(this.defaultValue))
            return this.NULL;
        return this.defaultValue;
    }

    constraint(targetContainer, currentKeyValue) {
        if(!targetContainer.has(currentKeyValue))
            // The default constraint is only required if the currentKeyValue
            // is not a key of targetContainer.
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
        Object.defineProperty(this, 'dependencies', {
            value: Object.freeze(new FreezableSet([keyName]))
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

function getTopologicallySortedOrder(coherenceFunctions, fields, foreignKeys, links, childrenExternalDependencies) {
    console.log('getTopologicallySortedOrder coherenceFunctions', [...coherenceFunctions].map(([k, v])=>[k, v.toString()]));
    console.log('getTopologicallySortedOrder fields', [...fields].map(([k, v])=>[k, v.name, [...v.dependencies] ]));
    console.log('getTopologicallySortedOrder keys', [...foreignKeys].map(([k, v])=>[k, v.toString()]));
    console.log('getTopologicallySortedOrder links', [...links].map(([k, v])=>[k, v.toString()]));


    console.log('getTopologicallySortedOrder childrenExternalDependencies', childrenExternalDependencies);

    // links depend on their link.keyName
    // keys depend on their key.targetName
    // fields depend on their field.dependencies
    // coherenceFunctions  depend on their coherenceFunction.dependencies
    const noDepsSet = new Set(allKeys(childrenExternalDependencies, coherenceFunctions, fields, foreignKeys, links)) //S ← Set of all nodes with no incoming edge
        , requirementsMap = new Map()// [dependency] => {...dependants}
        , dependantsMap = new Map()
        ;

    // FIXME: putting coherenceFunctions first as they must execute as early as
    //        possible. The issue is, they can change the values of fields
    //        and therefore, before the fields are used in as dependencies
    //        anywhere else (e.g. in other fields) the coherence functions
    //        using them should already be done. however, it's not that
    //        straight forward and a second thought must be made.
    //        In a way, it is as if a field with a dependecy to another
    //        field is also dependant on the coherence function of that
    //        other field (dependent on the fact that the function has
    //        been executed)
    //        WILL have to explore deeper!
    for(const [name, entry] of allEntries(coherenceFunctions, fields, foreignKeys, links)) {
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
        else if(coherenceFunctions.has(name)){
            console.log(' CCCCOHERENCE_FUNCTIONS has NAMMME:', name, coherenceFunctions.has(name), coherenceFunctions);
            // this is a coherenceFunction
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
            dependantsMap.set(name, new Set(entry.dependencies));
            for(const dependeny of entry.dependencies)
                    _mapGetOrInit(requirementsMap, dependeny, ()=>[]).push(name);
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


const _IS_POTENTIAL_WRITE_PROXY = Symbol('_IS_POTENTIAL_WRITE_PROXY')
  , IMMUTABLE_WRITE_ERROR = Symbol('IMMUTABLE_WRITE_ERROR')
  , _DRAFT_ORIGIN = Symbol('_DRAFT_ORIGIN')
  , KEY_CONSTRAINT_ERROR = Symbol('KEY_CONSTRAINT_ERROR')
  ;

/**
 * Decide if proxification is required for item:
 * If it is a _BaseModel (_BaseContainerModel?) in immutable state,
 * it's required. If it is a draft or not a _BaseMode/_BaseContainerModel
 * it's likely not required;
 * Esecially if item is already a draft, we should not wrap it.
 */
function requiresPotentialWriteProxy(item) {
    if(!(item instanceof _BaseModel || item instanceof _BaseContainerModel))
        return false;
    // _BaseModel or _BaseContainerModel
    if(item.isDraft)
        return false;
    // immutable (not a draft)
    return true;
}

/**
 * usage: throw immutableWriteError(new Error(`My Message`));
 *
 * Reasoning: it's complicated to inherit from Error in JavaScript, as
 * a lot of tooling (browser developer console etc.) doesn't handle these
 * cases well. Hence it's better to use just the original Error class.
 *
 * To decide which kind of error is handled, `instanceof` is hence not
 * an option anymore. Looking after a string in the message can be an option
 * though, but this is a multi-use of the message an thus has the potential
 * of false positives.
 * Setting markers to the error instance is a good way, as it is very
 * explicit and does not re- or double-use existing mechanisms.
 *
 * Using a function to create the Error is not ideal, because it adds a
 * line to the traceback that is missleading and annoying.
 *
 * Adding the marker directly after creation of the error is good, but
 * potentially a lot of code duplication. It also requires to go from one
 *     line to trow an error to three lines:
 *     const error = new Error('My Message');
 *     error.marker = MyMarker
 *     throw error;
 *
 * Hence, these functions seem to be the best compromise:
 */

function _markError(symbol, error, data=null) {
    error[symbol] = data || true;
    return error;
}
function _isMarkedError(error) {
    return  error.hasOwn(IMMUTABLE_WRITE_ERROR);
}

const immutableWriteError = _markError.bind(null, IMMUTABLE_WRITE_ERROR)
  , keyConstraintError = _markError.bind(null, KEY_CONSTRAINT_ERROR)
  ;

export const isImmutableWriteError = _isMarkedError.bind(null, IMMUTABLE_WRITE_ERROR)
  , isKeyConstraintError = _isMarkedError.bind(null, KEY_CONSTRAINT_ERROR)
  ;

function potentialWriteMethodProxy (name, fn, getDraft, potentialWriteProxy) {
    if(fn[_IS_POTENTIAL_WRITE_PROXY]) {
        // I don't actually think this case happens, but if it does, it
        // will be interesting to observe the case!
        // A possible solution would ne to return the fn un-augmented:
        //    return fn;
        // But for now raise:
        throw new Error(`TOO MUCH PROXYIFICATIAN on a function that is already a proxy: "${name}".`);
    }

    const handler = {
        get: function(target, prop, receiver) {
            if (prop === _IS_POTENTIAL_WRITE_PROXY)
                return true;
            return Reflect.get(target, prop, receiver);
        }
      , apply: function(target, thisArgument, argumentsList) {
            // Could be a setter or getter method!
            // There won't be a confused setter that also acts as a getter
            // i.e. raises isImmutableWriteError and returns another immutable
            let result;
            try {
                result = Reflect.apply(target, thisArgument, argumentsList);
            }
            catch(error) {
                if(isImmutableWriteError(error)) {
                    // This is a setter called on an immmutable!
                    const draft = getDraft();
                    return Reflect.apply(target, draft, argumentsList);
                }
                else
                    throw error;
            }

            if(!requiresPotentialWriteProxy(result))
                return result;

            // CAUTION need key, but fishing for it is wonky.
            // Maybe this could be done better!
            const key = argumentsList[0];
            if(result !== thisArgument.get(key)) {
                throw new Error(`KEY FINDING ERROR don't know how to get key for ${result} `
                    +  `from parent ${thisArgument} method ${name} arguments: ${argumentsList.join(', ')}.`);
            }

            // `fn` could be e.g. the `get` function or similar and hence
            // return a _BaseModel child that requires the potentialWriteProxy.
            // It is very interesting how the write on setting to
            // draft will happen/be adressed. I.e. in the example using
            // the `set` method, however, that is arbitrary, and we need
            // a way to identify and call correctly the corresponding setter
            // function. This is injected and the original potentialWriteProxy
            // has to take care of this!
            return potentialWriteProxy(key);
        }
    };
    return new Proxy(fn, handler);
}


/**
 * `parent` is either a draft or a proxified immutable (_IS_POTENTIAL_WRITE_PROXY)
 *
 * one strong thought, a bit disturbing, is that if a value
 * at a key is replaced by a new value, that is not based on
 * the OLD_STATE value, the proxy we gave out is invalid, we
 * can't in good faith redirect to the new value, the relation
 * is basically broken.
 * one way would be to revoke the proxy!
 * If we gave out the draft elemnt directly, however, it would not
 * be revokeable! The reference would persist, even if its slot in its
 * parent would be replaced, so that's the behavior I'm looking for.
 * This means, we always return the draft, on an attempt to write, but,
 * if it's slot is already taken, by an elemnt that is not realted
 * i.e. it's old state is not the immutable we know.
 * SO: parent.getDraftFor(key) could return a draft that is not
 * related to the `that` value of this proxy, we should detect that
 * case, using draft[OLD_STATE] === that may even be too weak(!!!)
 * in some circumstances. commapre proxy identity? (possible?) maybe
 * with custom symmbols...?
 *
 * But if that is identical, it is hard to decide if the draft is
 * logically correct. We could mark if parent created the draft
 * itself AND for key i.e. in getDraftFor(key), instead of getting
 * draft via a set-like command.
 * Since we're dealing with immmutable objects, there could be multiple
 * items in parent at different keys with the same, immutable, identity.
 * However, when writing, each parent[key] must become a separate identity
 * so that we don't produce weird side effects.
 *
 * If parent is not a draft at this point we, definitely want to write,
 * so parent must become a draft, and it's parents, all the way up the chain!
 *
 * `parent.getDraftFor(key)` triggers the immutable write error and that
 * way escalates to the top:
 *
 * [root] parent 0 -> a draft
 * [A] -> itemA_Proxy parent - 1 -> a potential write immutable
 *     [B] -> itemB_Proxy parent - 2 -> a potential write immutable
 *         [C] -> itemC_Proxy parent - 3 -> a potential write immutable
 *             [D] -> itemD_Proxy a potential write immutable
 *
 * root.get('A').get('B').get('C').get('D').set('E', someBasicValue)
 *
 * itemD.set('E', someBasicValue)
 * triggers itemD_Proxy trap for set
 *     trap-> parent.getDraftFor('D') // where parent is itemC_Proxy
 *     triggers itemC_Proxy trap for getDraftFor('D')
 *         trap->parent.getDraftFor('C') // where parent is itemB_Proxy
 *         triggers itemB_Proxy trap for getDraftFor('C')
 *             trap->parent.getDraftFor('B') // where parent is itemA_Proxy
 *             triggers itemA_Proxy trap for getDraftFor('B')
 *                 trap->parent.getDraftFor('A') // where parent is root
 *                 root is a draft already, it just returns the draft for item 'A'
 *                 => itemA_Draft
 *             => itemB_Draft
 *         => itemC_Draft
 *     => itemD_Draft
 *     itemD_Draft.set('E', someBasicValue);
 */
function potentialWriteProxy(parent, key) {
    const immutable = parent.get(key);
    if(immutable[_IS_POTENTIAL_WRITE_PROXY])
        return immutable;

    // If proxyfication is not required, return the (immutable?) value.
    if(!requiresPotentialWriteProxy(immutable))
        return immutable;

    if(!parent.isDraft && !parent[_IS_POTENTIAL_WRITE_PROXY])
        throw new Error(`TYPE ERROR parent must be a draft or a potential write proxy of an immutable.`);

    // We must not return a proxy if the respective draft already exists
    if(parent.hasDraftFor(key))
        // This is  the cannonical way to create a draft as well, but since
        // we checked with hasDraftFor this won't have the side effect of
        // creating the draft.
        return parent.getDraftFor(key);

    const closureState = {
        draft: null
      , proxified: null
    };

    const getDraft = ()=>{
            let draft = closureState.draft !== null
                ? closureState.draft
                : parent.getDraftFor(key)
                ;
            // false returned by parent.getDraftFor, if draft is not genuine
            if(draft === false) {
                // This draft is 'disconnected' from parent, but on its own
                // a valid draft.
                draft = immutable.getDraft();
                // we must no always return this draft
                // from this proxy for key from parent!
                closureState.draft = draft;
            }
            return draft;
        }
      , getPotentialWriteProxy = (key)=>{
            // Must use proxified as parent here, in order to trigger
            // the isImmutableWriteError trap.
            // If proxified is not available in this closure, because
            // it's defined later (I doubt this is a problem) we can use:
            //      a state = {proxidfied: undefefined}
            // then:
            //      state.proxified = proxified
            // here:
            //      state.proxified
            return potentialWriteProxy(closureState.proxified, key);
        }
      ;

    const handler = {
        get: function(target, prop, receiver) {
            if (prop === _IS_POTENTIAL_WRITE_PROXY)
                return true;
            const result = Reflect.get(target, prop, receiver);
            if(typeof result === 'function') {
                // TODO: return proxy to trap function call
                //       and possibly catch the isImmutableWriteError
                return potentialWriteMethodProxy(prop, result, getDraft, getPotentialWriteProxy);
            }

            return getPotentialWriteProxy(prop);
        }
        // set case is just for completeness, I don't think it's yet actually
        // used, but it could.
      , set: function(target, propertyKey, value, receiver) {
            try {
                return Reflect.set(target, propertyKey, value, receiver);
            }
            catch(error) {
                if(isImmutableWriteError(error)) { // === trying to write to immutable
                    // this detects the write, everything else may as well
                    // be any read, even of un-important values or of unrelated
                    // calculations etc.
                    const draft = getDraft();
                    // Leaving out receiver, don't think it's relevant here,
                    // but I could be wrong!
                    return Reflect.set(draft, propertyKey, value/*, receiver*/);
                }
                // re-raise, not our business!
                throw error;
            }
        }
    };
    closureState.proxified = new Proxy(immutable, handler);
    return closureState.proxified;
}

// obj A and obj B must have the same entries with a strictly equal type.
function _dependenciesAreEqual(depObjA, depObjB) {
    const keysA = Object.keys(depObjA)
      , keysB = Object.keys(depObjB)
      ;
    if(keysA.length !== keysB.length)
        return false;
    for(const key of keysA) {
        if(!keysB.includes(key))
            return false;
        if(depObjA[key] !== depObjB[key])
            return false;
    }
    return true;
}

const OLD_STATE = Symbol('OLD_STATE')
 , _IS_DRAFT_MARKER = Symbol('_IS_DRAFT_MARKER')
 ;

export class _AbstractStructModel extends _BaseContainerModel {
    // Defined as a property in _AbstractStructModel.createClass
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
    //      an instance of ForeignKey from this.keys
    //      an instance of _BaseLink from this.links
    // in that order or throws a KEY ERROR
    static get(key) {
        // Own names, which override parent scope for children dependencies.
        for(const map of [this.fields, this.foreignKeys, this.links]){
            if(map.has(key))
                return map.get(key);
        }
        throw new Error(`KEY ERROR "${key}" not found in local namespace of ${this.constructor.name}.`);
    }

    static *entries() { // => [name, instance of _BaseModel, Key or _BaseLink]
        yield* allEntries(this.fields, this.foreignKeys, this.links);
    }

    static createClass(className, ...definitions) {
        console.log('\n' + new Array(30).fill('*+').join(''));
        console.log('START createClass', className, 'raw fields:',    );
        console.log(new Array(30).fill('*+').join('') + '\n');
        if(typeof className !== 'string')
            throw new Error(`className must be string but is ${typeof string}`);

        const fields = new FreezableMap()
          , foreignKeys = new FreezableMap()
          , links = new FreezableMap()
          , coherenceFunctions = new FreezableMap()
          , other = []
          // This is so far unused/not implemented, the aim is to have
          // a way to rename/map external dependency names to internal
          // names and still be able to use both. I.e. get "font" from
          // the parent and define "font" in here locally and for the
          // children. Then the external "font" could be called "externalFont"
          // locally (and for the children maybe), while the children
          // that demand a "font" get the one that is defined in here.
          , ownExternalDependencies = new FreezableSet()
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

            // from here on names must be string
            if(typeof name !== 'string')
                throw new Error(`VALUE ERROR ${className} definition name must be string but is ${typeof name}.`);

            if(value instanceof CoherenceFunction) {
                coherenceFunctions.set(name, value);
                 for(const dependency of value.dependencies)
                    _childrenAllDependencies.add(dependency);
            }
            else if(value instanceof ForeignKey) {
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
        //
        // added coherenceFunctions as they also can have external dependencies
        const staticHas = this.has.bind({fields, foreignKeys, links, coherenceFunctions})
            // remove locally defined names
          , childrenExternalDependencies = new FreezableSet(iterFilter(_childrenAllDependencies, dependency=>!staticHas(dependency)))
          , dependencies = new FreezableSet([ //jshint ignore: line
                      // these are allways external even if this class
                      // itself defines one of these names. This is so
                      // that this element can e.g. redefine what "font"
                      // (or maybe font-size) is for sub-classes.
                      ... ownExternalDependencies
                      // This is communicated upwards local overrides
                      // of all children dependencies are not contained.
                    , ... childrenExternalDependencies
            ])
          , initOrder = getTopologicallySortedOrder(coherenceFunctions, fields, foreignKeys, links, childrenExternalDependencies)// jshint ignore:line
          ;

        // The topological order, to determine child initialization order
        // can be determined in here also, already.


        // this way name will naturally become class.name.
        const result = {[className]: class extends this {
            // jshint ignore: start
            static fields = Object.freeze(fields);
            static foreignKeys = Object.freeze(foreignKeys);
            static links = Object.freeze(links);
            static coherenceFunctions= Object.freeze(coherenceFunctions);

            static ownDependencies = Object.freeze(ownExternalDependencies);
            static childrenExternalDependencies = Object.freeze(childrenExternalDependencies);
            // These are the names of the dependencies of the class.
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


    // FIXME: you don't call this directly for now use:
    // static createPrimalState or instacne.getDraft
    // However, without oldState this should return the same as
    // createPrimalState!
    // OR could it still be valid? We need to have this.value propagated
    // with itemsdState) => a draft
    // new Ctor(null, dependencies) => an immutable primal state
    // new Ctor() =, metamorphose can do so, but does not yet without OLD
    // state.
    //
    // new CTor(ol> TypeError
    // new CTor(oldState, dependencies) => TypeError
    //      Do this instead:
    //      immutable = new CTor(oldState).metamorphose(dependencies);
    // if not oldState this will be a primal state (immutable).
    constructor(oldState=null, dependencies=null) {
        if(oldState === null && dependencies === null)
            throw new Error(`TYPE ERROR either oldState or dependencies are required.`);
        if(oldState !== null && dependencies !== null)
            // The problem is that metmorphose may return OLD_STATE but
            // as a constructor that is invoked with the `new` keyword,
            // a new object must be returned.
            throw new Error(`TYPE ERROR can't constuct with both oldState and dependencies`);

        if(oldState && oldState.isDraft)
            throw new Error(`LIFECYCLE ERROR [${this.constructor.name}] `
                    +`oldState ${oldState} is draft but must be immutable.`);
        super(oldState);

        // this.value will only contain changed entries
        // if this.value.get(name) === this.[OLD_STATE].value.get(name)
        // it should not be set, to detect change, but that can only finally
        // be done in metamorphose, there a draft value can go back to its
        // OLD_STATE if it has not changed.
        Object.defineProperty(this, 'value', {value: new FreezableMap(), configurable: true});
        // TODO: Create an immutable primal state if OLD_STATE is null:
        if(dependencies !== null)
            // So, here's a problem,: this won't return a new object
            // if there was an OLD_STATE and there was no change
            // but since this is a constructor it MUST return a new
            // object (when called with `new`).
            return this.metamorphose(dependencies);
    }

    static createPrimalState(dependencies) {
        return new this.constructor(null, dependencies);
    }

    _getChangedDependencies() {
        if(this[OLD_STATE] === null)
            // If this.[OLD_STATE] === null we need to create a new primal
            // value, changedDependencyNames will be fully populated to do so.
            return new Set(this.constructor.dependencies);
        const changedDependencyNames = new Set();
        for(const key of this.constructor.dependencies.keys()) {
            if(this[OLD_STATE].dependencies[key] !== this.dependencies[key])
                changedDependencyNames.add(key);
        }
        return changedDependencyNames;
    }

    // FIXME: different name?
    //   getState => seems like returning a value
    //   freeze? => doesn't imply a return value
    //   toState? => better but doesn't
    //   metamorphose=> I like a lot, because this has two distinct life cycles
    //                  and this changes from the first to the latter.
    //                  However, it could still mean it returns an old object!
    //   In fact, I don't like so much, that the identity is not always changing
    //   but maybe that can be clearer when the function is external or a static?
    //
    // This can be called without depenedencies or only with changed
    // dependencies, initially, a lack of dependencies is detected.
    // The case without dependencies is given when commiting a change within
    // a workflow, to trigger the side effects.
    metamorphose(dependencies={}) {
        if(!this.isDraft)
            throw new Error(`LIFECYCLE ERROR ${this} must be in draft mode to metamorphose.`);
        //CAUTION: `this` is the object not the class.
        //
        // All the following runs, to change deep down a single axis location value.
        //        It is very important to make this as lightweight as possible.
        //        At the same time, it is important that the change bubbles
        //        through the whole structure.

        // Allow case without or with incomplete dependencies argument,
        // will re-use this[OLD_STATE].dependencies.
        // Fails in the next step if dependencies are missing.
        const dependenciesData = Object.fromEntries([
                // preload OLD STATE
                ...Object.entries((this[OLD_STATE] && this[OLD_STATE].dependencies) || {})
                // add dependencies argument
                , ...Object.entries(dependencies || {})
            // Ensure there are not more dependencies in the object than
            // we know. , it's not an error as the caller could reuse a
            // dependencies object this way, but we don't want to persist
            // dependencies we don't know or need.
            ].filter(([key])=>this.constructor.dependencies.has(key))
        );

        {
            // Check if all dependencies are provided.
            const missing = new Set();
            // It would possible to rewrite external dependency names
            // to internal ones (aliases) here in an attempt to make
            // a child fit into a parent it wasn't exactly designed for.
            // Putting this comment here, to not forget, if this.constructor.dependencies
            // were a Map (not a set) the rewriting could also be done
            // from outside by the initializing parent.
            // Putting this thought here to keep it around.
            for(const key of this.constructor.dependencies) {
                if(!Object.hasOwn(dependenciesData, key))
                    missing.add(key);
            }
            if(missing.size !== 0)
                throw new Error(`VALUE ERROR ${this} missing dependencies: ${[...missing].join(', ')}`);
            // Could add type checks for dependencies as well.
        }

        // More possible checks on dependencies:
        //  * Ensure all dependencies are immutable (and of a corrsponding type).

        // Required for comparison between OLD_STATE and this.
        // These are the names and values of the dependencies of the class.
        // We need to compare these to see if a change of the object is required.
        Object.defineProperty(this, 'dependencies', {
            value: Object.freeze(dependenciesData)
          , writable: false
          , configurable: false
        });

        const changedDependencyNames = this._getChangedDependencies();

        // Here's a shortcut:
        if(this[OLD_STATE] !== null
                && changedDependencyNames.size === 0
                   // no new drafts since going into draft mode, i.e.
                   // no potential changes that need to be checked.
                && this.value.size === 0)
            return this[OLD_STATE];

        const localScope = new Map()
                // localScope should already own external dependencies!!!
          , collectDependencies = dependencies=>Object.fromEntries(
                iterMap(dependencies, (key)=>[key, localScope.get(key)]))
          , locked = new Set()
          , lockItem = (name)=>{
                if(locked.has(name))
                    // Been here done that.
                    return;
                locked.add(name);
                if(!this.has(name))
                    // Locking not requrired from this, this is not the owner.
                    return;

                // FIXME: this requires work for primal value construction!
                const item = this.value.has(name)
                    ? this.value.get(name)
                    : this[OLD_STATE].get(name)
                    ;

                // `item` is a draft.
                // `descriptor` is a Model or an instance of ForeignKey.
                // ValueLink and Constraint are skipped with `this.has(name)`
                // and require no locking themselves.
                const descriptor = this.constructor.get(name);
                // Recursion! Thanks to initOrder this will resolve without
                // any infinite loops or missing dependencies.

                // For ForeignKey locking is already done in initOrder
                lockDependencies(descriptor.dependencies);
                let immutable;
                if(descriptor instanceof ForeignKey) {
                    // We must execute the key constraint here,
                    // coherence functions may have invalidated
                    // the constraint and in that case we will fail.
                    const key = descriptor
                      , target = localScope.get(key.targetName)
                        // May fail with an error!
                      , targetKey = key.constraint(target, item.value)
                      ;
                    let draft = null;
                    if(targetKey !== item.value) {
                        // May have to turn into a draft
                        draft = item.isDraft
                                    ? item
                                    : item.getDraft()
                                    ;
                        draft.value = targetKey;
                    }
                    immutable = draft !== null
                        ? draft.metamorphose()
                        : (item.isDraft
                                ? draft.metamorphose()
                                : item)
                        ;
                }
                else { // is field/value
                    const childDependencies = collectDependencies(descriptor.dependencies);
                    immutable = item.isDraft
                        ? item.metamorphose(childDependencies)
                        // It's immutable. If we would have locked item already
                        // we wouldn't be here. Drafts are always from this.value
                        // but immutables can potentially come from both sources.
                        // An immutable can be set via the set method but is also
                        // set when creating a primal state, in the initOrder loop.
                        // We got to make sure the dependencies are the same
                        // or metamorphose the item to the next version.
                        : (!_dependenciesAreEqual(childDependencies, item.dependcies)
                                    ? item.getDraft().metamorphose(childDependencies)
                                    : item
                           )
                        ;
                }
                if(!this[OLD_STATE] || this[OLD_STATE].get(name) !== immutable)
                    changedDependencyNames.add(name);
                localScope.set(name, immutable);
            }
          , lockDependencies = (dependencies)=>{
                for(const name of dependencies)
                    lockItem(name);
            }
          ;
        console.log('this.initOrder', this.constructor.initOrder); // this is the mantra

        // NOTE: using this.get in this loop as it also returns
        // potentialWriteProxies as an optimization, the items
        // are made immutable eventually in the lockItem function.
        for(const name of this.constructor.initOrder) {
            // By the time each element in initOrder is at the turn,
            // its dependencies are already available in localScope
            // and they can be used.
            if(this.constructor.childrenExternalDependencies.has(name)) {
                if(!(name in this.dependencies))
                    // should be covered above when checking dependenciesData
                    throw new Error(`DEPENDENCY ERROR ${this.constructor.name} requires "${name}" in dependenciesData.`);
                localScope.set(name, this.dependencies[name]);
            }
            else if(this.constructor.fields.has(name)) {
                // get return value can be a draft or a proxified immutable.
                if(this[OLD_STATE] === null && !this.value.has(name)) {
                    // this is a primal state
                    const Model = this.constructor.fields.get(name);
                    // We want dependencies to be locked later in the
                    // process, so the coherence functions can do their
                    // thing and don't fail when writing because they get
                    // unexpected immutable dependencies.
                    const childDependencies = {};
                    // We know all dependencies already exist in some
                    // way, this seems pretty random, to just get the
                    // existing, un-altered (by coherence functions) initial
                    // values, initially these values are not "coherent"
                    // within this type, but should be coherent according
                    // to their own type. They merely are the correct
                    // types and they are made available. The confusion
                    // below maybe must get lifted and defined better,
                    // as following decision in the local coherence functions
                    // may get obscured by this behavior.
                    //
                    // I'm thinking at thye moment, coherence functions
                    // probably must be made aware of the context in which
                    // they are called, and as such should know whether
                    //  it's an "update" or a "primal" invocation,
                    // as well as they should know which dependencies
                    // have changed, i.e. when the currentFont has changed,
                    // we may have to reset a keyframes list to an inial
                    // state, or, at least a single container of axis locations
                    // should be reset.
                    // Good thing is, this function can figure out all that
                    //    this[OLD_STATE] === null ? 'primal' : 'update'
                    //
                    for(const depencyName of Model.dependencies) {
                        let dependency;
                        if(this.value.has(depencyName)) {
                            dependency = this.value.get(depencyName);
                            // If we have keys or links in these dependencies,
                            // by initOrder their target is already immutbale
                            // and for links also the key. so this can lead
                            // to confusing results... We'll see, but maybe
                            // a clear default would be better!
                            if(dependency.isDraft)
                                // Use the primal value, as that is only
                                // the base.
                                dependency = dependency[OLD_STATE];
                        }
                        else
                            // External dependency or link, both always
                            // immutable. External dependdencies don't
                            // change anyymore, however, link values
                            // from localScope could be misleading/off/wrongish,
                            // as they may not fit to the initial keys/containers.
                            //
                            // It may be better to resolve those links
                            // based on the values within the childDependencies
                            // (if there are any).
                            dependency = localScope.get(name);
                        childDependencies[depencyName] = dependency;
                    }
                    const immutable = this.constructor.fields.get(name).createPrimalState(childDependencies);
                    // this way the get method can still give out a potential
                    // write proxy to the coherenceFunction, but we have an
                    // inherent coherent value to start with.
                    this.value.set(name, immutable);
                }
                localScope.set(name, this.get(name));
            }
            else if(this.coherenceFunctions.has(name)) {
                const coherenceFunction = this.coherenceFunctions.get(name)
                   // This can change the values of fields, if fields are used
                   // as dependencies, this must execute before.
                   // We also accept frozen childDependencies, but when attempting
                   // to write they raise an error/
                   // This way, it is ensured that we didn't give away
                   // dependencies that become outdated.
                  , childDependencies = collectDependencies(coherenceFunction.dependencies)
                  ;
                // Return value is optional I would say, but it could
                // be useful, to propagate calculations. The idea of
                // the coherenceFunction is however that it can change
                // the values of dependencies directly...
                // FIXME: external dependencies must not be changeable!
                //     that's important, though, not sure how to ensure that!
                //     It's important because that would inverse data flow
                //     direction (from child to parent) and we don't
                //     want this, to keep it simple and in hierarchical order!
                //     If it is possible and desireable we may overthink this
                //     but too many side-effects seem to occur.
                //     Maybe, besides freezing, we could also "lock"
                //     elements (temporarily).
                // Similar to this, instanciation of a field could be
                // augmented by a method attached directly, but, essentially
                // this can do the same job.
                //
                // FIXME not a fan of using result like this! It makes stuff
                // complicated! (does iit though?)
                // However, the coherenceFunction is part of the init order, and
                // as such can technically set a name, there's no clash.
                // This is also not yet implemented in the factory method,
                // so there may be no way to get these dependencies accepted!
                localScope.set(name, coherenceFunction.fn(childDependencies));
            }
            else if(this.constructor.foreignKeys.has(name)) {
                // Must lock the target!
                // Key must not change anymore after being used as an dependency!
                // This means, it would still be possible to change this
                // in a coherence function, but when it is a direct dependency
                // e.g. in a field OR in a link (below), this must be locked
                // and loaded.
                const key = this.constructor.foreignKeys.get(name);
                lockDependencies(key.dependencies); // is { key.targetName }
                if(this[OLD_STATE] === null && !this.value.has(name)) {
                    // this is a primal state
                    // FIXME: without running the constraint, there
                    // won't be a value for this initial key! (immutable.value === undefined)
                    // A coherence function specialized for the primal
                    // state case may have to bootstrap this.
                    const immutable = KeyValueModel.createPrimalState();
                    // This way the get method can give out potential write
                    // proxies and the coherence functions can change
                    // this, even in primal state creation.
                    this.value.set(name, immutable);
                }
                const keyValue = this.get(name); // draft or proxified immutable
                localScope.set(name, keyValue);
            }
            else if(this.constructor.links.has(name)) {
                // similar as foreinKey, but since this doesn't go to
                // Think about making sure to have this frozen (i.e. target
                // be frozen) before sending it as a dependency.

                const link = this.constructor.links.get(name);
                lockDependencies(link.dependencies); // is { link.keyName }

                // resolving the link:
                //
                const key = this.constructor.foreignKeys.get(link.keyName)
                  , targetKey = localScope.get(link.keyName).value
                  , target = localScope.get(key.targetName)
                  ;
                let value;

                if(targetKey === key.NULL) {
                    if(!key.notNull)
                        // just reuse ForeignKey.NULL
                        value = key.NULL;
                    else
                        // We already executed the key constraints, which
                        // should have caught this, but maybe a coherence
                        // function changed it.
                        // TODO: the key constraint function should execute right
                        //       before the key is locked again, to ensure this
                        //       doesn't happen.
                        throw new Error(`INTERNAL LOGIC ERROR can't resolve link ${name}: `
                            + `key-value for key ${link.keyName} is null `
                            + `but null is not allowed.`);
                }
                else if(target.has(targetKey))
                    value = target.get(targetKey);
                else
                    // This should never happen, as we ran key.constraint before.
                    throw new Error(`KEY ERROR ${this.name} key ${link.keyName}`);
                localScope.set(name, value);
            }
        }

        // Are there any not locked fields/keys now?
        this.keys().map(lockItem);

        // compare
        if(this[OLD_STATE] && changedDependencyNames.size === 0)
            // Has NOT changed!
            return this[OLD_STATE];

        // make sure all items are in this.value
        for(const name of this.keys)
            this.value.set(name, localScope.get(name));


        // Has changed!
        {
            // validate types in this.value
            const types = [];
            for(const [name, Type] of this.constructor.fields.entries()) {
                // no inheritance allowed so far.
                const value = this.value.get(name);
                if(value.constructor !== Type)
                    types.push(`"${name}" ${value} is not a ${Type.name} (but a ${value.constructor.name}).`);
            }
            if(types.length)
                throw new Error(`TYPE ERROR can't metamorphose ${this}`
                              + `wrong types: ${types.join(', ')}.`);
        }
        {
            // validate keys
            for(const name of this.constructor.foreignKeys.keys()) {
                const value = this.value.get(name);
                if(value.constructor !== KeyValueModel)
                    throw new Error(`TYPE ERROR can't metamorphose ${this} key `
                        + `"${name}" ${value} is not a KeyValueModel (but a ${value.constructor.name}).`);
                // The actual target key is validated by the key constraints in locking.
            }
        }
        // Lock and freeze!
        //
        // Would be nice to have this[OLD_STATE] like a history, but it also
        // prevents this[OLD_STATE] from being garbage collected!
        // Keeping it only in the top most element could be an option,
        // but collecting states in an external list may be even better.
        delete this[OLD_STATE];
        Object.defineProperty(this, 'value', {
            value: Object.freeze(this.value)
          , writable: false
          , configurable: false
        });
        Object.defineProperty(this, _IS_DRAFT_MARKER, {value: false, configurable: false});
        delete this[_DRAFT_ORIGIN];
        Object.freeze(this);
    }

    *[Symbol.iterator]() {
        // maybe use flags to decide what not to yield
        // users (data readers) may require
        // yield keys, links?
        for(const key of this.keys())
            yield [key, this.get(key)];
    }

    // TODO: something like this will probably be required.
    //toObject() {
    //    const result = {};
    //    for(let k of allKeys(this.fields, this.foreignKeys))
    //        result[k] = this.value.get(k).toObject();
    //    return result;
    //}

    size() {
        //  FIXME: Keys and original values are contained. What about Links?
        // I have a hunch that even links, should be contained, if we want
        // to be able to further reference them.

        return this.constructor.fields.size + this.constructor.foreignKeys.size;
    }
    has(key) {
        //  FIXME: Keys and original values are contained. What about Links?
        // I have a hunch that even links, should be contained, if we want
        // to be able to further reference them.

        // AS for now, only things that are stored originally in value
        // should be contained here! Thatt is fields and keys, not links.
        // links are by definition stored somewhere else, I'm not sure how
        // to handle these, may be proxied from here or so.
        return this.constructor.fields.has(key) || this.constructor.foreignKeys.has(key);
    }

    keys() {
        //  FIXME: Keys and original values are contained. What about Links?
        // I have a hunch that even links, should be contained, if we want
        // to be able to further reference them.
        return [... this.constructor.fields.keys(), ...this.constructor.foreignKeys.keys()];
    }

    /**
     * hasDraftFor and getDraftFor are likely only a required interfaces
     * for _BaseContainerModel.
     */
    hasDraftFor(key) {
        if(!this.isDraft)
            return false;
        // this implies that if this is a draft all items in
        // this.value must be drafts as well! But do we know?
        // It's not important: if the value was created externally
        // or set as an immutable from external, this won't return the
        // value anyways!

        if(!this.value.has(key))
            return false;

        // MAY NOT BE A DRAFT AT THIS MOMENT!
        const item = this.value.get(key);
        if(!item.isDraft)
            return false;

        // item is a draft created here?
        if(item[_DRAFT_ORIGIN]
                && item[_DRAFT_ORIGIN][0] === this
                && item[_DRAFT_ORIGIN][1] === key)
            return true;

        // draft was not created here for key
        return false;
    }

    /**
     * Raises KeyError if key is not available.
     * Raises ImmutableWriteError if this is not a draft.
     * Returns False, if draft is not natively created by this function
     * i.e. set from the outside.
     * Returns a draft for key otherwise.
     * this is likely only for _BaseContainerModel
     */
    getDraftFor(key) {
        // TODO: check if key exists! Else KEY ERROR ${key}
        if(!this.isDraft)
            throw immutableWriteError(new Error(`IMMUTABLE WRITE ATTEMPT `
                +`${this}.getDraftFor(${key}) is immutable, not a draft.`));

        const item = this.value.has(key)
                        ? this.value.get(key)
                        : this[OLD_STATE].get(key)
                        ;

        // MAY NOT BE A DRAFT AT THIS MOMENT! => via set(key, immutable)...
        // in that case were going to replace the item in this.value with
        // its draft.
        if(item.isDraft) {
            if(item[_DRAFT_ORIGIN] && item[_DRAFT_ORIGIN][0] === this
                    && item[_DRAFT_ORIGIN][1] === key)
                return item;
            // has a value, but it was not created by this method/object
            // and instead set from external using the set method.
            return false;
        }

        const draft = item.getDraft();

        // Mark this draft so we know this element created
        // that draft for key, we need this, to decide if we are
        // going to use the draft element in the proxies OR if
        // we have to create a separate draft in the proxy, that is not
        // connected to this item by being located in this.value.
        // That case happpens, when item.set(key, anotherDraft) is called.
        //
        // This can still be tricked intentionally, but it should be good
        // enough for non-vandalism cases.
        draft[_DRAFT_ORIGIN] = [this, key]; // => TODO: remove in metamorphose
        this.value.set(key, draft);
        return draft;
    }

    _get(key) {
        if(!this.has(key))
            throw new Error(`KEY ERROR "${key}" not found in ${this}.`);

        const item = this.value.has(key)
            ? this.value.get(key)
            : (this[OLD_STATE] !== null  ? this[OLD_STATE].get(key) : null)
            ;

        if(item === null)
            // This would just be weird!
            // In primal state, this.value is fully populated with primal
            // state elements and after this[OLD_STATE] is present.
            //
            // FIXME: However, it is still possible to run the constructor
            // directly, without an OLD_STATE and without metamorphose
            // after. That should be rooted out.
            throw new Error(`INTERNAL LOGIC ERROR "${key}" should exist, but it doesn't`);

        if(!this.isDraft)
            return item;

        // The function understands if item is already a draft
        // and does not proxify item in that case.
        return potentialWriteProxy(this, item);
    }

    get(key, defaultReturn=_NOTDEF) {
        if(this.has(key))
            return this._get(key);
        if(defaultReturn !== _NOTDEF)
            return defaultReturn;
        throw new Error(`KEY ERROR "${key}" not found in ${this}.`);
    }

    // TODO: how does this work? Can't initialize at least complex stuff,
    // that has dependencies from outside!
    set(key, entry) {
        if(!this.isDraft)
            // Writing in all model classes:
            // raise an error when not in draft mode!
            // so the caller can change this into a draft
            // this can be achieved using js proxies!
            throw immutableWriteError(new Error(`NOT DRAFT ERROR: ${this} can't call set when not in draft phase.`));

        // Entry can be draft or an immutable, get and the potentialWriteProxy
        // will handle both cases.

        // The constructor will check types etc. but this still raises a
        // KEY ERROR if key can't be set, to alert early when this is attempted.
        if(!this.has(key))
            throw new Error(`KEY ERROR trying to set unkown "${key}" in ${this}.`);

        this.value.set(key, entry);
    }
}

// list/array type
// items are accessed by index
// has a size/length
// I'd prefer to have a single type for all items, that way,
// we can't have undefined entries, however, a type could be
// of the form TypeOrEmpty...
// MultipleTargets ...!
export class _AbstractListModel extends _BaseContainerModel {
    static get Model() {
        // NOT IMPLEMENTED Model is not defined in _AbstractListModel
        throw new Error(`NOT IMPLEMENTED Model is not defined in ${this.name}`);
    }

    static get dependencies() {
        return this.Model.dependencies;
    }

    static createClass(className, Model /* a _BaseModel */) {
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

    // TODO: in draft mode return drafts!
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

    // FIXME: thinking, if this has a child-type with dependencies,
    //        it should be possible to create a new 'blank'/default entry
    //        at that index as a draft and manipulate it, there's not really
    //        a use for a set function then.
    // Also, if a dependency changes, it will be interesting how to handle
    // that change in a list etc. will we try to keep state or basically reset
    // everything? I guess this will be an afterthought, after establishing a
    // general working model for dependency management. And maybe configurable
    // per case.
    // TODO: remove `set`
    //       add interface to createAt(key) => primal->draft
    //       only in draft mode
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

    // TODO: it seems like these nice array methods wouldn't work that way
    //       at least for complex values! either for complex children (with
    //       dependencies), disable, or find an elegeent solution to work
    //       around...
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

    static createClass(className, Model /* a _BaseModel */) {
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

    static createClass(className, Model /* a _BaseModel */) {
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
        console.log(`${this}.constructor with entries:`, entries, ''+entries);
        const _values = []
          , _keys = new FreezableMap()
          ;

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

    *[Symbol.iterator]() {
        for(const [key, index] of this._keys)
            yield [key, this._values[index]];
    }

    *entries() {
        yield* this;
    }

    toObject() { // => JSON compatible ...
        this.entries().map(([k, v])=>[k, v.toObject()]);
    }

    get size() {
        return this._values.length;
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
        return this.splice(this.size, 0, ...entries);
    }
    // add to front
    unshift(...entries) {
        return this.splice(0, 0, ...entries);
    }
    // remove from end
    pop(deleteCount=1) {
        return this.splice(this.size-deleteCount, deleteCount);
    }
    // remove from front
    shift(deleteCount=1) {
        return this.splice(0, deleteCount);
    }

}

/**
 * Rather a placeholder, to have quick type classes.
 * This is also a leaf in the model tree, the end of the path,
 * not another container type. Like a file, unlike a folder.
 *
 * Caution: this is used as a base for KeyValueModel and there are expectations
 * that must not be broken, regarding the lifecycleAPI.
 *
 * This or a very similar version of this with extension hooks for coherence
 * and validation could nicely be used to define types more narrowly. However
 * in the case of KeyValueModel most of that is done externally and for many
 * types the external validation will be most important.
 */
export  class _AbstractGenericModel extends _BaseModel {
    static createClass(className) {
            // this way name will naturally become class.name.
        const result = {[className]: class extends this {}};
        Object.freeze(result[className]);
        return result[className];
    }

    constructor(oldState=null) {
        super(oldState);

        // A primal state will have a value of undefined.
        Object.defineProperty(this, 'value', {
            value: this[OLD_STATE] === null
                ? undefined
                : this[OLD_STATE].value
          , configurable: true
          , writable: true
        });

        if(this[OLD_STATE] === null)// a primal state
            return this.metamorphose();
    }

    static createPrimalState() {
        return new this.constructor(null);
    }

    metamorphose() {
        // compare
        if(this[OLD_STATE] && this[OLD_STATE].value === this.value)
            // Has NOT changed!
            return this[OLD_STATE];

        // Has changed!
        delete this[OLD_STATE];
        Object.defineProperty(this, 'value', {
            // Not freezing/changing this.value as it is considered "outside"
            // of the metamodel realm i.e. it's not a _BaseModel or part of
            // it, it can be any javascript value. Freezing it would have
            // undesirable side effects, e.g. breaking other libraries, and
            // almost no meaning for object immutability.
            value: this.value
          , writable: false
          , configurable: false
        });
        Object.defineProperty(this, _IS_DRAFT_MARKER, {value: false, configurable: false});
        // Is this applied by the parent? I expect yes.
        delete this[_DRAFT_ORIGIN];
        Object.freeze(this);
    }
}

// some basics
export const AnyModel = _AbstractGenericModel.createClass('AnyModel')
  , IntegerModel = _AbstractGenericModel.createClass('IntegerModel')
    // Beautiful
  , NumberModel =  _AbstractGenericModel.createClass('NumberModel')
  , BooleanModel = _AbstractGenericModel.createClass('BooleanModel')
  , StringModel = _AbstractGenericModel.createClass('StringModel')
    // value will be a valid key or ForeignKey.NULL depending on the
    // key constraints as well.
  , KeyValueModel = _AbstractGenericModel.createClass('KeyValueModel')
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
    console.log(`getEntry ${path} in ${state}`);
    const pathInstance = (typeof path === 'string' ? Path.fromString(path) : path);
    try {
        return [...pathInstance].reduce((accum, part)=>{
            console.log(`from ${accum} get ${part}`);
            if(!(accum instanceof _BaseContainerModel))
                throw new Error(`CONTAINER ENTRY ERROR no container at ${part} in ${accum}.`);
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
        console.log(`setEntry [${i}] ${entriesAlongPath[i]} key ${key} ${updated}`);
        updated = entriesAlongPath[i].set(key, updated);
    }
    return updated;
}

// FIXME: would be cool to be able to get the Model of
// Links.
export function getModel(RootModel, path) {
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
    }, RootModel);
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
    console.log(`changeEntry ${state} path ${path}`, method, ...args);
    const pathInstance = (typeof path === 'string' ? Path.fromString(path) : path)
      , entry = getEntry(state, pathInstance)
      ;
    // should probably store ForeignKeys still as BaseModel!
    console.log(`... changeEntry ${entry} method ${method}:`, ...args);
    // how to change a none-container entry?
    // it basically has no methods to change!
    const newEntry = entry[method](...args)
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
// Inherent coherenceFunctions!!!
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

    if(oldState instanceof _AbstractGenericModel)
        // here not the same instance counts as change.
        return;

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
        // coherenceFunctions or by updating the compare method.


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

