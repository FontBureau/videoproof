/* jshint esversion: 11, browser: true, unused:true, undef:true, laxcomma: true, laxbreak: true, devel: true */

/**
 * Building blocks and helper functions to define a Model.
 */

const _NOTDEF = Symbol('_NOTDEF');

export class CoherenceFunction {
    constructor(dependencies, fn/*(valueMap)*/) {
        Object.defineProperties(this, {
            dependencies: {value: Object.freeze(new FreezableSet(dependencies))}
          , fn: {value: fn}
          , name: {value: fn.name || '(anonymous)'}
        });
        Object.freeze(this);
    }

    static create(...args) {
        const instance = new this(...args);
        return [instance.name, instance];
    }

    // This way it goes nicely into the struct definition without
    // having to repeat the name!
    get nameItem() {
        return  [this.name, this];
    }

    toString(){
        return `[CoherenceFunction ${this.name}]`;
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
export const EMPTY_SET = Object.freeze(new FreezableSet());

export class _BaseModel {
    /**
     * Lifecycle Protocol API:
     *
     * constructor(oldState=null, ...) => new Model(currentInstance)=> a draft
     * dependencies => a set of names or an empty set
     * static createPrimalState(/*dependencies* /) => an immutable with "primal value" implementation specific
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

    static createPrimalState(/*dependencies*/) {
        throw new Error(`NOT IMPLEMENTED createPrimalState in ${this}.`);
    }

    getDraft() {
        if(this.isDraft)
            throw new Error(`LIFECYCLE ERROR ${this} must be in immutable mode to get a draft for it.`);
        return new this.constructor(this);
    }

    static createPrimalDraft(dependencies) {
        return this.createPrimalState(dependencies).getDraft();
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

    hasOwn(key) {
        throw new Error(`NOT IMPLEMENTED hasOwn(key) in ${this} for "${key}".`);
    }
    ownKeys(){
        throw new Error(`NOT IMPLEMENTED ownKeys() in ${this}.`);
    }
    // override if ownership and available keys differ
    has(key) {
        return this.hasOwn(key);
    }
    // override if ownership and available keys differ
    keys() {
        return this.ownKeys();
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

export class InternalizedDependency {
    constructor(dependencyName, Model) {
        Object.defineProperty(this, 'Model', {
            value: Model
        });

        Object.defineProperty(this, 'dependencyName', {
            value: dependencyName
        });

        Object.defineProperty(this, 'dependencies', {
            value: Object.freeze(new FreezableSet([dependencyName]))
        });
        Object.freeze(this);
    }
    toString(){
        return `[${this.constructor.name} for ${Array.from(this.dependencies)}]`;
    }
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

    // console.log('_topologicalSortKahn noDepsSet', noDepsSet);
    // console.log('_topologicalSortKahn requirementsMap', requirementsMap);
    // console.log('_topologicalSortKahn dependantsMap', dependantsMap);

    // Kahn's algorithm, took it from https://en.wikipedia.org/wiki/Topological_sorting
    while(noDepsSet.size) { // while S is not empty do
        const name  = setPop(noDepsSet);// remove a node n from S
        topoList.push(name);// add n to L
        // console.log(`_topologicalSortKahn get name "${name}"`, 'requirementsMap.get(name)', requirementsMap.get(name));
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

function getTopologicallySortedInitOrder(coherenceFunctions, fields, foreignKeys
            , links, internalizedDependencies, externalDependencies) {

    // links depend on their link.keyName
    // keys depend on their key.targetName
    // fields depend on their field.dependencies
    // coherenceFunctions depend on their coherenceFunction.dependencies
    // internalizedDependencies depend on their internalizedDependency/dependencyName
    const noDepsSet = new Set(allKeys(externalDependencies, coherenceFunctions
                , fields, foreignKeys, links, internalizedDependencies)
          ) //S ← Set of all nodes with no incoming edge
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
    for(const [name, entry] of allEntries(coherenceFunctions, fields
                        , foreignKeys, links, internalizedDependencies)) {
        if(entry.dependencies.size === 0)
            continue;
        if(internalizedDependencies.has(name))
            // These are not required for initOrder and in fact
            // if name === internalizedDependencies.dependencyName
            // these create circular dependencies
            // However, we need the name as possible dependenciy for
            // the other items.
            continue;
        noDepsSet.delete(name);
        dependantsMap.set(name, new Set(entry.dependencies));
        for(const dependeny of entry.dependencies)
            _mapGetOrInit(requirementsMap, dependeny, ()=>[]).push(name);
    }
    return _topologicalSortKahn(noDepsSet, requirementsMap, dependantsMap);
}


const IMMUTABLE_WRITE_ERROR = Symbol('IMMUTABLE_WRITE_ERROR')
  // FIXME: rename to  _HAS_DRAFT_FOR_POTENTIAL_WRITE_PROXY, ...?
  , _LOCAL_PROXIES = Symbol('_LOCAL_PROXIES')
  , _OLD_TO_NEW_SLOT = Symbol('_OLD_TO_NEW_SLOT')
  , KEY_CONSTRAINT_ERROR = Symbol('KEY_CONSTRAINT_ERROR')
  , _HAS_DRAFT_FOR_PROXY = Symbol('_HAS_DRAFT_FOR_PROXY')
  , _HAS_DRAFT_FOR_OLD_STATE_KEY = Symbol('_HAS_DRAFT_FOR_OLD_STATE_KEY')
  , _GET_DRAFT_FOR_PROXY = Symbol('_GET_DRAFT_FOR_PROXY')
  , _GET_DRAFT_FOR_OLD_STATE_KEY = Symbol('_GET_DRAFT_FOR_OLD_STATE_KEY')

  ;

/**
 * Decide if proxification is required for item:
 * If it is a _BaseModel (_BaseContainerModel?) in immutable state,
 * it's required. If it is a draft or not a _BaseMode/_BaseContainerModel
 * it's likely not required;
 * Esecially if item is already a draft, we should not wrap it.
 */
function _requiresPotentialWriteProxy(item) {
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
function _isMarkedError(symbol, error) {
    return  Object.hasOwn(error, symbol);
}

const immutableWriteError = _markError.bind(null, IMMUTABLE_WRITE_ERROR)
  , keyConstraintError = _markError.bind(null, KEY_CONSTRAINT_ERROR)
  ;

export const isImmutableWriteError = _isMarkedError.bind(null, IMMUTABLE_WRITE_ERROR)
  , isKeyConstraintError = _isMarkedError.bind(null, KEY_CONSTRAINT_ERROR)
  ;

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
 * if it's slot is already taken, by an elemnt that is not related
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


class _PotentialWriteProxy {
    // jshint ignore: start
    static IS_PROXY = Symbol('_POTENTIAL_WRITE_PROXY_IS_PROXY');
    static GET_IMMUTABLE = Symbol('_POTENTIAL_WRITE_PROXY_GET_IMMUTABLE');
    static GET_DRAFT = Symbol('_POTENTIAL_WRITE_PROXY_GET_DRAFT');
    static GET = Symbol('_POTENTIAL_WRITE_PROXY_GET');
    // jshint ignore: end

    static isProxy(maybeProxy) {
        return maybeProxy && maybeProxy[this.IS_PROXY];
    }
    static create(parent, immutable, key=null) {
        // FIXME ?? could return immutable[_POTENTIAL_WRITE_PROXY_GET_IMMUTABLE]
        // WHY WOULD THIS HAPPEN?
        if(_PotentialWriteProxy.isProxy(immutable))
            return immutable;

        // If proxyfication is not required, return the (immutable?) value.
        if(!_requiresPotentialWriteProxy(immutable))
            return immutable;

        if(_PotentialWriteProxy.isProxy(parent)) {
            if(immutable !== parent[_PotentialWriteProxy.GET_IMMUTABLE].get(key))
                throw new Error(`ASSERTION ERROR: immutable must be at ${key} of parent immutable!`);

            if(!parent.hasOwn(key))
                // parent won't create a draft for this
                return immutable;

            // We must not return a proxy if the respective draft already exists
            if(parent[_HAS_DRAFT_FOR_OLD_STATE_KEY](key))
                // This is the reason why this check cant be in the _PotentialWriteProxy constructor
                return parent[_GET_DRAFT_FOR_OLD_STATE_KEY](key);

            // Parent is not a draft, hence it's a proxy of an immutable
            // and thus we got to go via key!
            return new _PotentialWriteProxy(parent, immutable, key);
        }
        // can call without the parent.hasDraftFor check
        // as it must get called from within parent in this case!
        if(parent.isDraft)
            return new _PotentialWriteProxy(parent, immutable);

        throw new Error(`TYPE ERROR parent must be a draft or a potential write proxy of an immutable.`);
    }

    createMethodProxy (fnName, fn) {
        if(_PotentialWriteProxy.isProxy(fn)) {
            // I don't actually think this case happens, but if it does, it
            // will be interesting to observe the case!
            // A possible solution would ne to return the fn un-augmented:
            //    return fn;
            // But for now raise:
            throw new Error(`TOO MUCH PROXYIFICATIAN on a function that is already a proxy: "${fnName}".`);
        }

        const getterAPIs = new Set(['get' /* possibly 'slice', but requires attention below? */]);
        const handler = {
            get: function(targetFn, prop, receiver) {
                // assert targetFn === fn
                // so, unlikely/seldom that we use a getter on it, maybe for
                // fn.name ... but event that unlikely required!
                if (prop === _PotentialWriteProxy._IS_PROXY)
                    return true;
                return Reflect.get(targetFn, prop, receiver);
            }
          , apply: function(targetFn, thisArgument, argumentsList) {
                // assert targetFn === fn
                // Could be a setter or getter method!
                // There won't be a confused setter that also acts as a getter
                // i.e. raises isImmutableWriteError and returns another immutable
                // Could be as well, for variable length types:
                //      delete(key)
                //      pop(), shift()
                //      push(...entires), unshift(...entires)
                //      AND splice(start, deleteCount, ...entries)
                //      splice is not a "confused setter" in so far that it
                //      doesn't return anything that must be proxified on the way
                //      out, much more, proxy connections are broken up by splice.
                // NOTE: "slice" would be like get
                const draftOrThis = this.hasDraft() ? this.getDraft() : thisArgument;
                let result;
                try {
                    result = Reflect.apply(targetFn, draftOrThis, argumentsList);
                }
                catch(error) {
                    if(isImmutableWriteError(error)) {
                        // This is mutating, called on an immmutable!
                        const draft = this.getDraft();
                        return Reflect.apply(targetFn, draft, argumentsList);
                    }
                    else
                        throw error;
                }

                if(!getterAPIs.has(fnName) || !_requiresPotentialWriteProxy(result))
                    return result;

                // It's a getter AND _requiresPotentialWriteProxy
                // i.e. proxify the next level of children.
                //
                // getter implies _requiresPotentialWriteProxy === true
                //      unless result is already a proxy!
                //
                // in which case is result a proxy and in which case not?
                //
                // is thisArgument a draft or an immutable at this point?

                // CAUTION need key, but fishing for it is wonky.
                // Maybe this could be done better!
                // CAUTION in case of 'slice' result would be an array!
                if(getterAPIs.has(fnName))
                    throw new Error(`UNKOWN GETTER API don't know how to get arguments for method ${fnName} `
                        +  `from parent ${thisArgument} arguments: ${argumentsList.join(', ')}.`);
                const key = argumentsList[0];
                // assert:
                // if(result !== thisArgument[fnName](key)) {
                //     throw new Error(`KEY FINDING ERROR don't know how to get key for ${result} `
                //         +  `from parent ${thisArgument} method ${fnName} arguments: ${argumentsList.join(', ')}.`);
                // }

                // `fn` could be e.g. the `get` function or similar and hence
                // return a _BaseModel child that requires the potentialWriteProxy.
                // It is very interesting how the write on setting to
                // draft will happen/be adressed. I.e. in the example using
                // the `set` method, however, that is arbitrary, and we need
                // a way to identify and call correctly the corresponding setter
                // function. This is injected and the original potentialWriteProxy
                // has to take care of this!

                // => ??? when exactly do this?
                // this is calling: potentialWriteProxy(parentItemProxy, immutableResult)
                // it is important to create the full proxy chain!


                // from the orign on ...
                // we started in a draft of a container
                //      we returned a proxified immutable via the drafts get method
                //          we used the proxified immutables get method and arrived here!
                //              result is another immutable
                //
                // we write to resultProxy.push(entry)
                //  => isImmutableWriteError
                //      => draft = getDraft();
                //         !!!parent[_GET_DRAFT_FOR_PROXY](closureState.proxy)!!!!
                // BUT:
                //
                // if(!this.isDraft)
                //     throw immutableWriteError(new Error(`IMMUTABLE WRITE ATTEMPT `
                //         +`${this}.getDraftFor(${key}) is immutable, not a draft.`));

                // if(!this[_LOCAL_PROXIES].byProxy.has(proxy))
                //     return false;

                return this.getPotentialWriteProxy(key, result);
            }
        };
        return new Proxy(fn, {
            get: handler.get.bind(this)
          , apply: handler.apply.bind(this)
        });
    }

    constructor(parent, immutable, key=null) {
        this.immutable = immutable;
        this.parent = parent;
        if(key !== null && (!_PotentialWriteProxy.isProxy(parent)
                   // get would also raise Key Error
                || parent[_PotentialWriteProxy.GET_IMMUTABLE].get(key) !== immutable))
            throw new Error(`PROXY ERROR can't specify key "${key}" when parent is not a proxy or `
                           + `when immutable is not at parent.get(key).`);
        this.key = key;
        this.draft = null;

        // Could possibly rename '_handlerGet' to 'get' and
        // '_handlerSet' to 'set' and just do: new Proxy(immutable, this);
        // However, that way, accidentially, we could implement other
        // traps, and this way the traps are very explicit.
        this.proxy = new Proxy(immutable, {
              get: this._handlerGet.bind(this)
            , set: this._handlerSet.bind(this)
        });
        // This way the actual instance (this) PotentialWriteProxy remains hidden!
        return this.proxy;
    }
    hasDraft() {
        if(this.draft !== null)
            return true;
        if(this.key !== null)
            return this.parent[_HAS_DRAFT_FOR_OLD_STATE_KEY](this.key);
        else // assert(this.parent.isDraft)
            return this.parent[_HAS_DRAFT_FOR_PROXY](this.proxy);
    }
    // Called when a mutating function (set, delete) triggers ImmutableWriteError!
    getDraft() {
        if(this.draft !== null)
            return this.draft;
        // This depends a lot on the parents nature.
        // was the proxy created from within the draft parent?
        // i.e. parent is a draft
        let draft = false;
        if(this.key !== null)
            // was the proxy created from a proxy of an immutable
            // i.e. parent is a proxy
            // and parent[_POTENTIAL_WRITE_PROXY_GET_IMMUTABLE] exists
            // actually => immutable.getDraftFor(this.key); will trigger itself ImmutableWriteError
            // but we can use parent[_POTENTIAL_WRITE_PROXY_GET]getDraftFor(this.key);
            // which will trigger or not!
            draft = this.parent[_GET_DRAFT_FOR_OLD_STATE_KEY](this.key);
        else if(this.parent.isDraft) // => may have changed if parent[_IS_POTENTIAL_WRITE_PROXY]
            draft = this.parent[_GET_DRAFT_FOR_PROXY](this.proxy);


        // if(! parent ) => disconnected = true! always
        let disconnected = false;

        // false returned by parent.getDraftFor, if draft is not genuine
        if(draft === false) {
            disconnected = true;
            // This draft is 'disconnected' from parent, but on its own
            // a valid draft.
            // FIXME: I wonder if this case should rather raise an Error, as
            // the write now goes into the void, if it is not recovered
            // by parent[_POTENTIAL_WRITE_PROXY_GET_DRAFT]
            // an option would be to raise directly before the return,
            // so the error could be caught and the draft could get extracted
            draft = this.immutable.getDraft();
        }

        if(draft[OLD_STATE] !== this.immutable)
            // Something wen't wrong! Passing this test doesn't mean
            // nothing went wrong, but this is a strong indication for
            // thinking error.
            throw new Error('ASSERTION FAILED draft[OLD_STATE] must be equal to this.immutable but is not.');

        // Return now always this draft from this proxy
        // the proxy could get disconnected from it's parent, but
        // the draft stays connected.
        this.draft = draft;
        //if(disconnected)
        //    throw disconectedError(new Error(`DISCONECTED DRAFT ERROR proxy draft is disconneced from parent`), draft);
        return this.draft;
    }

    getPotentialWriteProxy (key, item) {
        // Must use this.proxy as parent here, in order to trigger
        // the isImmutableWriteError trap.
        // NOTE: assert item === this.immutable.get('key')

        // _PotentialWriteProxy.create:
        return this.constructor.create(this.proxy, item, key);
    }
    _handlerGet (target, prop, receiver) {
        // assert target === immutable
        if (prop === _PotentialWriteProxy.IS_PROXY)
            return true;
        if (prop === _PotentialWriteProxy.GET_IMMUTABLE)
            return this.immutable;
        if (prop === _PotentialWriteProxy.GET_DRAFT)
            return this.hasDraft()
                ? this.getDraft()
                : undefined
                ;
        if (prop === _PotentialWriteProxy.GET)
            return this.hasDraft()
                ? this.getDraft()
                : this.immutable
                ;

        const result = Reflect.get(target, prop, receiver);
        if(typeof result === 'function') {
            // TODO: return proxy to trap function call
            //       and possibly catch the isImmutableWriteError
            return this.createMethodProxy(prop, result);
        }

        // FIXME: not sure about this!
        // as the returned proxy is not really stored in the parent
        // seems, like we can't resolve it to a draft in the parent.
        return this.getPotentialWriteProxy(prop, result);
    }
    // set case is just for completeness, I don't think it's yet actually
    // used, but it could.
    _handlerSet (target, propertyKey, value, receiver) {
        // assert target === immutable
        const draftOrTarget = this.hasDraft() ? this.getDraft() : target;
        try {
            return Reflect.set(draftOrTarget, propertyKey, value, receiver);
        }
        catch(error) {
            if(isImmutableWriteError(error)) { // === trying to write to immutable
                // this detects the write, everything else may as well
                // be any read, even of un-important values or of unrelated
                // calculations etc.
                const draft = this.getDraft();
                // Leaving out receiver, don't think it's relevant here,
                // but I could be wrong!
                return Reflect.set(draft, propertyKey, value/*, receiver*/);
            }
            // re-raise, not our business!
            throw error;
        }
    }
}

export function unwrapPotentialWriteProxy(maybeProxy, type=null) {
    if(!_PotentialWriteProxy.isProxy(maybeProxy))
        return maybeProxy;
    if(type === 'immutable')
        // Returns immutable
        return maybeProxy[_PotentialWriteProxy.GET_IMMUTABLE];
    if(type === 'draft')
        // Returns the draft that is associated with the proxy,
        // if it already exists otherwise undefined.
        return maybeProxy[_PotentialWriteProxy.GET_DRAFT];
    // Returns the draft, if it already exists otherwise the immutable.
    return maybeProxy[_PotentialWriteProxy.GET];
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
    static has(key) { // in all of the local name space
        // Own names, which override parent scope for children dependencies.
        for(const map of [this.fields, this.foreignKeys, this.links, this.internalizedDependencies]) {
            if(map.has(key))
                return true;
        }
        return false;
    }
    // In all of the local name space returns a:
    //      an instance of _BaseModel from this.fields
    //      an instance of ForeignKey from this.keys
    //      an instance of _BaseLink from this.links
    //      an instance of InternalizedDependency from this.internalizedDependencies
    // in that order or throws a KEY ERROR
    static get(key) {
        // Own names, which override parent scope for children dependencies.
        for(const map of [this.fields, this.foreignKeys, this.links, this.internalizedDependencies]){
            if(map.has(key))
                return map.get(key);
        }
        throw new Error(`KEY ERROR "${key}" not found in local namespace of ${this.constructor.name}.`);
    }

    static *entries() { // => [name, instance of _BaseModel, Key or _BaseLink]
        yield* allEntries(this.fields, this.foreignKeys, this.links, this.internalizedDependencies);
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
          , internalizedDependencies = new FreezableMap()
          // Used to rename/map external dependency names to internal
          // names and still be able to use both. I.e. get "font" from
          // the parent and call it "externalFont" and define "font" in
          // here locally e.g. as a Link or as a Field.
          // Used for internalizedDependencies.
          , ownExternalDependencies = new FreezableSet()
          , _childrenAllDependencies = new FreezableSet()
          , seen = new Set()
          ;

        for(const definition of definitions) {
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
            else if(value instanceof InternalizedDependency) {
                internalizedDependencies.set(name, value);
                for(const dependency of value.dependencies)
                    ownExternalDependencies.add(dependency);
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
                throw new Error(`VALUE ERROR: don't know how to handle defintion for ${className}: ${name}:${value}`);
        }

        for(const [keyName, key] of foreignKeys) {
            if(!fields.has(key.targetName) && !internalizedDependencies.has(key.targetName))
                throw new Error(`KEY ERROR: ${className} foreignKey "${keyName}" doesn't reference an existing field: ${key}.`);
        }
        for(const [linkName, link] of links) {
            if(!foreignKeys.has(link.keyName))
                throw new Error(`LINK ERROR: ${className} link "${linkName}" doesn't reference an existing foreignKeys: ${link}.`);
        }

        // bind an object as the thisval to the static has function.
        // This way, the definite dependencies property can be pre-calculated
        // with the same method that would be used in an on demand calculation.
        // but we can bind the soon-to-be namespace into it.
        // Could also be done like:
        //      this.has.call({fields, foreignKeys, links, internalizedDependencies}, dependency)
        //  like:
        //       iterFilter(childrenDependencies, dependency=>!this.has.call({fields, keys, links}, dependency))
        //  also:
        //      filterFn = dependency=>!this.has.call({fields, keys, links}, dependency)
        //      iterFilter(childrenDependencies, filterFn)
        //
        const staticHas = this.has.bind({fields, foreignKeys, links, internalizedDependencies})
            // remove locally defined names
          , childrenExternalDependencies = new FreezableSet(iterFilter(_childrenAllDependencies, dependency=>!staticHas(dependency)))
          , dependencies = new FreezableSet([ //jshint ignore: line
                      // Via internalizedDependencies, these are allways
                      // external even if this class itself defines one
                      // of these names. This is so that this element
                      // can e.g. redefine what "font" is for children.
                      ... ownExternalDependencies
                      // This is communicated upwards local overrides
                      // of all children dependencies are not contained.
                    , ... childrenExternalDependencies
            ])
            // The topological order, to determine child initialization order
            // can be determined in here already:
          , initOrder = /*jshint ignore:line */ // => defined but never used
                          getTopologicallySortedInitOrder(coherenceFunctions, fields
                            , foreignKeys, links, internalizedDependencies
                            , childrenExternalDependencies)
          ;
        // this way name will naturally become class.name.
        const result = {[className]: class extends this {
            // jshint ignore: start
            static fields = Object.freeze(fields);
            static foreignKeys = Object.freeze(foreignKeys);
            static links = Object.freeze(links);
            static coherenceFunctions= Object.freeze(coherenceFunctions);
            static internalizedDependencies = Object.freeze(internalizedDependencies);

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
        for(let prop of ['fields', 'foreignKeys', 'links', 'internalizedDependencies'
                        , 'coherenceFunctions', 'dependencies', 'childrenExternalDependencies'
                        , 'initOrder'])
            console.log(`    ${className}.${prop}:`, result[className][prop]);

        console.log(new Array(30).fill('*-').join(''));
        console.log(new Array(30).fill('*-').join('') + '\n');
        return result[className];
    }


    // FIXME: you don't call this directly for now use:
    // static createPrimalState or instacne.getDraft
    // However, without oldState this should return the same as
    // createPrimalState!
    // OR could it still be valid? We need to have this._value propagated
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

        // this._value will only contain changed entries
        // if this._value.get(name) === this.[OLD_STATE].value.get(name)
        // it should not be set, to detect change, but that can only finally
        // be done in metamorphose, there a draft value can go back to its
        // OLD_STATE if it has not changed.
        Object.defineProperty(this, '_value', {value: new FreezableMap(), configurable: true});
        // byProxy.get(proxy)=>key byKey.get(key)=>proxy
        this[_LOCAL_PROXIES] = {byProxy: new Map(), byKey: new Map(), changedBySetter: new Set()};
        // Create an immutable primal state if OLD_STATE is null:
        if(dependencies !== null)
            // So, here's a problem,: this won't return a new object
            // if there was an OLD_STATE and there was no change
            // but since this is a constructor it MUST return a new
            // object (when called with `new`).
            return this.metamorphose(dependencies);
    }

    static createPrimalState(dependencies) {
        return new this(null, dependencies);
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
                && this._value.size === 0)
            return this[OLD_STATE];

        const localScope = new Map()
                // localScope should already own *children*-external dependencies!!!
          , collectDependencies = dependencies=>Object.fromEntries(
                iterMap(dependencies, (key)=>[key, localScope.get(key)]))
          , locked = new Set()
          , lockItem = (name)=>{
                if(locked.has(name))
                    // Been here done that.
                    return;
                locked.add(name);
                if(!this.hasOwn(name))
                    // Locking not requrired from this, this is not the owner.
                    return;

                // if this is primal state construction and there's no
                // OLD_STATE the init order loop should have populated
                // this._value.get(name) by now!
                const item = this._value.has(name)
                    ? this._value.get(name)
                    : this[OLD_STATE].get(name)
                    ;

                // `item` is a draft.
                // `descriptor` is a Model or an instance of ForeignKey.
                // ValueLink, Constraint and InternalizedDependency are
                // skipped with `this.hasOwn(name)` and require no
                // locking themselves.
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
                                ? item.metamorphose()
                                : item)
                        ;
                }
                else { // is field/value
                    const childDependencies = collectDependencies(descriptor.dependencies);
                    immutable = item.isDraft
                        ? item.metamorphose(childDependencies)
                        // It's immutable. If we would have locked item already
                        // we wouldn't be here. Drafts are always from this._value
                        // but immutables can potentially come from both sources.
                        // An immutable can be set via the set method but is also
                        // set when creating a primal state, in the initOrder loop.
                        // We got to make sure the dependencies are the same
                        // or metamorphose the item to the next version.
                        : (!_dependenciesAreEqual(childDependencies, item.dependencies)
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

        // This is the mantra:
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
            else if(this.constructor.internalizedDependencies.has(name)) {
                const internalizedDependency = this.constructor.internalizedDependencies.get(name);
                if(!(internalizedDependency.dependencyName in this.dependencies))
                    // should be covered above when checking dependenciesData
                    throw new Error(`DEPENDENCY ERROR ${this.constructor.name} requires `
                        + `"${internalizedDependency.dependencyName}" in dependenciesData.`
                        + ` for "${name}": ${internalizedDependency}.`);
                localScope.set(name, this.dependencies[internalizedDependency.dependencyName]);
            }
            else if(this.constructor.fields.has(name)) {
                // get return value can be a draft or a proxified immutable.
                if(this[OLD_STATE] === null && !this._value.has(name)) {
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
                        if(this._value.has(depencyName)) {
                            dependency = this._value.get(depencyName);
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
                    this._value.set(name, immutable);
                }

                localScope.set(name, this.get(name));
            }
            else if(this.constructor.coherenceFunctions.has(name)) {
                const coherenceFunction = this.constructor.coherenceFunctions.get(name)
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
                // localScope.set(name, coherenceFunction.fn(childDependencies));
                coherenceFunction.fn(childDependencies);
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
                if(this[OLD_STATE] === null && !this._value.has(name)) {
                    // this is a primal state
                    // FIXME: without running the constraint, there
                    // won't be a value for this initial key! (immutable.value === undefined)
                    // A coherence function specialized for the primal
                    // state case may have to bootstrap this.
                    const immutable = KeyValueModel.createPrimalState();
                    // This way the get method can give out potential write
                    // proxies and the coherence functions can change
                    // this, even in primal state creation.
                    this._value.set(name, immutable);
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
            else
                // A programming error, was new stuff added recently ?
                throw new Error(`UNKOWN NAME Don't know how to treat "${name}".`);
        }

        // Are there any not locked fields/keys now?
        this.ownKeys().map(lockItem);

        // compare
        if(this[OLD_STATE] && changedDependencyNames.size === 0)
            // Has NOT changed!
            return this[OLD_STATE];

        // make sure all items are in this._value
        for(const name of this.ownKeys())
            this._value.set(name, localScope.get(name));


        // Has changed!
        {
            // validate types in this._value
            const types = [];
            for(const [name, Type] of this.constructor.fields.entries()) {
                // no inheritance allowed so far.
                const value = this._value.get(name);
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
                const value = this._value.get(name);
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
        Object.defineProperty(this, '_value', {
            value: Object.freeze(this._value)
          , writable: false
          , configurable: false
        });
        Object.defineProperty(this, _IS_DRAFT_MARKER, {value: false, configurable: false});
        delete this[_LOCAL_PROXIES];
        Object.freeze(this);
        return this;
    }

    get value() {
        if(!this.isDraft)
            throw new Error(`LIFECYCLE ERROR ${this} will only return this.value when immutable/not a draft..`);
        return this._value;
    }

    *[Symbol.iterator]() {
        // maybe use flags to decide what not to yield
        // users (data readers) may require
        // yield keys, links?
        for(const key of this.ownKeys())
            yield [key, this.get(key)];
    }

    *entries() {
        yield* this;
    }

    *allEntries() {
        for(const key of this.keys())
            yield [key, this.get(key)];
    }

    // TODO: something like this will probably be required.
    //toObject() {
    //    const result = {};
    //    for(let k of allKeys(this.fields, this.foreignKeys))
    //        result[k] = this._value.get(k).toObject();
    //    return result;
    //}

    size() {
        //  FIXME: Keys and original values are contained. What about Links?
        // I have a hunch that even links, should be contained, if we want
        // to be able to further reference them.

        return this.constructor.fields.size + this.constructor.foreignKeys.size;
    }

    /**
     * True for values that are owned by this struct, that are:
     * fields and foreignKeys. These are stored originally in this._value.
     * Links (linked values) and Internalized Dependencies (also kind of
     * linked values) are not owned by this struct, they are just referenced,
     * links from "below" in the hierarchy, Internalized Dependencies from
     * above. These are still included in the this.has and this.keys interfaces.
     */
    hasOwn(key) {
        return this.constructor.fields.has(key) || this.constructor.foreignKeys.has(key);
    }

    /**
     * Returns an array of keys for values that are owned by this struct,
     * that are: fields and foreignKeys. These are stored originally in this._value.
     * See hasOwn for more details.
     */
    has(key) {
        return this.hasOwn(key) || this.constructor.links.has(key)
                || this.constructor.internalizedDependencies.has(key);
    }

    ownKeys() {
        //  These and `hasOwn` follow the same rules!
        return [... this.constructor.fields.keys(), ...this.constructor.foreignKeys.keys()];
    }

    keys() {
        return [...this.ownKeys(), ...this.constructor.links.keys()
                    , ...this.constructor.internalizedDependencies.keys()];
    }

    /**
     * hasDraftFor and getDraftFor are likely only a required interfaces
     * for _BaseContainerModel.
     */
    [_HAS_DRAFT_FOR_PROXY](proxy) {
        if(!this.isDraft)
            return false;

        if(!this[_LOCAL_PROXIES].byProxy.has(proxy))
            // the proxy is disconnected
            return false;

        const key = this[_LOCAL_PROXIES].byProxy.get(proxy)
            // MAY NOT BE A DRAFT AT THIS MOMENT!
          , item = this._value.get(key)
          ;
        if(!item || !item.isDraft)
            return false;

        // Identified via this[_LOCAL_PROXIES].
        return true;
    }

    [_HAS_DRAFT_FOR_OLD_STATE_KEY](key) {
        if(!this.isDraft)
            return false;
        // this implies that if this is a draft all items in
        // this._value must be drafts as well! But do we know?
        // It's not important: if the value was created externally
        // or set as an immutable from external, this won't return the
        // value anyways!

        if(!this._value.has(key))
            return false;

        if(this[_LOCAL_PROXIES].changedBySetter.has(key))
            // disconnected from original OLD_STATE key releation
            return false;

        // MAY NOT BE A DRAFT AT THIS MOMENT!
        const item = this._value.get(key);
        if(!item || !item.isDraft)
            return false;
        return true;
    }

    // called from the perspective of a proxy that was created when this
    // was still an immutable.
    [_GET_DRAFT_FOR_OLD_STATE_KEY](key) {
        if(!this.isDraft)
            // required: so this can be turned into a draft on demand
            throw immutableWriteError(new Error(`IMMUTABLE WRITE ATTEMPT `
                +`${this}${_GET_DRAFT_FOR_OLD_STATE_KEY}(${key}) is immutable, not a draft.`));

        if(!this.hasOwn(key))
            throw new Error(`KEY ERROR "${key}" not found in ${this}.`);

        if(this[OLD_STATE] === null)
            // I suppose this should never happen, this[OLD_STATE] must
            // not be null in this method.
            // When creating a primary state, we should not create proxies
            // for delayed drafts at all, so that can circumvent this.
            throw new Error(`ASSERTION FAILED this[OLD_STATE] should exist in this method.`);

        if(this[_LOCAL_PROXIES].changedBySetter.has(key))
            // disconnected _GET_DRAFT_FOR_OLD_STATE_KEY relates only to drafts
            // created directly for [OLD_STATE] entries.
            return false;

        const item = this._value.has(key)
            ? this._value.get(key) // => assert item.isDraft
              // expect OLD_STATE to exist!
            : this[OLD_STATE].get(key) // item is not a draft
            ;

        if(item.isDraft)
            // Since it was not changedBySetter this must be the original
            // draft for the item at OLD_STATE
            return item;

        const draft = item.getDraft();
        this._value.set(key, draft);
        return draft;
    }
    /**
     * Raises KeyError if key is not available.
     * Raises ImmutableWriteError if this is not a draft.
     *      => but the proxy is only available if this is a draft
     *         so if(!this.isDraft) should fail differently!
     * Returns False, if draft is not natively created by this function
     * i.e. set from the outside.
     * Returns a draft for key otherwise.
     * this is likely only for _BaseContainerModel
     */
    [_GET_DRAFT_FOR_PROXY](proxy) {
        // TODO: check if key exists! Else KEY ERROR ${key}
        if(!this.isDraft)
            throw immutableWriteError(new Error(`IMMUTABLE WRITE ATTEMPT `
                +`${this} is immutable, not a draft in ${_GET_DRAFT_FOR_PROXY}.`));

        if(!this[_LOCAL_PROXIES].byProxy.has(proxy))
            // proxy is disconnected
            return false;

        const key = this[_LOCAL_PROXIES].byProxy.get(proxy)
          , item = this._value.has(key)
                        ? this._value.get(key)
                        : this[OLD_STATE].get(key)
          ;

        // MAY NOT BE A DRAFT AT THIS MOMENT! => via set(key, immutable)...
        // in that case were going to replace the item in this._value with
        // its draft.
        if(item.isDraft)
            // We own the proxy, so the draft is from here.
            return item;
        const draft = item.getDraft();
        this._value.set(key, draft);
        return draft;
    }

    getDraftFor(key, defaultReturn=_NOTDEF) {
        const proxyOrDraft = this._getOwn(key, defaultReturn);
        if(_PotentialWriteProxy.isProxy(proxyOrDraft))
            return this[_GET_DRAFT_FOR_PROXY](proxyOrDraft);
        return proxyOrDraft;
    }

    _getOwn(key) {
        if(!this.hasOwn(key))
            throw new Error(`KEY ERROR "${key}" not found in ${this}.`);

        let item = this._value.has(key) && this._value.get(key);
        if(!item && this[OLD_STATE] !== null) {
            // item could be not in value but proxy could exist
            item = this[OLD_STATE].get(key);
        }
        if(!item)
            // This would just be weird!
            // In primal state, this._value is fully populated with primal
            // state elements and after this[OLD_STATE] is present.
            //
            // FIXME: However, it is still possible to run the constructor
            // directly, without an OLD_STATE and without metamorphose
            // after. That should be rooted out.
            throw new Error(`INTERNAL LOGIC ERROR "${key}" should exist, but it doesn't`);

        if(!this.isDraft)
            return item;

        // Don't create proxy twice and thereby detach the old one.
        if(!item.isDraft && this[_LOCAL_PROXIES].byKey.has(key))
            return this[_LOCAL_PROXIES].byKey.get(key); // => proxy;

        // The function understands if item is already a draft
        // and does not proxify item in that case.
        const proxyOrDraft = _PotentialWriteProxy.create(this, item);
        if(_PotentialWriteProxy.isProxy(proxyOrDraft)) {
            this[_LOCAL_PROXIES].byKey.set(key, proxyOrDraft);
            this[_LOCAL_PROXIES].byProxy.set(proxyOrDraft, key);
        }
        return proxyOrDraft;
    }

    _getLink(key) {
        if(!this.constructor.links.has(key))
            throw new Error(`KEY ERROR "${key}" is not a link found in ${this}.`);
        // resolve the link
        const link = this.constructor.links.get(key)
          , foreignKey = this.constructor.foreignKeys.get(link.keyName)
          , targetKey = this.get(link.keyName)
          , target = this.get(foreignKey.targetName)
          ;
        return target.get(targetKey.value);
    }

    get(key, defaultReturn=_NOTDEF) {
        if(this.hasOwn(key))
            return this._getOwn(key);
        if(this.constructor.internalizedDependencies.has(key))
            return this.dependencies[this.constructor.internalizedDependencies.get(key).dependencyName];
        if(this.constructor.links.has(key))
            return this._getLink(key);
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
        if(!this.hasOwn(key))
            throw new Error(`KEY ERROR trying to set not ownded (or unkown) "${key}" in ${this}.`);

        this._value.set(key, unwrapPotentialWriteProxy(entry));

        // This disconnects by-key potential write proxies
        this[_LOCAL_PROXIES].changedBySetter.add(key);
        if(this[_LOCAL_PROXIES].byKey.has(key)) {
            // break the connection
            const proxy = this[_LOCAL_PROXIES].byKey.get(key);
            this[_LOCAL_PROXIES].byKey.delete(key);
            this[_LOCAL_PROXIES].byProxy.delete(proxy);
        }
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
        // Can't override class.Model anymore, would be possible w/o the freeze.
        Object.freeze(result[className]);
        return result[className];
    }

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

        // Start with an empty this._value for quick not-changed comparison.
        Object.defineProperty(this, '_value', {
            value: new Array(this[OLD_STATE] !== null ? this[OLD_STATE].length : 0)
          , writable: false // can't replace the array itself
          , configurable: true
        });
        // Keep track of proxies and OLD_STATE original indexes in a
        // shadow of this._value that is kept in sync with value!
        // Entries may get replaced by set or moved/removed by splice.
        this[_OLD_TO_NEW_SLOT] = [...this._value.keys()]
                                     .map(index=>[index, null/*proxy*/]);

        // Create an immutable primal state if OLD_STATE is null:
        if(dependencies !== null)
            // Must return a new object (when called with `new`).
            // only works when there was no OLD_STATE
            return this.metamorphose(dependencies);
    }

    static createPrimalState(dependencies) {
        return new this(null, dependencies);
    }

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
        Object.freeze(dependenciesData);

        // More possible checks on dependencies:
        //  * Ensure all dependencies are immutable (and of a corrsponding type).

        // Required for comparison between OLD_STATE and this.
        // These are the names and values of the dependencies of the class.
        // We need to compare these to see if a change of the object is required.
        //
        // It's interesting, I'm not sure we need to do this comparision
        // in here! We may not even have to keep reccord of these, as the
        // children will do. If there are no children, this will not actually
        // have dependencies, if there are children, the children will report...
        //
        // There's a case: when in draft, to create a child for insertion
        // it's good to have the dpendencies for the constructor. They can
        // be taken from [OLD_STATE] basically and be used directly.
        //
        // myOldList // maybe like myDraftList[OLD_STATE] or from the app state
        // newEntry = myOldList.Model.createPrimalState(myOldList.dependencies)
        // or
        // newEntry = new myOldList.Model(null, myOldList.dependencies);
        Object.defineProperty(this, 'dependencies', {
            value: Object.freeze(dependenciesData)
          , writable: false
          , configurable: false
        });

        const dependenciesAreEqual = this[OLD_STATE] !== null
                && _dependenciesAreEqual(this[OLD_STATE].dependencies, this.dependencies);

        // shortcut
        if(dependenciesAreEqual
                && this.size === this[OLD_STATE].size
                   // is only empty slots i.e. no changes
                && Object.values(this.value).length === null
        )
            return this[OLD_STATE];

        for(const index of this._value.keys()) {
            let item = Object.hasOwn(this._value, index) && this._value[index];
            if(!item &&  this[OLD_STATE] !== null) {
                const [oldIndex, /*proxy*/] = this[_OLD_TO_NEW_SLOT][index];
                item = this[OLD_STATE].get(oldIndex);
            }

            if(!(item instanceof this.constructor.Model))
                throw new Error(`TYPE ERROR ${this.constructor.name} `
                    + `expects ${this.constructor.Model.name} `
                    + `wrong type in ${index} ("${item}" typeof ${typeof item}).`
                );
            const immutable = item.isDraft
                    ? item.metamorphose(this.dependencies)
                      // Not sure if we should check with _dependenciesAreEqual
                      // or just let entry check itself if it has to move forward.
                    : (!_dependenciesAreEqual(this.dependencies, item.dependencies)
                          ? item.getDraft().metamorphose(this.dependencies)
                          : item
                      )
              ;
            this._value[index] = immutable;
        }
        // last stop to detect a no-change
        if(this[OLD_STATE] !== null
                && dependenciesAreEqual
                && this.size === this[OLD_STATE].size
                && this._value.every((entry, index)=>entry === this[OLD_STATE].get(index)))
            return this[OLD_STATE];

        delete this[OLD_STATE];
        Object.defineProperty(this, '_value', {
            value: Object.freeze(this._value)
          , writable: false
          , configurable: false
        });
        Object.defineProperty(this, _IS_DRAFT_MARKER, {value: false, configurable: false});
        delete this[_OLD_TO_NEW_SLOT];
        Object.freeze(this);
        return this;
    }

    get value() {
        if(!this.isDraft)
            throw new Error(`LIFECYCLE ERROR ${this} will only return this.value when immutable/not a draft..`);
        return this._value;
    }

    get length() {
        return this._value.length;
    }

    get size() {
        return this._value.length;
    }

    hasOwn(key) {
        const [index, /*message*/] = this.keyToIndex(key);
        return index !== null;
    }

    ownKeys() {
        return [this._value.keys()].map(i=>i.toString(10));
    }

    *[Symbol.iterator]() {
        for(const key of this.ownKeys())
            yield [key, this.get(key)];
    }

    *entries() {
        yield* this;
    }

    /**
     * hasDraftFor and getDraftFor are likely only a required interfaces
     * for _BaseContainerModel.
     */
    [_HAS_DRAFT_FOR_PROXY](proxy) {
        if(!this.isDraft)
            return false;
        // this implies that if this is a draft all items in
        // this._value must be drafts as well! But do we know?
        // It's not important: if the value was created externally
        // or set as an immutable from external, this won't return the
        // value anyways!

        const index = this[_OLD_TO_NEW_SLOT].findIndex(([,ownProxy])=>ownProxy===proxy);
        if(index === -1)
            // proxy is disconnected
            return false;

        // May not be a draft at this moment!
        // In that case it may also not yet be in this._value.
        const item = Object.hasOwn(this._value, index) && this._value[index];
        if(!item || !item.isDraft)
            return false;

        // Item is a draft created here for proxy. We know because
        // the proxy was used to find the index.
        return true;
    }
    [_HAS_DRAFT_FOR_OLD_STATE_KEY](oldKey) {
        if(!this.isDraft)
            return false;
        // this implies that if this is a draft all items in
        // this._value must be drafts as well! But do we know?
        // It's not important: if the value was created externally
        // or set as an immutable from external, this won't return the
        // value anyways!

        const [oldIndex, message] = this[OLD_STATE].keyToIndex(oldKey);
        if(oldIndex === null)
            // was not in OLD_STATE
            throw new Error(message);

        const index = this[_OLD_TO_NEW_SLOT].findIndex(([ownOldIndex,])=>ownOldIndex===oldIndex);
        if(index === -1)
            // proxy is disconnected
            return false;

        // May not be a draft at this moment!
        // In that case it may also not yet be in this._value.
        const item = Object.hasOwn(this._value, index) && this._value[index];
        if(!item || !item.isDraft)
            return false;

        // Item is a draft created here for key. We know because
        // the key was used to find the index.
        return true;
    }

    [_GET_DRAFT_FOR_OLD_STATE_KEY](oldKey) {
        // key must be in this[OLD_STATE]!
        // draft will be for this[OLD_STATE].get(key).getDraft()
        if(!this.isDraft)
            // required: so this can be turned into a draft on demand
            throw immutableWriteError(new Error(`IMMUTABLE WRITE ATTEMPT `
                +`${this}${_GET_DRAFT_FOR_OLD_STATE_KEY}(${oldKey}) is immutable, not a draft.`));

        const [oldIndex, message] = this[OLD_STATE].keyToIndex(oldKey);

        if(oldIndex === null)
            // was not in OLD_STATE
            throw new Error(message);

        const index = this[_OLD_TO_NEW_SLOT].findIndex(([ownOldIndex,])=>ownOldIndex===oldIndex);
        if(index === -1)
            // The item associated with oldIndex is no longer part of this
            // object, the proxy is disconnected.
            return false;

        let item = Object.hasOwn(this._value, index) && this._value[index];
        if(!item)
            item = this[OLD_STATE].get(oldIndex);

        if(item.isDraft)
            // We already created the connection between
            // index and oldIndex, we found index via oldKey,
            // item belongs to oldIndex.
            return item;
        const draft = item.getDraft();
        this._value[index] = draft;
        return draft;
    }

    /**
     * Raises KeyError if key is not available.
     * Raises ImmutableWriteError if this is not a draft.
     * Returns False, if draft is not natively created by this function
     * i.e. set from the outside.
     * Returns a draft for key otherwise.
     * this is likely only for _BaseContainerModel
     */
    [_GET_DRAFT_FOR_PROXY](proxy) {
        if(!this.isDraft)
            throw immutableWriteError(new Error(`IMMUTABLE WRITE ATTEMPT `
                +`${this} is immutable, not a draft in ${_GET_DRAFT_FOR_PROXY}.`));

        const index = this[_OLD_TO_NEW_SLOT].findIndex(([,ownProxy])=>ownProxy===proxy);
        if(index === -1)
            // proxy is disconnected
            return false;

        let item = Object.hasOwn(this._value, index) && this._value[index];
        if(!item) {
            const [oldIndex, ] = this[_OLD_TO_NEW_SLOT][index];
            // assert oldIndex is there, otherwise this will raise a Key Error
            // also, if oldIndex got removed from _OLD_TO_NEW_SLOT there
            // must be an item in this._value or the proxy is disconnected.
            item = this[OLD_STATE].get(oldIndex);
        }
        if(item.isDraft)
            // since we found it via proxy, item belongs to it.
            // assert this._value[index] === item
            return item;
        const draft = item.getDraft();
        this._value[index] = draft;
        return draft;
    }

    getDraftFor(key, defaultReturn=_NOTDEF) {
        const proxyOrDraft = this.get(key, defaultReturn);
        if(_PotentialWriteProxy.isProxy(proxyOrDraft))
            return this[_GET_DRAFT_FOR_PROXY](proxyOrDraft);
        return proxyOrDraft;
    }

    /**
     * Zero-based index of the array element to be returned, converted
     * to an integer. Negative index counts back from the end of the
     * array — if index < 0, index + array.length is accessed.
     */
    keyToIndex(key) {
        let index = parseInt(key, 10);
        if(isNaN(index))
            return [null, `KEY ERROR can't parse "${key}" as integer.`];
        if(index < 0)
            // like Array.prototype.at
            // HOWEVER, the key is not the canonical path in this case;
            index = index + this._value.length;
        if(index < 0 || index >= this._value.length)
           return [null, `KEY ERROR NOT FOUND key "${key}" is not an index (= ${index})`
                       + ` (index > 0 && index < ${this._value.length}.`];
        return [index, null];
    }

    indexOf(item, fromIndex) {
        return this._value.indexOf(item, fromIndex);
    }

    get(key, defaultReturn=_NOTDEF) {
        const [index, message] = this.keyToIndex(key);
        if(index === null) {
            if(defaultReturn !== _NOTDEF)
                return defaultReturn;
            throw new Error(message);
        }

        if(!this.isDraft)
            return this._value[index];

        // Can be a draft or immutable e.g. via set(index, element)
        let item = Object.hasOwn(this._value, index) && this._value[index];
        if(!item) {
            // If there's no item in value[index] yet, oldIndex will exist.
            const [oldIndex, proxy] = this[_OLD_TO_NEW_SLOT][index];
            if(proxy)
                // Important, otherwise we could create the proxy multiple
                // times and override the older versions.
                return proxy;
            // KeyError if the assumption is wrong, this would require
            // fixing in here!
            // Is always immutable.
            item = this[OLD_STATE].get(oldIndex);
        }

        // The function understands if item is already a draft
        // and does not proxify item in that case.
        const proxyOrDraft = _PotentialWriteProxy.create(this, item);
        if(_PotentialWriteProxy.isProxy(proxyOrDraft))
            // it's a proxy
            this[_OLD_TO_NEW_SLOT][index][1] = proxyOrDraft;
        // else: It is a draft already and the draft is at this._value[index];
        return proxyOrDraft;
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
        const [index, message] = this.keyToIndex(key);
        if(index === null)
            throw new Error(message);
        this.splice(index, 1, entry);
    }

    push(...entries) {
        this.splice(Infinity, 0, ...entries);
        return this.length;
    }
    unshift(...entries) {
        this.splice(0, 0, ...entries);
        return this.length;
    }
    pop() {
        return this.splice(-1, 1)[0];
    }
    shift() {
        return this.splice(0, 1)[0];
    }
    delete(key) {
        const [index,/* message*/] = this.keyToIndex(key);
        if(index === null)
            return;
        return this.splice(index, 1)[0];
    }
    // The Swiss Army Knive of array methods.
    splice(start, deleteCount, ...entries) {
        if(!this.isDraft)
            // FIXME: for the potential write proxy, it becomes very
            // interesting trying to write many entries.
            // Also interesting for that when trying to write no entries and just removing stuff.
            throw immutableWriteError(new Error(`NOT DRAFT ERROR: ${this} can't call splice when not in draft phase.`));

        const removed = this._value.splice(start, deleteCount, ...entries.map(entry=>unwrapPotentialWriteProxy(entry)));
        // Replaces [index, proxy] by empty arrays, disconnecting proxies
        this[_OLD_TO_NEW_SLOT].splice(start, deleteCount, ...new Array(entries.length).fill(null).map(()=>[]));
        return removed;
    }
}

/**
 * I'm not moving this to the new lifecycle protocol for now.
 * _AbstractOrderedMapModel does everything this would do (and more),
 * however, this would be much simpler and probably a bit faster.
 * Willing to deliver later.
 *
// Very similar to _AbstractListModel _AbstractOrderedMapModel
export class _AbstractMapModel extends _BaseContainerModel {
    static get Model() {
        // NOT IMPLEMENTED Model is not defined in _AbstractMapModel
        throw new Error(`NOT IMPLEMENTED Model is not defined in ${this.name}`);
    }

    static get dependencies() {
        return this.Model.dependencies;
    }

    static createClass(className, Model /* a _BaseModel * /) {
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
                    typeFails.push(`${key} ("${entry}" typeof ${typeof entry})`);
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

    get size() {
        return this._value.size;
    }

    keys() {
        return this._value.keys();
    }

    has(key) {
        return this._value.has(key);
    }

    get(key, defaultReturn=_NOTDEF) {
        if(!this._value.has(key)) {
            if(defaultReturn !== _NOTDEF)
                return defaultReturn;
            throw new Error(`KEY ERROR "${key}" not found in ${this}.`);
        }
        return this._value.get(key);
    }

    set(key, entry) {
        // could return this
        if(this._value.has(key) && this._value.get(key) === entry)
            return this;
        const newValue = new Map(this._value);
        newValue.set(key, entry);
        return new this.constructor(Array.from(newValue));
    }

    delete(key) {
        if(!this._value.has(key))
            return this;
        const newValue = new Map(this._value);
        newValue.delete(key);
        return new this.constructor(Array.from(newValue));
    }
}
*/


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

        // Start with an empty this._value for quick not-changed comparison.
        Object.defineProperty(this, '_value', {
            value: new Array(this[OLD_STATE] !== null ? this[OLD_STATE].length : 0)
          , writable: false // can't replace the array itself
          , configurable: true
        });
        Object.defineProperty(this, '_keys', {
            value: new FreezableMap()
          , writable: false // can't replace the FreezableMap itself
          , configurable: true
        });
        // Keep track of proxies and OLD_STATE original indexes in a
        // shadow of this._value that is kept in sync with value!
        // Entries may get replaced by set or moved/removed by splice.

        this[_OLD_TO_NEW_SLOT] = this[OLD_STATE] !== null
                ? [...this[OLD_STATE]].map(
                        ([key, /*value*/], index)=>[index, key, null/*proxy*/])
                : []
                ;
        this._updateKeys();

        // Create an immutable primal state if OLD_STATE is null:
        if(dependencies !== null)
            // Must return a new object (when called with `new`).
            // only works when there was no OLD_STATE
            return this.metamorphose(dependencies);
    }

    static createPrimalState(dependencies) {
        return new this(null, dependencies);
    }

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

        Object.defineProperty(this, 'dependencies', {
            value: Object.freeze(dependenciesData)
          , writable: false
          , configurable: false
        });

        const dependenciesAreEqual = this[OLD_STATE] !== null
                && _dependenciesAreEqual(this[OLD_STATE].dependencies, this.dependencies);

        // shortcut
        if(dependenciesAreEqual
                && this.size === this[OLD_STATE].size
                   // is only empty slots i.e. no changes
                && Object.values(this._value).length === null
        )
            return this[OLD_STATE];

        for(const index of this._value.keys()) {
            let kvItem = Object.hasOwn(this._value, index)
                ? this._value[index]
                :  this[OLD_STATE].value[this[_OLD_TO_NEW_SLOT][index][0]]
                ;
            const [key, item] = kvItem || [];

            if(!(item instanceof this.constructor.Model))
                throw new Error(`TYPE ERROR ${this.constructor.name} `
                    + `expects ${this.constructor.Model.name} `
                    + `wrong type at ${key} in ${index} ("${item}" typeof ${typeof item}).`
                );
            const immutable = item.isDraft
                    ? item.metamorphose(this.dependencies)
                      // Not sure if we should check with _dependenciesAreEqual
                      // or just let entry check itself if it has to move forward.
                    : (!_dependenciesAreEqual(this.dependencies, item.dependencies)
                          ? item.getDraft().metamorphose(this.dependencies)
                          : item
                      )
              ;
            this._value[index] = Object.freeze([key, immutable]);
        }
        // last stop to detect a no-change
        if(this[OLD_STATE] !== null
                && dependenciesAreEqual
                && this.size === this[OLD_STATE].size
                && this._value.every((entry, index)=>{
                        const [key, value] = entry
                          , [oldKey, oldValue] = this[OLD_STATE].value[index]
                          ;
                        return key === oldKey && value === oldValue;
                    }))
            return this[OLD_STATE];

        delete this[OLD_STATE];
        Object.defineProperty(this, '_value', {
            value: Object.freeze(this._value)
          , writable: false
          , configurable: false
        });
        this._updateKeys();
        Object.defineProperty(this, '_keys', {
            value: Object.freeze(this._keys)
          , writable: false
          , configurable: false
        });

        Object.defineProperty(this, _IS_DRAFT_MARKER, {value: false, configurable: false});
        delete this[_OLD_TO_NEW_SLOT];
        Object.freeze(this);
        return this;
    }

    _updateKeys() {
        this._keys.clear();
        for(const index of this._value.keys()) {
            const key = Object.hasOwn(this._value, index)
                ? this._value[index][0]
                : this[_OLD_TO_NEW_SLOT][index][1]
                ;
             this._keys.set(key, index);
        }
    }

    get value() {
        if(this.isDraft)
            throw new Error(`LIFECYCLE ERROR ${this} will only return this.value when immutable/not a draft..`);
        return this._value;
    }

    *[Symbol.iterator]() {
        for(const key of this.ownKeys())
            yield [key, this.get(key)];
    }

    *entries() {
        yield* this;
    }

    get length() {
        return this._value.length;
    }

    get size() {
        return this._value.length;
    }

    hasOwn(key) {
        return this._keys.has(key);
    }
    /**
     * hasDraftFor and getDraftFor are likely only a required interfaces
     * for _BaseContainerModel.
     */
    [_HAS_DRAFT_FOR_PROXY](proxy) {
        if(!this.isDraft)
            return false;

        const index = this[_OLD_TO_NEW_SLOT].findIndex(([,,ownProxy])=>ownProxy===proxy);
        if(index === -1)
            // proxy is disconnected
            return false;

        // May not be a draft at this moment!
        // In that case it may also not yet be in this._value.
        const [/*key*/, item] = Object.hasOwn(this._value, index) && this._value[index] || [null, null];
        if(!item || !item.isDraft)
            return false;

        // Item is a draft created here for proxy. We know because
        // the proxy was used to find the index.
        return true;
    }
    [_HAS_DRAFT_FOR_OLD_STATE_KEY](oldKey) {
        if(!this.isDraft)
            return false;
        const [oldIndex, message] = this[OLD_STATE].keyToIndex(oldKey);
        if(oldIndex === null)
            // was not in OLD_STATE
            throw new Error(message);

        const index = this[_OLD_TO_NEW_SLOT].findIndex(([,ownOldKey])=>ownOldKey===oldKey);
        if(index === -1)
            // proxy is disconnected
            return false;

        // May not be a draft at this moment!
        // In that case it may also not yet be in this._value.
        const [/*key*/, item] = Object.hasOwn(this._value, index) && this._value[index] || [null, null];
        if(!item || !item.isDraft)
            return false;

        // Item is a draft created here for key. We know because
        // the key was used to find the index.
        return true;
    }

    [_GET_DRAFT_FOR_OLD_STATE_KEY](oldKey) {
        // key must be in this[OLD_STATE]!
        // draft will be for this[OLD_STATE].get(key).getDraft()
        if(!this.isDraft)
            // required: so this can be turned into a draft on demand
            throw immutableWriteError(new Error(`IMMUTABLE WRITE ATTEMPT `
                +`${this}${_GET_DRAFT_FOR_OLD_STATE_KEY}(${oldKey}) is immutable, not a draft.`));

        const [oldIndex, message] = this[OLD_STATE].keyToIndex(oldKey);
        if(oldIndex === null)
            // was not in OLD_STATE
            throw new Error(message);

        const index = this[_OLD_TO_NEW_SLOT].findIndex(([,ownOldKey])=>ownOldKey===oldKey);
        if(index === -1)
            // The item associated with oldIndex is no longer part of this
            // object, the proxy is disconnected.
            return false;

        let kvItem = Object.hasOwn(this._value, index) && this._value[index];
        if(!kvItem) {
            const item = this[OLD_STATE].get(oldKey);
            kvItem = [oldKey, item];
        }
        const [key, item] = kvItem;
        if(item.isDraft)
            // We already created the connection between
            // index and oldIndex, we found index via oldKey,
            // item belongs to oldIndex.
            return item;
        const draft = item.getDraft();
        this._value[index] = Object.freeze([key, draft]);
        return draft;
    }

    /**
     * Raises KeyError if key is not available.
     * Raises ImmutableWriteError if this is not a draft.
     * Returns False, if draft is not natively created by this function
     * i.e. set from the outside.
     * Returns a draft for key otherwise.
     * this is likely only for _BaseContainerModel
     */
    [_GET_DRAFT_FOR_PROXY](proxy) {
        if(!this.isDraft)
            throw immutableWriteError(new Error(`IMMUTABLE WRITE ATTEMPT `
                +`${this} is immutable, not a draft in ${_GET_DRAFT_FOR_PROXY}.`));

        const index = this[_OLD_TO_NEW_SLOT].findIndex(([,,ownProxy])=>ownProxy===proxy);
        if(index === -1)
            // proxy is disconnected
            return false;

        let kvItem = Object.hasOwn(this._value, index) && this._value[index];
        if(!kvItem) {
            const [/*oldIndex*/, key] = this[_OLD_TO_NEW_SLOT][index]
                // assert key is there, otherwise this will raise a Key Error
                // also, if oldIndex got removed from _OLD_TO_NEW_SLOT there
                // must be an item in this._value or the proxy is disconnected.
              , item = this[OLD_STATE].get(key)
              ;
            kvItem = [key, item];
        }
        const [key, item] = kvItem;
        if(item.isDraft)
            // since we found it via proxy, item belongs to it.
            // assert this._value[index] === item
            return item;
        const draft = item.getDraft();
        this._value[index] = Object.freeze([key, draft]);
        return draft;
    }

    getDraftFor(key, defaultReturn=_NOTDEF) {
        const proxyOrDraft = this.get(key, defaultReturn);
        if(_PotentialWriteProxy.isProxy(proxyOrDraft))
            return this[_GET_DRAFT_FOR_PROXY](proxyOrDraft);
        return proxyOrDraft;
    }

    get(key, defaultReturn=_NOTDEF) {
        const [index, message] = this.keyToIndex(key);
        if(index === null) {
            if(defaultReturn !== _NOTDEF)
                return defaultReturn;
            throw new Error(message);
        }

        if(!this.isDraft)
            return this._value[index][1];

        // Can be a draft or immutable e.g. via set(index, element)
        let item = Object.hasOwn(this._value, index) && this._value[index][1];
        if(!item) {
            // If there's no item in value[index] yet, oldIndex will exist.
            // FIXME: I guess I could rather just use: this[OLD_STATE].get(key)
            //        instead of taking this discourse. Of course:
            //              assert oldKey === key
            //              assert oldKey === this[OLD_STATE].keyToIndex(key)[0]
            //        In that case this[_OLD_TO_NEW_SLOT] could be simplified
            //        as there would be no need to carry oldIndex around!
            const [oldIndex, /*oldKey*/, proxy] = this[_OLD_TO_NEW_SLOT][index];
            if(proxy)
                // Important, otherwise we could create the proxy multiple
                // times and override the older versions.
                return proxy;
            // KeyError if the assumption is wrong, this would require
            // fixing in here!
            // Is always immutable.
            item = this[OLD_STATE].getIndex(oldIndex);
        }

        // The function understands if item is already a draft
        // and does not proxify item in that case.
        const proxyOrDraft = _PotentialWriteProxy.create(this, item);
        if(_PotentialWriteProxy.isProxy(proxyOrDraft))
            // it's a proxy
            this[_OLD_TO_NEW_SLOT][index][2] = proxyOrDraft;
        // else: It is a draft already and the draft is at this._value[index];
        return proxyOrDraft;
    }

    keyToIndex(key) {
        if(!this._keys.has(key))
            return [null, `KEY ERROR "${key}" not found.`];
        return [this._keys.get(key), null];
    }

    indexToKey(searchIndex) {
        let index = parseInt(searchIndex, 10);
        if(isNaN(index))
            return [null, `KEY ERROR can't parse "${searchIndex}" as integer.`];
        if(index < 0)
            // like Array.prototype.at
            index = index + this._value.length;
        if(index < 0 || index >= this._value.length)
           return [null, `KEY ERROR NOT FOUND index "${searchIndex}" is not an index (= ${index})`
                       + ` (index > 0 && index < ${this._value.length}.`];

        const key = Object.hasOwn(this._value, index)
            ? this._value[index][0]
            : this[_OLD_TO_NEW_SLOT][index][1]
            ;
        return [key, null];
    }

    getIndex(index, defaultReturn=_NOTDEF) {
        const [key, message] = this.indexToKey(index);
        if(key === null) {
            if(defaultReturn !== _NOTDEF)
                return defaultReturn;
            throw new Error(message);
        }
        // via get as the single point of reading
        // also important so far to have a single point for the proxy
        // _GET_DRAFT_FOR_OLD_STATE_KEY mechanics, i.e. the result of `get`
        // will be wrapped into the proxy using the `key` argument.
        return this.get(key, defaultReturn);
    }

    ownKeys() {
        return this._keys.keys();
    }

    // This method can be handy for the arraySplice method.
    indexOfKey(key) {
        return this.has(key) ? this._keys(key) : -1;
    }

    indexOf(item, fromIndex) {
        // If fromIndex >= array.length, the array is not searched and -1 is returned.
        if(fromIndex >= this._value.length)
            return -1;

        // Negative index counts back from the end of the array —
        // if fromIndex < 0, fromIndex + array.length is used.
        // Note, the array is still searched from front to back in this case.
        if(fromIndex < 0)
            fromIndex = fromIndex + this._value.length;

        // If fromIndex < -array.length or fromIndex is omitted, 0
        // is used, causing the entire array to be searched.
        if(fromIndex === undefined || fromIndex < 0)
            fromIndex = 0;

        const searchArray = fromIndex === 0
            ? this._value
            : this._value.slice(fromIndex)
            ;
        let result = searchArray.findIndex(([, myItem])=>myItem === item);
        if(result !== -1 && fromIndex)
            result = result + fromIndex;
        return result;
    }
    /**
     * As a one stop solution, this cleans this._value and rebuilds
     * all of this._keys. Duplicate keys will be removed.
     * As entries can override existing keys but also existing keys
     * can override entries that are inserted before the existing entries
     * with the same keys, this can be a bit complex.
     * In general, this will keep the keys that end up later in the
     * array after insertion and remove the others.
     * Similar like Object.fromEntries([['a',1], ['a', 2], ['a', 3]])
     * will create: {'a': 3}.
     */
    arraySplice(index, deleteCount, ...entries) {
        if(!this.isDraft)
            // FIXME: for the potential write proxy, it becomes very
            // interesting trying to write many entries.
            // Also interesting for that when trying to write no entries and just removing stuff.
            throw immutableWriteError(new Error(`NOT DRAFT ERROR: ${this} can't call arraySplice when not in draft phase.`));

        const _entries = entries.map(kv=>Object.freeze(kv.slice())) // defensive copy of the k,v pairs
          , deleted = this._value.splice(index, deleteCount, ..._entries.map(
                kvItem=>{
                    const unwrapped = unwrapPotentialWriteProxy(kvItem[1]);
                    if(kvItem[1] !== unwrapped)
                        return [kvItem[0], unwrapped];
                    return kvItem;
                }
            ));
        // Replaces [index, key, proxy] by empty arrays, disconnecting proxies
        this[_OLD_TO_NEW_SLOT].splice(index, deleteCount, ...new Array(entries.length).fill(null).map(()=>[]));
        // We can have duplicate keys in entries and we can have
        // duplicate keys in this._value already.
        const seen = new Set()
          , deletedOnInsert = []
          ;

        for(let i=this._value.length-1; i>=0;i--) {
            let kv = Object.hasOwn(this._value, i)
                ? this._value[i]
                  // Can use this[OLD_STATE].value because this[OLD_STATE]
                  // is immutable.
                : this[OLD_STATE].value[this[_OLD_TO_NEW_SLOT][i][0]]
                ;
            let [key, /*value*/] = kv;
            if(seen.has(key)) {
                // remove duplicate
                deletedOnInsert.push(...this._value.splice(i, 1));
                // also disconnect these proxies
                this[_OLD_TO_NEW_SLOT].splice(i,1);
                continue;
            }
            seen.add(key);
            if(!Object.isFrozen(kv))
                // defensive copy
                this._value[i] = Object.freeze(kv.slice());
        }
        // We iterated backwards, this is a better order.
        deletedOnInsert.reverse();
        deleted.push(...deletedOnInsert);
        this._updateKeys();
        return deleted;
    }

    splice(startKey, deleteCount, ...entries) {
        const [index, message] = this.keyToIndex(startKey);
        if(index === null)
            throw new Error(message);
        return this.arraySplice(index, deleteCount, ...entries);
    }

    // This method will push undefined keys to the end.
    set(key, newEntry) {
        const [index, /*message*/] = this.keyToIndex(key);
        // replace or append
        this.arraySplice(index === null ? Infinity : index, 1, [key, newEntry]);
    }

    delete(key) {
        const [index, /*message*/] = this.keyToIndex(key);
        if(index === null)
            return;
        return this.arraySplice(index, 1)[0];
    }

    // append, add to end
    push(...entries) {
        this.arraySplice(Infinity, 0, ...entries);
        return this.size;
    }
    // add to front
    unshift(...entries) {
        this.arraySplice(0, 0, ...entries);
        return this.size;
    }
    // remove from end
    pop() {
        return this.arraySplice(-1, 1)[0];
    }
    // remove from front
    shift() {
        return this.arraySplice(0, 1)[0];
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
        Object.defineProperty(this, '_value', {
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
        return new this(null);
    }

    metamorphose() {
        // compare
        if(this[OLD_STATE] && this[OLD_STATE].value === this._value)
            // Has NOT changed!
            return this[OLD_STATE];

        // Has changed!
        delete this[OLD_STATE];
        Object.defineProperty(this, '_value', {
            // Not freezing/changing this._value as it is considered "outside"
            // of the metamodel realm i.e. it's not a _BaseModel or part of
            // it, it can be any javascript value. Freezing it would have
            // undesirable side effects, e.g. breaking other libraries, and
            // almost no meaning for object immutability, unless some sort
            // of deepFreeze is performed.
            value: this._value
          , writable: false
          , configurable: false
        });
        Object.defineProperty(this, _IS_DRAFT_MARKER, {value: false, configurable: false});
        // Is this applied by the parent? I expect yes.
        Object.freeze(this);
        return this;
    }

    get value() {
        // if(!this.isDraft)
        //    throw new Error(`LIFECYCLE ERROR ${this} will only return this.value when immutable/not a draft..`);
        // This will acturally return this._value despite of not beeing
        // immutable. this._value is never made immutable so it can always
        // be manipulated anyways.
        return this._value;
    }

    // This has potential of being a good method for sub-classes to override.
    set value(value) {
        if(!this.isDraft)
            // required: so this can be turned into a draft on demand
            throw immutableWriteError(new Error(`IMMUTABLE WRITE ATTEMPT `
                +`${this} is immutable, not a draft, can't set value.`));
        this._value = value;
    }

    set(value) {
        this.value = value;
    }
    get(){
        return this.value;
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
        for(const [key, entry] of state)
            for(const [value, ...path] of getAllPathsAndValues(entry))
                yield [value, key, ...path];
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

export function* _getAllEntries(state, path) {
    const pathInstance = (typeof path === 'string' ? Path.fromString(path) : path);
    let current = state;
    yield current; // for the empty path
    for(let pathPart of pathInstance) {
        current = getEntry(current, pathPart);
        yield current;
    }
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


export function applyTo(state, path, methodNameOrFn, ...args) {
    const pathInstance = (typeof path === 'string' ? Path.fromString(path) : path)
      , entry = getEntry(state, pathInstance)
      ;
    // should probably store ForeignKeys still as BaseModel!
    console.log(`... at path ${path} applyEntry ${entry} method ${methodNameOrFn}:`, ...args);
    // how to change a non-container entry? => There's a set(value) method.
    // it basically has no methods to change!
    if(typeof methodNameOrFn === 'function')
        return methodNameOrFn(entry, ...args);
    else
        return entry[methodNameOrFn](...args);
}

export function pushEntry(state, path, ...entries) {
    return applyTo(state, path, 'push', ...entries);
}

export function popEntry(state, path) {
    return applyTo(state, path, 'pop');
}

export function spliceEntry(state, path, start, deleteCount, ...items) {
    return applyTo(state, path, 'splice', start, deleteCount, items);
}

export function deleteEntry(state, path, key) {
    return applyTo(state, path, 'delete', key);
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

    if(oldState.isDraft || newState.isDraft)
        throw new Error(`TYPE ERROR oldState ${oldState} and `
                + `newState ${newState} must not be drafts.`);


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
        for(const [key, oldEntry] of oldState.allEntries()) {
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

        for(const [newKey, newEntry] of newState) {
            const startIndex = seen.get(newEntry)
              , [newIndex, /*message*/] = newState.keyToIndex(newKey)
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
            // there's a entry of newState in oldState at oldIndex
            oldFoundIndexes.add(oldIndex);
        }
        for(const [newKey/*, newEntry*/] of newState) {
            const [newIndex, /*message*/] = newState.keyToIndex(newKey);
            if(newOrder[newIndex] !== undefined)
                continue;
            // Not found in oldState, filling empty slots in newOrder
            // I'm not sure we even need to distinguish betwenn NEW and CHANGED
            // as both mean the content is different.
            newOrder[newIndex] = (newIndex >= oldState.length
                                    // marked as MOVED, otherwise it would be in newOrder already
                                    // i.e. newState.splice(2, 0, newEntry)
                                    // now the index at 2 is NEW
                                    // and the index at 3 is [MOVED, 2]
                                    || oldFoundIndexes.has(newIndex))
                                ? [NEW]
                                    // i.e. newState.splice(2, 1, newEntry)
                                    // now the index at 2 is NEW
                                    // and the oldEntry is gone
                                    // => CHANGED is like DELETED + NEW
                                : [CHANGED]
                                ;
        }
        // FIXME: Could fill the differnce in length of newOrder with DELETED
        // not sure this is required, as newOrder.length is good and
        // similar information, but it gets destroyed by this:
        // newOrder.push(...new Array(Math.max(0, oldState.length - newOrder.length)).fill(DELETED));
        // could do: newOrder.newStateLength = newState.length
        Object.freeze(newOrder);
        yield [LIST_NEW_ORDER, newOrder];
        for(const [index, [status, /*oldIndex*/]] of newOrder.entries()) {
            const key = index.toString(10);
            if(status === EQUALS || status === MOVED || status === NEW) {
                // EQUALS: nothing to do.
                // MOVED: not compared, listener must reorder according to newOrder.
                // could also be treated like NEW by the UI
                // NEW: Item at index requires a new UI or such, there's nothing to compare.
                yield [status, null, key];
                continue;
            }
            if(status === CHANGED) {
                // There's already an item at that index, so we compare:
                const oldEntry = oldState.get(index)
                 , newEntry = newState.get(index)
                 ;
                for(const [result, data, ...pathParts] of rawCompare(oldEntry, newEntry))
                    yield [result, data, key, ...pathParts];
                continue;
            }
            throw new Error(`Don't know how to handle status ${status}`);
        }
        return;
    }
    // NOTE: _AbstractOrderedMapModel could also be compared similar
    //       to _AbstractListModel above, however, it's not clear if
    //       we should rather compare by key/value pairs as value or
    //       as the payload value as value. Maybe a use cse will come up
    //       we will see then. In general it would be possible to produce
    //       both comparison styles, as a list and as a map.
    if(oldState instanceof _AbstractOrderedMapModel
            /* || oldState instanceof _AbstractMapModel*/) {
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
            console.log(`    ${status}: ./${path} ;;`);
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

