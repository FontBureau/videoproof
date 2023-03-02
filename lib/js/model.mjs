/* jshint esversion: 11, browser: true, unused:true, undef:true, laxcomma: true, laxbreak: true, devel: true */


import {
        _AbstractStructModel
      // , _AbstractListModel
      //, _AbstractMapModel
      , _AbstractOrderedMapModel
      , _AbstractGenericModel
      , ForeignKey
      , ValueLink
      , BooleanModel
      , NumberModel
      , InternalizedDependency
      , CoherenceFunction
     } from './metamodel2.mjs';


export const FontModel = _AbstractGenericModel.createClass('FontModel')
    // , AxisLocationModel = _AbstractStructModel.createClass('AxisLocationModel'
            //, ['name', StringModel]
            // Used to be NumberOrEmptyModel with the comment:
            // => if null we can fall back to the default
            //    on the other hand, in that case,
            //    the AxisLocationValueModel could be an
            //    AxisLocationOrEmptyValueModel
            //
            // But so far I lack a good case for the OrEmpty stuff.
            // I rather remove that concept completeley.
            // The value here could be a value with validators for the
            // value type etc. and those validators could allow a special
            // type value for the empty case.
            // Further, the coherence functions of this struct can take
            // care of value expectaions.
    //      , ['value', NumberModel]
            // min, max, default => could come from font (dependencies).
    //)
    // Make an _AbstractMapModel, the values wouldn't require a name ... ?
    // Using _AbstractOrderedMapModel as order is relevant information,
    // although, it should probably be taken from the font directly?!
  , AxisLocationsModel = _AbstractOrderedMapModel.createClass('AxisLocationsModel', NumberModel)
  , ManualAxisLocationsModel = _AbstractStructModel.createClass(
        'ManualAxisLocationsModel'
        // requires
        // , [REQUIRES, 'font', 'fontSize'] <= removed from metamodel!
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
      , CoherenceFunction.create(['font', 'fontSize', 'autoOPSZ', 'axisLocations'],
        function sanitizeAxes({font, fontSize, autoOPSZ, axisLocations}) {

            if(autoOPSZ.value === undefined)
                autoOPSZ.value = true;

            // NOT sure with this UI handels this...
            // if(autoOPSZ.value === true) {
            //     // Only works if fontSize has the same type as axisLocations.Model
            //     // so far NumberModel but these things can change!
            //     // axisLocations.set('opsz', fontSize);
            //     const opsz = axisLocations.constructor.Model.createPrimalDraft();
            //     opsz.value = fontSize.value;
            //     axisLocations.set('opsz', opsz);
            // }

            const axisRanges = font.value.axisRanges;
            // axisRanges[axis.tag] {
            //      name /*  'name' in axis ? axis.name.en : axis.tag */
            //    , min, max, default }
            for(const [key, entry] of axisLocations) {
                if(!(key in axisRanges)) {
                    // Remove all keys from `axisLocations` that are
                    // not axes in font!
                    axisRanges.delete(key);
                    continue;
                }
                const {min, max} = axisRanges[key];

                // And make sure existing axes are within the
                // min/max limits.
                entry.value = Math.max(min, Math.min(max, entry.value));

                // The UI must decide to store explicitly data in
                // here or not. If it is not in here, the default
                // value is implicit!.
                // In that case this case should be removed!
                // if(entry.value === defaultVal)
                //     axisRanges.delete(key);
            }
        })// => [name, instance]
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
      , ['autoOPSZ', BooleanModel, /* default true */]
      , ['axisLocations', AxisLocationsModel]
    )
    // , MultipleManualAxisLocationsModel = _AbstractListModel.createClass('MultipleManualAxisLocationsModel', ManualAxisLocationsModel)
  , ExampleLayoutModel = _AbstractStructModel.createClass(
        'ExampleLayoutModel'
        //requires
        // defined by the closest struct! parent that has this key
        // when font changes, this must be updated!
        //
        // This must know font to be able to initialize or validate
        // axisLocations.
        // Ideally, on initialisazion
      , CoherenceFunction.create(['font'/*, 'layout' */ , 'more'],
            function checkFontMore(/*changedSet ???, */dependencies, valueMap) {
                // jshint validthis: true
                // this will be the instance before frozen, maybe we can
                // use this to set up some instance state, e.g. when setting/changing
                // values, having the requirements/dependencoies available would help
                // a lot...
                // valueMap will be validated and frozen after this call,
                // thus, it can change in here, but also, it can be incomplete
                // in here and some values may be missing.
                console.log(`!!!!!!!!!\n${this} coherence method`, 'valueMap items:', ... valueMap.keys());
                console.log('dependencies', dependencies);
            }
        )
        // when we control min/max and precision at this level we'll
        // get a lot from it, could be used to configure a generic
        // number ui
        // NOTE: in grid dimensions step value also has
        //        different requirements depending on stepping style
      , ['fontSize', NumberModel]
      , ['axisLocations', AxisLocationsModel] // not enough, there are also content implications on targets!
    )
    // TODO: will have to accept differnt kinds of LayoutModels, maybe e.g. _BaseLayoutModel as a starter
  , AvailableLayoutsModel = _AbstractOrderedMapModel.createClass('AvailableLayoutsModel', ExampleLayoutModel)
  , AvailableFontsModel = _AbstractOrderedMapModel.createClass('AvailableFontsModel', FontModel)
  , ApplicationModel = _AbstractStructModel.createClass(
        'ApplicationModel'
      , CoherenceFunction.create(['template'/*, 'layout' */],  function checkTemplate(/*changedSet ???, */dependencies, valueMap) {
            console.log(`!!!!!!!!!\n${this} coherence method`,'valueMap items:', ... valueMap.keys());
            console.log('dependencies', dependencies);
        }) // Just one possible syntax for this kind of thing! => [name, instance]

        // owns all assets, like fonts, data files ...
        // AvailableFontsModel entries should also contain a [category, label]
        //      like: "included", "local" ... there should also be a label for these
        //      the order is included, but the UI can choose to reorder, and/or
        //      split into the categories.
      , ['availableFonts', AvailableFontsModel] // ordered map, all of type FontModel
        // FOREIGN KEY like, can be null at least if there's no entry in availableFonts!
      , ['activeFontKey', new ForeignKey('availableFonts', ForeignKey.NOT_NULL, ForeignKey.SET_DEFAULT_FIRST)]
        // would create a depencdency description
        // as well as a forward link.
        // so when the actual font object changes or the key in activeFont
        // changes, everything that depends on "font" should change!
        // consequently, because activeFont can be null. font can be null to.
        // actually, maybe this needs a path in the future, but referencing
        // a Key, this should de-reference to a value!
        // maybe we can rather have
        // Key => key
        // KeyValueLink => [key, value]
        // ValueLink => value
      , ['font', new ValueLink('activeFontKey')] // => provides one FontModel of AvailableFontsModel

      , ['availableLayouts', AvailableLayoutsModel]
      , ['activeLayoutKey', new ForeignKey('availableLayouts', ForeignKey.NOT_NULL, ForeignKey.SET_DEFAULT_FIRST)]
      , ['layout', new ValueLink('activeLayoutKey')]
      /*
        // this is going to be interesting as well
        // AvailableLayoutsModel entries should also contain a category
        //      Works similat like the AvailableFontsModel including
        //      a [category, label]  the data
      , ['availableLayoutsModel', AvailableLayoutsModel]
        // ordered map, all of type LayoutsModel, maybe also something unitinitialized
        // and we initialize ot when it becomes active?
        // We could also keep the last state there, but it would be hard/a lot
        // of work to keep in sync when e.g. fonts change etc, so I prever right now
        // rather just the raw Models, which we initalize on becoming active.
      , ['activeLayoutModel', OneOfTheAvailableLayoytsEnum]
      , ['layoutModel']
      */
    )
  , BootstrapApplicationModel = _AbstractStructModel.createClass(
        'BootstrapApplicationModel'
      , ['availableFonts', new InternalizedDependency('availableFonts', AvailableFontsModel)]
      , CoherenceFunction.create(['fontSize'],  function setDefaults({fontSize}) {
            // Value is undefined in primal state creation.
            // Also, NumberModel, a _AbstractGenericModel, has no defaults or validation.
            if(fontSize.value === undefined) {
                // This is sketchy, font-size is very specific
                // to the actual layout usually.
                fontSize.value = 36;
            }
        })
      , ['activeFontKey', new ForeignKey('availableFonts', ForeignKey.NOT_NULL, ForeignKey.SET_DEFAULT_FIRST)]
      , ['font', new ValueLink('activeFontKey')] // => provides one FontModel of AvailableFontsModel
      , ['fontSize', NumberModel]
      , ['manualAxisLocations', ManualAxisLocationsModel]
    )
  ;



