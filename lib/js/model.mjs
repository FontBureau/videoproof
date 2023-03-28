/* jshint esversion: 11, browser: true, unused:true, undef:true, laxcomma: true, laxbreak: true, devel: true */


import {
       unwrapPotentialWriteProxy
      , _AbstractStructModel
      , _AbstractListModel
      //, _AbstractMapModel
      , _AbstractOrderedMapModel
      , _AbstractDynamicStructModel
      , _AbstractGenericModel
      , ForeignKey
      , ValueLink
      , BooleanModel
      , NumberModel
      , StringModel
      , InternalizedDependency
      , CoherenceFunction
     } from './metamodel2.mjs';



// This could just be _AbstractStructModel so far, however testing the
// inheritance experience with this. It seems to work nicely so we can use
// this as a marker class, and maybe at some point add specific behavior.
export class _BaseLayoutModel extends _AbstractStructModel{}


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
  , AxesLocationsModel = _AbstractOrderedMapModel.createClass('AxesLocationsModel', NumberModel)
  , ManualAxesLocationsModel = _AbstractStructModel.createClass(
        'ManualAxesLocationsModel'
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
      , CoherenceFunction.create(['font', 'fontSize', 'autoOPSZ', 'axesLocations'],
        function sanitizeAxes({font, fontSize, autoOPSZ, axesLocations}) {

            if(autoOPSZ.value === undefined)
                autoOPSZ.value = true;

            // NOT sure with this UI handels this...
            // if(autoOPSZ.value === true) {
            //     // Only works if fontSize has the same type as axesLocations.Model
            //     // so far NumberModel but these things can change!
            //     // axesLocations.set('opsz', fontSize);
            //     const opsz = axesLocations.constructor.Model.createPrimalDraft();
            //     opsz.value = fontSize.value;
            //     axesLocations.set('opsz', opsz);
            // }

            const axisRanges = font.value.axisRanges;
            // axisRanges[axis.tag] {
            //      name /*  'name' in axis ? axis.name.en : axis.tag */
            //    , min, max, default }
            for(const [key, entry] of axesLocations) {
                if(!(key in axisRanges)) {
                    // Remove all keys from `axesLocations` that are
                    // not axes in font!
                    axesLocations.delete(key);
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
      , ['axesLocations', AxesLocationsModel]
    )
    // , MultipleManualAxesLocationsModel = _AbstractListModel.createClass('MultipleManualAxesLocationsModel', ManualAxesLocationsModel)
    // TODO: will have to accept differnt kinds of LayoutModels, maybe e.g. _BaseLayoutModel as a starter
  , LayoutTypeModel = _AbstractGenericModel.createClass('LayoutTypeModel')// => value will be a concrete _BaseLayoutModel
  , AvailableLayoutModel = _AbstractStructModel.createClass(
        'AvailableLayoutModel'
      , ['label', StringModel]
      , ['typeClass', LayoutTypeModel]
    )
  , AvailableLayoutsModel = _AbstractOrderedMapModel.createClass('AvailableLayoutsModel', AvailableLayoutModel)
  , AvailableFontsModel = _AbstractOrderedMapModel.createClass('AvailableFontsModel', FontModel)
  , ApplicationModel = _AbstractStructModel.createClass(
        'ApplicationModel'
        , CoherenceFunction.create(['activeState', 'layout'],  function checkTypes({activeState, layout}) {

            console.info('CoherenceFunction checkTypes activeState', activeState);
            console.info('CoherenceFunction checkTypes layout', layout);
            const LayoutType = layout.get('typeClass').value
              , WrappedType = unwrapPotentialWriteProxy(activeState).WrappedType
              ;

            // This check should ideally be executed after activeState was
            // metamorphosed with it's current type dependency.
            // But it is not!
            console.log('activeState.WrappedType', WrappedType);
            console.log('LayoutType', LayoutType);
            if(WrappedType !== LayoutType)
                // throw new ... ?
                // Actually, this is taken care of when metamorphosing
                // the state. However, if done here, we could also change
                // it in here while still a draft. Would require a public
                // API to do so, however as setting to _value directly is
                // not ideal:
                // Object.defineProperty(activeState, '_value',{
                //      value: LayoutType.createPrimalState(childDependencies)
                //      ...
                // We have a setter: activeState.wrapped = this.WrappedType.createPrimalState(childDependencies)
                // HOWEVER, that also checks for WrappedType which wouldn't
                // work, because that is changed only in metmorphose as well!
                // We should only check for consistency with activeState.constructor.BaseType
                console.error(`TYPE ERROR activeState wrapped type "${WrappedType.name}" `
                        + `must equal layout type "${layout.get('label').value}" (${LayoutType.name})`);
        })

      , ['availableLayouts', new InternalizedDependency('availableLayouts', AvailableLayoutsModel)]
      , ['activeLayoutKey', new ForeignKey('availableLayouts', ForeignKey.NOT_NULL, ForeignKey.SET_DEFAULT_FIRST)]
      , ['layout', new ValueLink('activeLayoutKey')]
      , ['activeState', _AbstractDynamicStructModel.createClass('DynamicLayoutModel'
                            , _BaseLayoutModel, 'layout'
                            // This is a bit of a pain point, however, we
                            // can't collect these dependencies dynamically yet.
                            , ['font'])]
      , ['availableFonts', new InternalizedDependency('availableFonts', AvailableFontsModel)]
      , ['activeFontKey', new ForeignKey('availableFonts', ForeignKey.NOT_NULL, ForeignKey.SET_DEFAULT_FIRST)]
      , ['font', new ValueLink('activeFontKey')] // => provides one FontModel of AvailableFontsModel
    )
  , ExampleLayoutModel = _BaseLayoutModel.createClass(
        'ExampleLayoutModel'
      , CoherenceFunction.create(['fontSize'],  function setDefaults({fontSize}) {
            // Value is undefined in primal state creation.
            // Also, NumberModel, an _AbstractGenericModel, has no defaults or validation.
            if(fontSize.value === undefined) {
                // This is sketchy, font-size is very specific
                // to the actual layout usually.
                fontSize.value = 36;
            }
        })
     // , ['font', new InternalizedDependency('font', AvailableLayoutsModel)]
      , ['fontSize', NumberModel]
      , ['manualAxesLocations', ManualAxesLocationsModel]
    )
  , KeyMomentModel = _AbstractStructModel.createClass(
        'KeyMomentModel'
      , CoherenceFunction.create(['fontSize', 'duration'],  function setDefaults({fontSize, duration}) {
            // Value is undefined in primal state creation.
            // Also, NumberModel, an _AbstractGenericModel, has no defaults or validation.
            if(fontSize.value === undefined) {
                // This is sketchy, font-size is very specific
                // to the actual layout usually.
                fontSize.value = 36;
            }
            if(duration.value === undefined) {
                // miliseconds 1000 = 1 second
                duration.value = 1000;
            }
        })
      , ['label', StringModel]
      , ['fontSize', NumberModel]
        // duration is nice, as it makes the list order relevant
        // it's also good enough to construct a complete timeline.
        // Editing actions, such as drag and drop, may have to work
        // around some of the usability issues when doing just simple
        // editing, however, for playing the animation, this is probably
        // really nice. E.g. editing changing absolute time positions
        // will touch many keymoments. One really nice thing about this is
        // that an animation loop can easily be constructed because there's
        // a duration between the last and the first moment.
        // Duration can describe the time span before the key moment or
        // after it. After seems like a first natural impulse, but before
        // has it's merits as well, so the moment marks the end state of
        // the the transformation that happens during duration.
      , ['duration', NumberModel]
        // in === out BUT with a duration of 0 out can be moved
        // to the next moment, without intermediate values.
      , ['manualAxesLocations', ManualAxesLocationsModel]
    )
  , KeyMomentsModel = _AbstractListModel.createClass('KeyMomentsModel', KeyMomentModel)
  , ExampleKeyMomentsLayoutModel = _BaseLayoutModel.createClass(
        'ExampleKeyMomentsLayoutModel'
        , CoherenceFunction.create(['keyMoments'],  function prepare({keyMoments}) {
            if(keyMoments.size === 0) {
                // we could also push two initial keyframes as it is the
                // basis for an animation, one keyframe is just static.
                // TODO: the _AbstractListModel should have method to
                //       create a primalState of its members directly.
                keyMoments.push(keyMoments.constructor.Model.createPrimalState(keyMoments.dependencies));
            }
        })
      , ['keyMoments', KeyMomentsModel]
        // not sure I want to keep the next two like this, but it's
        // easier to get started like this right now.
      , ['activeKeyMoment', new ForeignKey('keyMoments', ForeignKey.ALLOW_NULL, ForeignKey.SET_NULL)]
        // we are editing this one I guess, could get removed again though!
      , ['keyMoment', new ValueLink('activeKeyMoment')]
    )
  ;

