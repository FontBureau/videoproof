/* jshint esversion: 11, browser: true, unused:true, undef:true, laxcomma: true, laxbreak: true, devel: true */

import opentype from '../../opentype.js/dist/opentype.module.js';
import woff2decompress from './wawoff2/decompress.mjs';
import {zip, deepFreeze} from './util.mjs';
import { VideoProofFont, FontOriginUrl, FontOriginFile} from './model/font.mjs';
// import {init as initExample} from './layouts/exmple.mjs';
import DOMTool from './domTool.mjs';

import { MainUIController } from './ui/general.mjs';

import {
    Path
  , compare
  , compareToLog
  , getAllPathsAndValues
  , COMPARE_STATUSES
  , getModel // (RootModel, path) => Model
  , applyTo
  , getEntry
} from './metamodel2.mjs';


import {
    ApplicationModel // as ApplicationModel
  , ExampleLayoutModel
  , FontModel
  , AvailableFontsModel
  , AvailableLayoutModel
  , AvailableLayoutsModel
} from './model.mjs';

export class VideoproofController {
    /**
     * contentWindow: a DOM.window that will contain the page content, i.e.
     * the proofs, where the font's are applied, it can be different to the
     * uiWindow, which holds the main controller UI.
     */
    constructor(contentWindow) {
        // FIXME: which window to use per case
        //        also, use domTool!
        this._contentWindow = contentWindow;
        Object.defineProperty(this, 'appReady', {value: false, configurable: true});
        this.state = null;
        this.draftState = null;
        this._nestedChangeStateCount = 0;
        this._lockChangeState = null;

        this._domTool = new DOMTool(contentWindow.document);
        this._charGroups = null;

        this._ui = null;// TODO: improve these apis!

        this.availableFontsDraft = null;
        this._getAvailableFontsDraft();

        this._externalInitialDependencies = new Map();
        function _setResolvers(key, resolve, reject) {
            // jshint validthis: true
            if(this._externalInitialDependencies.has(key))
                throw new Error(`KEY EXISTES ${key} in _externalInitialDependencies.`);
            this._externalInitialDependencies.set(key, {resolve, reject});
        }
        let _externalPromises = [];
        for(let key of ['ready'])
            _externalPromises.push([key, new Promise(_setResolvers.bind(this, key))]);

        // Only allow this once, to resolve the race conditon, later
        // the loadFontsFromUrls interface should be exposed explicitly;
        let exhaustedInterfaceError = ()=>{
            throw new Error('EXHAUSTED INTERFACE: remoteResources');
        };

        let initialResourcesPromise
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

        let loadInitialResourcesFromFetchPromises = this._loadInitialResourcesFromFetchPromises.bind(this, ..._externalPromises);

        if(remoteResourcesAvailable) {
            initialResourcesPromise = loadInitialResourcesFromFetchPromises(...contentWindow.remoteResources);
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
            initialResourcesPromise = new Promise((_resolve, _reject)=>{
                resolve = _resolve;
                reject = _reject;
            });
            contentWindow.remoteResources = {push: (...promises)=>{
                contentWindow.clearTimeout(rejectTimeout);
                resolve(loadInitialResourcesFromFetchPromises(...promises));
                contentWindow.remoteResources.push=exhaustedInterfaceError;
            }};
        }

        Promise.all([initialResourcesPromise])
               .then((results)=>this._allInitialResourcesLoaded(...results))
               .catch(error=>this.uiReportError('VideoproofController constructor initial resources', error));
    }

    _getAvailableFontsDraft() {
        // after use:
        // this.availableFontsDraft = null;
        if(this.availableFontsDraft === null) {
            this.availableFontsDraft = [0, this.state // initially there's no state
                ? this.state.dependencies.availableFonts.getDraft()
                : AvailableFontsModel.createPrimalDraft({})
                ];
        }
        this.availableFontsDraft[0] += 1;
        return this.availableFontsDraft;
    }

    _availableFontsDraftToState() {
        if(this.availableFontsDraft === null)
            // There's a reference counter to resolve this, shouldn't happen.
            throw new Error(`Call to _availableFontsDraftToState but this.availableFontsDraft is null`);
        this.availableFontsDraft[0] -= 1;
        if(this.availableFontsDraft[0] > 0)
            return;
        const availableFonts = this.availableFontsDraft[1].metamorphose({});
        this.availableFontsDraft = null;
        if(this.draftState)
            // Not sure what this implies!
            console.error('Looks like there shouldn\'t be a this.draftState when running this, but there is!');
        const draft = this.draftState
            ? this.draftState
            : this.state.getDraft()
            ;
        // activate the last entry
        draft.get('activeFontKey').value = availableFonts.indexToKey(-1)[0];
        this._updateState(draft.metamorphose({availableFonts}));
    }