//let [newExmpleLayoutState, changedPaths] = exampleLayoutState.transform(entries);


// One exercise here is to enforce activeTarget to be an index within targets
// when targets is changed, e.g. a pop(), activeTarget must changes as well
// say activeTarget is the last item of targets and we remove the first item
// how to keep activeTarget the last item (second to last etc.)
// It could be kept in sync if it was stored in targets, and maybe just
// be the first actice entry, but to keep that clean, we also need to
// enforce some rules ... (e.g. don't allow multiple actice items in targets)





/*
let exampleLayoutState = ExampleLayoutModel.fromRawValue([
    // => above in ApplicationModel['fonts', applicationFonts]
    // i.e. when font changes, this will need to change as well
    // requires a 'font'
    ['font', applicationFonts[0]]
  , ['fontSize', 14 /*some default* /] // want this to experiment with autoOPSZ
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
*/

function main() {
    // Bootstrapping is hard!
    let applicationFonts = [ // for _AbstractOrderedMapModel
            ['first_font_key', {name: 'First Font'}]
          , ['other_font_key', {name: 'Other Font'}]
    ];


    let layoutsRaw = [
        ['first_layout', [
            ['fontSize', 123]
          , ['axisLocations', [
                ['opsz', [['value', 100]]]
              , ['wght', [['value', 800]]]
              , ['wdth', [['value', 300]]]
            ]]
          ]
        ]
    ];


    // availableFonts
    // activeFontName => can be set or not
    // font => is entirely passive

    const appState = ApplicationModel.fromRawValue(
        {
            'more': ['Generic', 'more', 'data']
          , 'template': 'Hello World!'

        }// external dependenciesData
      , [
           // => above in ApplicationModel['fonts', applicationFonts]
           // i.e. when font changes, this will need to change as well
           // requires a 'font'
           ['availableFonts', applicationFonts]
         , ['activeFontKey', 'other_font_key']

         , ['availableLayouts', layoutsRaw]
        ]
    );

    console.log('exampleLayoutState', appState);
}

// deno has if(import.meta.main)
if(import.meta.url.startsWith('file://')){
    // only a hack to run from node directly, temporarily, for initial development.
    main();
}
