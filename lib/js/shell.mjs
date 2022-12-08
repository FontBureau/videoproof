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
  , COMPARE_STATUSES
  , getModel // (RootModel, path) => Model
  , changeEntry
  , getEntry
} from './metamodel.mjs';


import {
    BootstrapApplicationModel as ApplicationModel
  , FontModel
  , AvailableFontsModel
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
        this._domTool = new DOMTool(contentWindow.document);
        this._charGroups = null;

        this._ui = null;// TODO: improve these apis!

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
        const fonts = resources.get('font')
          , availableFonts = new AvailableFontsModel(fonts.map(font=>[font.value.fullName, font]))
          , state = ApplicationModel.fromEntries({},[['availableFonts', availableFonts]])
          ;
        this.state = state;

        // returns true if state was restored successfully
        // this._loadStateFromLocationHash();

        // this runs after restoring state, so we don't build the wrong
        // UI initiallly.
        this._initUI(resources.get('charGroups'));
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

        if(this.state) {
            const fonts = getEntry(this.state, 'availableFonts');
            if(fonts.has(font.fullName))
                // TODO: this could be resolved by entering a loop that alters
                // font.fullName until the name is free, the font object should
                // have a method to i.e. add a counter to fullName.
                throw new Error(`FONT ALREADY REGISTERED: ${font.fullName}`);
        }
        let fullName = font.fullName;
        fontFace.family = fullName;
        await contentDocument.fonts.add(fontFace);
        // FIXME: FontModel should be created by the Model, because of
        // possible coherence guards and constraints.
        return new FontModel(font);
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

    changeState(commands) {
        if(!this.appReady) {
            console.warn(`changeState: App not yet ready to change state.`);
            return false;
        }
        let state = this._state;
        for(const [path, method, ...args] of commands)
            state = changeEntry(state, path, method, ...args);
        if(state !== this._state) {
            // get change information
            compareToLog(compare(this._state, state));
            this._state = state;

            console.log('changeState: state has changed');
            // inform users
        }
    }

    _registerAndActivateLoadedFonts(...fonts) {
        console.warn('NOT IMPLEMENTED _registerAndActivateLoadedFonts', fonts);
        return;
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

    async _loadInitialFontsFromFetchPromises(...promises) {
        let fontsPromises = promises.map(promise=>promise.then(
                    response=>this._loadFontFromFetchResponse(response)));
        return Promise.all(fontsPromises)
            .catch(error => this.uiReportError('_loadInitialFontsFromFetchPromises', error));
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


    //
    // FIXME: this should be handled external to the shell, fonts should
    //        only be added to the fonts state not directly to the interface.
    _uiAddFontToSelectInterface(font) {
        console.warn('NOT IMPLEMENTED _uiAddFontToSelectInterface:', font);
        return;
        // This is not an issue so far.
        // for(let option of selectFonts.querySelectorAll('option')) {
        //     if(option.value === fontName)
        //         return;
        // }
    //    let { selectFonts } = this._ui
    //      , doc = selectFonts.ownerDocument
    //      , option = doc.createElement('option')
    //      , font = this.getFont(fontName)
    //      , optgroupClass = `optgroup-${font.origin.type}`
    //      , optgroup = selectFonts.querySelector(`.${optgroupClass}`)
    //      ;
    //    option.value = fontName;
    //    option.textContent = font.nameVersion;
    //    // The first option is going to be selected. (default anyways)
    //    if(selectFonts.options.length === 0)
    //        option.selected = true;
    //
    //    if(optgroup === null) {
    //        optgroup = doc.createElement('optgroup');
    //        optgroup.classList.add(optgroupClass);
    //        switch(font.origin.type) {
    //            case 'from-url':
    //                optgroup.label ='Included fonts';
    //                break;
    //            case 'from-file':
    //                optgroup.label = 'Your lokal fonts';
    //                break;
    //            default:
    //                optgroup.label = `Origin: ${font.origin.type}`;
    //        }
    //        // TODO: insert in alphabetical order
    //        selectFonts.append(optgroup);
    //    }
    //    // TODO: insert in alphabetical order
    //    optgroup.append(option);
    }

    // Runs when the ui can be build, but does not require resources like
    // the fonts to be available yet.
    async _initUI({charGroups}) {
        // keeping this as it is triggered when the dependencies are loaded
        // dependencies, in this case, being the charGroups

        console.log('_initUI', {charGroups});

        this._ui = new MainUIController(this._domTool);
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

    activateFont(fontName) {
        // Run only when all dependencies are loaded.
        if(!this.appReady) {
            console.warn(`activateFont: App not yet available for activating ${fontName}.`);
            return false;
        }
        console.warn(`NOT IMPLEMENTED activateFont ${fontName}`);
    }
}