    _allInitialResourcesLoaded(resources) {
        if(this.appReady)
            throw new Error('_allInitialResourcesLoaded must run only once.');
        Object.defineProperty(this, 'appReady', {value: true});
        console.log('_allInitialResourcesLoaded resources:', ...resources.keys(), resources);
        // No initial font available. Could be a legitimate deployment of this App.
        // However, we would have to change the model.
        //
        // Eventually the FontsModel must be initialuzed in the Model, even
        // though it doesn't matter in this case, it's the right thing to
        // do, there should be one recommended way to do things!
        //
        // charGroups should be part of the model, but I keep it external
        // to see where it leads! Also, it's not meant to change, so that
        // should be fine, and, if it changes, there's a way planned to
        // update the model when external dependencies change...
        console.log('AvailableFontsModel.Model.dependencies:', AvailableFontsModel.Model,AvailableFontsModel.Model.dependencies);
        console.log('AvailableFontsModel.dependencies:', AvailableFontsModel.dependencies);
        console.log('ApplicationModel.dependencies:', ApplicationModel.dependencies);

        this.availableFontsDraft[0] -= 1;
        // Whatever the current counter is, we got to finish bootstrapping
        // and take the snapshot we currently have. It's very unlikely that
        // other methods are already loading fonts, as the bootstrapping
        // did not register any UI yet.
        const availableFonts = this.availableFontsDraft[1].metamorphose({});
        if(this.availableFontsDraft[0] <= 0)
            this.availableFontsDraft = null;

        // At some point it will be good to be able to load layouts
        // dynamically, on demand, as plug ins, but for the basic staff
        // we just start with hard coded layouts.
        const availableLayout = AvailableLayoutModel.createPrimalDraft({})
          , availableLayoutsDraft = AvailableLayoutsModel.createPrimalDraft({})
          ;
        availableLayout.get('typeClass').value = ExampleLayoutModel;
        availableLayout.get('label').value = 'Example Layout';
        availableLayoutsDraft.push(
            [ExampleLayoutModel.constructor.name, availableLayout]
        );
        const availableLayouts = availableLayoutsDraft.metamorphose({});
        this.state = ApplicationModel.createPrimalState({availableFonts, availableLayouts});

        // returns true if state was restored successfully
        // this._loadStateFromLocationHash();

        // this runs after restoring state, so we don't build the wrong
        // UI initiallly.

        this._lockChangeState = '_allInitialResourcesLoaded';
        try {
            this._initUI(resources.get('charGroups'));
        }
        finally {
            this._lockChangeState = null;
        }
    }

    // This is basically only to ensure the document is loaded and ready
    // to be queried/changed, there's no other use case, expecting
    // the main program to call setInitialDependency('ready', true);
    setInitialDependency(key, value) {
        let dependency = this._externalInitialDependencies.get(key);
        if(!dependency)
            throw new Error(`KEY NOT FOUND setInitialDependency: ${key}`);
        // Resolving a seccond time doesn't do anything, the value of the
        // first time stays valid, but it hints to a programming issue.
        // Deleting here will make the second resolving of key fail with
        // an error.
        this._externalInitialDependencies.delete(key);
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

        if(this.availableFontsDraft[1].has(font.fullName)) {
            // TODO: there's already handling for this conflict in the
            // TypeRoof version which must ported to here.
            throw new Error(`FONT ALREADY REGISTERED: ${font.fullName}`);
        }
        let fullName = font.fullName;
        fontFace.family = fullName;
        await contentDocument.fonts.add(fontFace);
        const fontState = FontModel.createPrimalDraft({});
        fontState.value = font;
        // no need to metamorphose fontState here, will happen along
        // with availableFontsDraft.metamorphose()
        this.availableFontsDraft[1].set(font.fullName, fontState);
        return font.fullName;
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
        if (!response.ok)
            throw new Error(`HTTP error! Status: ${ response.status }`);
        const origin = new FontOriginUrl(response.url)
          , { document } = this._contentWindow
          , fontBuffer = await response.arrayBuffer()
          ;
        return this._loadFont(fontBuffer, origin, document);
    }

