/* jshint browser: true, esversion: 9, laxcomma: true, laxbreak: true, unused:true, undef:true */



function promiseWrap(eventTarget) {
    return new Promise((resolve, reject)=>{
        eventTarget.onsuccess = resolve;
        eventTarget.onerror = reject;
    });
}


function promiseWrapOpenDBRequest(dbOpenRequest, onUpgradeNeededHandler) {
    return new Promise((resolve, reject)=>{
        dbOpenRequest.onsuccess = evt=>resolve(evt.target.result);
        dbOpenRequest.onerror = reject;

        // If the below all end up in either onsuccess or onerror
        // we can put them in init and use just promiseWrap.
        //
        // Fired when an open connection to a database is blocking a
        // versionchange transaction on the same database.
        // Also available via the onblocked property.
        dbOpenRequest.onblocked = evt=>{
            reject(evt);
        };
        // Fired when an attempt was made to open a database with a
        // version number higher than its current version. Also available
        // via the onupgradeneeded property.
        // If this fails, is onerror fired?
        // If this succeeds is onsuccess fired? => it says so at mdn!
        dbOpenRequest.onupgradeneeded = evt=>onUpgradeNeededHandler(evt);
    });
}


export default class LocalFontStorage {
    // Trying to create an object store with a name that already exists
    // (or trying to delete an object store with a name that does not
    // already exist) will throw an error.
    //
    // If the onupgradeneeded event exits successfully, the onsuccess
    // handler of the open database request will then be triggered.
    static _onUpgradeNeededHandler(event) {
        const db = event.target.result;
        // prefer if I don't need this!
        // will the promise receive this issue
        db.onerror = event => console.warn(`CAUTION: _onUpgradeNeeded onerror: ${event}. IS this handler required?`);
        // Create an objectStore for this database
        // will have a blob and `fullName`, where fullName equals
        // VideproofFont.fullName which is used as the unique id for
        // the available fonts.
        // 'nameVersion' which is used as the label.
        // `serializationNameParticles` => required to know if the font matches the serialized font
        /*const objectStore = */

        // Raises directly e.g.: Uncaught DOMException: IDBDatabase.createObjectStore: Object store named 'fonts' already exists at index '0'
        db.createObjectStore('fonts', { keyPath: 'fullName' });
        // could create another store with the same name right away to
        // see how and where this fails.
    }

    static init(window) {
        const dbOpenRequest = window.indexedDB.open("LocalFontStorage", 1)
          , promise = promiseWrapOpenDBRequest(dbOpenRequest, this._onUpgradeNeededHandler)
          ;

        return promise.then((db)=>{
            // const db = evt.target.result;
            // TODO: also load the initial list of fonts {fullName, nameVersion}
            // new this(db)
            // return this.loadFontList() // would store fontList, so could return promise(db)
            return new this(db);
        })
        .catch(errorEvt=>{

            // Can be something cryptic like: LocalFontStorage init failed with [object Event]:
            // event.type = 'error' in this case
            // In FireFox in private browsing, this fails currently!
            // However, in private browsing there's no persistence anyways.
            // We could just fake the API.?
            const message = `${this.name} init failed.`;
            console.error(`${message} with ${errorEvt}:`, errorEvt);
            // not handled here so far!
            throw new Error(message);
        });
    }

    constructor(db) {
        this.db = db;
    }

    async put(font) {
        const request = this.db.transaction(['fonts'], 'readwrite')
            .objectStore('fonts')
            .put({
                    fullName: font.fullName
                  , nameVersion: font.nameVersion
                  , serializationNameParticles: font.serializationNameParticles
                  , buffer: font.buffer
                  , origin: font.origin.toDB()
                })
          , result = await promiseWrap(request)
          ;
        // This returns just the key, i.e. the same as font.fullName
        return result.target.result;
    }

    async delete(fullName) {
        const request = this.db.transaction(['fonts'], 'readwrite')
            .objectStore('fonts')
            .delete(fullName)
          , result = await promiseWrap(request)
          ;
        // This returns just the key, i.e. the same as font.fullName
        return result.target.result;
    }

    async get (fullName) {
        const request = this.db.transaction(['fonts'], 'readonly')
            .objectStore('fonts')
            .get(fullName)
          , result = await promiseWrap(request)
          ;
        return result.target.result;
    }

    async* getAll() {
        const request = this.db.transaction(['fonts'], 'readonly')
            .objectStore('fonts')
            .openCursor()
          , resolvers = {}
          ;
        // iterate through cursor
        request.onsuccess = event=>{
             const cursor = event.target.result;
             if (cursor) {
               // cursor.value contains the current record being iterated through
               // this is where you'd do something with the result
               // could be an async yield as well!
               resolvers.resolve(cursor.value);
               cursor.continue();
             }
             else
               // no more results
               resolvers.resolve(null);
        };
        request.onerror = event=>resolvers.reject(event);

        while(true) {
            const value = await new Promise((resolve, reject)=>{
                resolvers.resolve = resolve;
                resolvers.reject = reject;
            });
            if(value !== null)
                yield value;
            else
                break;
        }
    }
}