    async _loadFontFromFile(file) {
        const origin = new FontOriginFile(file.name)
          , { document } = this._contentWindow
          , fontBuffer = await file.arrayBuffer()
          ;
        return this._loadFont(fontBuffer, origin, document);
    }

    // TODO: this is the last error handler and it's not very well made.
    uiReportError(callerId, error) {
         console.error(`via ${callerId}:`, error);
         // FIXME
         alert(`via ${callerId}:${error}`);
        // DO?
        // throw(error);
    }

    // Runs when the ui can be build, but does not require resources like
    // the fonts to be available yet.
    _initUI({charGroups}) {
        // keeping this as it is triggered when the dependencies are loaded
        // dependencies, in this case, being the charGroups

        console.log('_initUI', {charGroups}, );
        for(const [state, ...path] of getAllPathsAndValues(this.state))
            console.log('-', path.join('/'), `::: ${state}`);

        this._ui = new MainUIController({
            domTool: this._domTool
          , rootPath: '/'
          , withChangeState: this.withChangeState.bind(this)
            // If not called from within withChangeState state will be an
            // immutable and making it a draft won't have an effect
            // on the app state.
          , getEntry: path=>getEntry(this.draftState || this.state, path)
          , loadFontsFromFiles: this.loadFontsFromFiles.bind(this)
        });
        // NOTE: initially all dependencies have changed from the perspective
        // of the UI. Later, we must do a similar thing when widget controllers
        // are initialized after change (or any UI element), however, this should
        // probably be handled by the MainUIController, which thus needs access to
        // the current root state (root from it's own perspective).
        const changedMap = new Map();
        console.log('this._ui', this._ui);
        for(let path of this._ui.dependencies) {
            const entry = getEntry(this.state, path);
            changedMap.set(path, entry);
        }
        this._ui.update(changedMap);
    }

    /* command is:
     * [rootPath, method, ...arguments]
     *
     * This is basically wrapping a transaction. And the transaction
     * contains the new draft as the root state (this.draftState)
     * Which will be the base for the getEntry API injected into the
     * UI.
     * It's allowed to call withChangeState in a nested fashion. It
     * uses a depth counter to update state only once, after all
     * calls have finished.
     * I wonder if there's any use in making the async and then
     * await fn() ..., the this._nestedChangeStateCount should
     * probably guard (raise if > 0) within _updateState, to make
     * sure everything happens in order. Also, external dependencies
     * that are loaded out of band would have to adhere to that pulse
     * as well.
     */
    withChangeState(fn) {
        if(!this.appReady) {
            console.warn(`withChangeState: App not yet ready to change state.`);
            return false;
        }
        if( this._lockChangeState !== null )
            // This is a programming error, nothing a user should ever face.
            throw new Error('LOCK ERROR changeState is locked with the lock labeled: ${this._lockChangeState}.');

        console.log(`${this.state} changeState...`);


        if(this.draftState === null)
            // assert this._nestedChangeStateCount === 0
            this.draftState = this.state.getDraft();
        this._nestedChangeStateCount += 1;
        const draft = this.draftState;
        try {
            fn();
        }
        finally {
            this._nestedChangeStateCount -= 1;
            if(this._nestedChangeStateCount > 0)
                return;
            else
                this.draftState = null;
        }
        this._updateState(draft);
    }

    _updateState(immutableOrDraft) {
        const state = immutableOrDraft.isDraft ? immutableOrDraft.metamorphose() : immutableOrDraft;
        if(state === this.state)
            return;
        console.log('new app state', state);
        if(state.constructor !== this.state.constructor)
            throw new Error(`TYPE ERROR types don't match state is ${state} but this.state is ${this.state}.`);
        // get change information
        console.log('compareToLog!');
        const compareResult = [...compare(this.state, state)];
        compareToLog(compareResult);
        this.state = state;

        // TODO: Document!
        // COMPARE_STATUSES:
        // EQUALS CHANGED NEW DELETED MOVED LIST_NEW_ORDER

        const {EQUALS, CHANGED, NEW, DELETED, MOVED, LIST_NEW_ORDER} = COMPARE_STATUSES
          , notImplemented = new Set([NEW, DELETED, MOVED, LIST_NEW_ORDER])
          , changedMap = new Map()
          ;
        for(const [status, data, pathInstance] of  compareResult) {
            const path = pathInstance.toString();
            console.log('status: '+status, path + '', 'data:', data);
            if(status === LIST_NEW_ORDER) {
                console.warn(`NOT IMPLEMENTED update LIST_NEW_ORDER`);
                // TODO: there's no fine grained list update yet!
                continue;
                // console.log(`    ${status}: ${path} ;;`);
                // for(let [i, [st, ...val]] of data.entries())
                //     console.log(`        #${i} ${st} data:`, ...val, ';;');
            }
            else if(notImplemented.has(status)) {
                // e.g. interesting for maps!
                console.warn(`NOT IMPLEMENTED update ${status} @${path}`);
                if(status === DELETED)
                    continue;
                // bound to fail, esp. for DELETED ...
                const entry = getEntry(this.state, path);
                changedMap.set(path, entry);
            }
            else if(status === CHANGED) {
                console.log(`${status}`, path, data);
                if(path === '') {
                    // root changed, always keep!
                }
                if(!this._ui.dependencies.has(path))
                    // nobody is listening
                    continue;
                if(changedMap.has(path))
                    // seen, for some reason (I think this doesn't happen)
                    continue;
                const entry = getEntry(this.state, path);
                changedMap.set(path, entry);
            }
            else if(status === EQUALS)
                continue;
            else
                throw new Error(`NOT IMPLEMENTED ERROR change staus ${status}`);
        }
        // FIXME: missed root! ???
        if(!changedMap.size)
            return;
        console.log('state has changed!', changedMap, ...changedMap.keys());
        // inform users
        // CAUTION: changeState must not be called in the update phase
        this._lockChangeState = 'changeState';
        try {
            this._ui.update(changedMap);
        }
        finally {
            this._lockChangeState = null;
        }
    }

    async loadFontsFromFiles(...files) {
        this._getAvailableFontsDraft();
        return Promise.all(files.map(file=>this._loadFontFromFile( file )))
            .catch(error => this.uiReportError('loadFontsFromFiles', error))
            .finally(()=>this._availableFontsDraftToState());
    }

    async loadFontsFromUrls(...urls) {
        this._getAvailableFontsDraft();
        return Promise.all(urls.map(url=>this._loadFontFromUrl( url )))
            .catch(error => this.uiReportError('loadFontsFromUrls', error))
            .finally(()=>this._availableFontsDraftToState());
    }

    async _loadInitialFontsFromFetchPromises(...promises) {
        const fontsPromises = promises.map(promise=>promise.then(
                    response=>this._loadFontFromFetchResponse(response)));
        return Promise.all(fontsPromises)
            .then(fontFullNames=>{
                // Because we are bootstrapping this.availableFontsDraft
                // is available!
                const availableFontsDraft = this.availableFontsDraft[1]
                  , keyEntriesInOriginalLoadOrder = fontFullNames.map(key=>[key, availableFontsDraft.get(key)])
                  ;
                // Later keys will override earlier keys, so push will create
                // the original order. As long as no other method did write
                // to this, which shouldn't happen in bootstrap, these
                // items will be the first items in order in the map.
                availableFontsDraft.push(...keyEntriesInOriginalLoadOrder);
            })
            .catch(error=>this.uiReportError('_loadInitialFontsFromFetchPromises', error))
            ;
    }

    async _loadJSONFromFetchPromise(promise) {
        const response = await promise
          , data = await response.json()
          ;
        return deepFreeze(data);
    }

    async _loadInitialResourcesFromFetchPromises(...resources) {
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
                    promise = this._loadInitialFontsFromFetchPromises(...byType.get(type));
                    break;
                case 'charGroups':
                    {
                        const promises = byType.get(type);
                        if(promises.length > 1)
                            console.log(`_loadInitialResourcesFromFetchPromises SKIPPING ${promises.length-1} promises of ${type}, expecting only one.`);
                        promise = this._loadJSONFromFetchPromise(promises[0]);
                    }
                    break;
                case 'ready':
                    // We made sure in init to only add one of this.
                    promise = byType.get(type)[0];
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

    reset() {
        // TODO: in Ramp Mode (ManualAxis + MultipleTargets but no
        // animation etc. this shouuld re-init the proof and it's default
        // values ...
        // Also, trigger 'click' on keyFramesContainer.querySelector('li a')
        // is not ideal, as we should reset the value and have the UI follow.
        //
        // Maybe we can define his per Layout
    }
}
