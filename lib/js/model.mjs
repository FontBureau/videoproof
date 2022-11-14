/* jshint esversion: 11, browser: true, unused:true, undef:true, laxcomma: true, laxbreak: true, devel: true */


// Uh, so this won't be a const eventually, it should even be dynamic, as
// a plugin can register states and have em de-registered when shut down.
const STATE_SETUP = {
    'proofId' // string/unique id: AKA: proofFormatTag (rename?)

    'fontName' // string/unique id: via fontParticles

    'fontSize' // number
    'autoOPSZ' // bool, can't be just a UI internal thing :-/

    // complex, via manualAxisLocations, depends on fontSize for opsz and autoOPSZ(bool)
    // actually, fontSize could be not set/unavailable as well, in which case
    // autoOPSZ should be treated as true?? OR opsz should be set to default???
    // it may depend on the actual proof how to handle this.
    // font-size is also NOT part of the original GENERAL_STATE_STRUCTURE
    // as it wasn't treated as this in videoproof.
    'axisLocations' // array [axisTag, value, axisTag, value ....]

    'customText' // string

    'comment' // string
    'showComment' // bool, we may not serialize it, by default: showComment = comment.length > 0
    'highlightSelection' // text-selection:pathRanges
}

In videoproof axisLocations are set from the animation state, it has no fontSize, autoOPSZ
In typetools axisLocations are set via manualAxisLocations, it has fontSize, autoOPSZ
so, maybe these are different dependency trees and axisLocations is just a data type!
on the other hand, axis locations doesn't have to be complete, if a location
is not set explicitly, the font default is assumend. So the manualAxisLocations
UI is indeed dependent on fontSize, autoOPSZ and axisLocations, and it can also
changes all of these.
the question is where and how to handle these getting out of sync? there's oviously
a state changing phase, where the resulting values must make sense.


fontname changes
 => available axis change
    => hence axisLocations need to change
 => depending on the value for autoOPSZ opsz in axisLocations has to change too
 => autoOPSZ may be considered a userInterface thing, thus the manualAxisLocations
    must register some kind of handler to go from
    vanilla axisLocations to axisLocations with opsz
    and, there must be no cyclic dependencies on the way.
 => only after all states have been calculated, the UI will receive the
    updated values

// a value
axisLocations(fontName, autoOPSZ, fontSize)



// The way to remove cyclic dependencies is to create a governing container

axisStyleGoverneur(style, AxisLocations) => style, AxisLocations

manualAxisLocations(fontName, fontSize, autoOPSZ, axisStyleGoverneur.AxisLocations)
// hidden: show all checkbox
// set to a fvar value if it's on a manualAxisLocations
// set to a
style(axisStyleGoverneur.style)

=> hmm in this case, I would expect style to set axisLocations
and to be set by axisLocations, e.g. when there's a match with
axis locations style is set to the appropriate option, otherwise, it's
going to be UIManualAxisLocations.CUSTOM_STYLE_VALUE.
style select is so far part of UIManualAxisLocations, so, we don't need
to worry.






proof(fontName, fontSize, axisLocations)

class _BaseModel{

    // qualifiedKey => can distinguish between alias/shortcut and
    // absolut entry. e.g. "@firstChild" vs ".0"
    function get(qualifiedKey){
        throw new Error(`Not implemented get (of "${qualifiedKey}") in ${this}.`);
    }

    // use only for console.log/Error/debugging purposes
    function toString(){
        return `[_BaseModel ${this.constructor,name}]`;
    }
}

// generic map/dictionary type
// Not sure we'll ever need this!
class MapModel extends _BaseModel{}


// list/array type
// items are accessed by index
// has a size/length
// I'd prefer to have a single type for all items, that way,
// we can't have undefined entries, however, a type could be
// of the form TypeOrEmpty...
// MultipleTargets ...!
class ListModel extends _BaseModel{}


class _AbstractStructModel _BaseModel{}


const ExampleLayoutModel = structModelFactory(
    ['fontName', fontNameModel]??? => requires axcess to the fonts?

    ['fontSize', numberModel] // when we control min/max and precision at this level we'll get a lot from it, could be used to configure a generic number ui


    ['autoOPSZ']
    ['axisLocations']
    //... this can come from a central definition, but, e.g. highlightSelection
    //    may not work for all layouts, so we should be able to exclude this!
    ['customText', simpleText /* could be restrained to a type of one line, but html can handle any text*/]
    ['comment', simpleText/*could be markdown*/]
    ['highlightSelection', // text-selection:pathRanges]
)

    // parent state??
    'proofId' // string/unique id: AKA: proofFormatTag (rename?)

    //
    'fontName' // string/unique id: via fontParticles

    'fontSize' // number
    'autoOPSZ' // bool, can't be just a UI internal thing :-/

    // complex, via manualAxisLocations, depends on fontSize for opsz and autoOPSZ(bool)
    // actually, fontSize could be not set/unavailable as well, in which case
    // autoOPSZ should be treated as true?? OR opsz should be set to default???
    // it may depend on the actual proof how to handle this.
    // font-size is also NOT part of the original GENERAL_STATE_STRUCTURE
    // as it wasn't treated as this in videoproof.
    'axisLocations' // array [axisTag, value, axisTag, value ....]

    'customText' // string

    'comment' // string
    'showComment' // bool, we may not serialize it, by default: showComment = comment.length > 0
    'highlightSelection' // text-selection:pathRanges


applicationModel => not sure we need to formalize this!
    fonts
    otherResources?
    layouts
    activeLayout/proofId
    layoutState => an instance of _AbstractLayoutModel
    // activeFont ??? => rather part of the layout model, because some may use multiple fonts


function(Base) {
    // expression
    return class MyClassLongerName extends Base {
        // Class body. Here MyClass and MyClassLongerName point to the same class.
    };
    return MyClass
}



function structModelFactory(...fields) {
    class MyClassLongerName extends _AbstractStructModel {
        // Class body. Here MyClass and MyClassLongerName point to the same class.
        fields = fields
    };

    MyClassLongerName.name = 'CustomClassName';
    return MyClass;
}





// axisValue, e.g. for opsz could contain an explicit autoOPSZ switch
class AxisLocationModel {
    axisTag
    axisValue
}
// could create one dynamically for each font?
// on the other hand, this seems to me a good case for a MapModel
class AxisLocationsModel



// visitor pattern getter
function getFromModel(model/*_BaseModel*/, pathString)  { // =>
    // think of pathString as a simplified selector, we're not going into
    // more complex
    let pathParts = pathString.split(PATH_SEPARATOR/*likeley more complex*/)

    return pathParts.reduce((accumModel, key)=>accumModel.get(pathPart));
}



MyLayoutModel


// eventually?
state = new State(MyLayoutModel, data/*if any*/);


// I would prefer this, but we'd build MyLayoutModel dynamically, using MetaProgramming ...
state = new MyLayoutModel(data/*if any*/);





setStateValue(state, pathInstance, value) {

}
getStateValue(state, pathInstance) {

}



[myUIElement, /*dependsOn:*/ new Set([pathStr, pathStr, pathStr])];
// also the other way around possible somewhere
myPath, /*repesented in ui by*/ [MyUIElement/*(this is likely a factory!)*/]








// The Order in PROOF_STATE_DEPENDENCIES is crucially important to never change ever!
// Appending new entries is OK. This is because externally stored
// state links rely on this order and changing it would invalidate these
// links.
const TYPESPEC_MULTIPLE_TARGETS = ['fontSize', 'fontLeading', 'alignment', 'colors'
                 /* manualAxisLocations: should include "fontStyle"
                  * as a shortcut to dial in location numbers */
              , 'manualAxisLocations'
      ]
  , PROOF_STATE_DEPENDENCIES = {
        //"_uiInitProof" => selectLayout/proofFormatTag
            // this controls the below.

        // this must be serialized
        //              deserilized
        //              used to update the current proof, when changed

        // needs fontName to dial in the glyph widths...the
        //    the UI-Element is actually selectFonts, but that one, we may
        //    rather get from animation state font-name ...
        "GRID": ['fontName', 'selectGlyphs', 'showExtendedGlyphs']
      , "TYPE_YOUR_OWN": ['customText', 'showExtendedGlyphs' /*(future: a boolean option: "avoid line breaks" that defaults to true*/]
      , "CONTEXTUAL": ['fontName', 'contextualPadMode', 'showExtendedGlyphs', 'selectGlyphs', 'contextualPadCustom']
      , "TYPESPEC": ['columnWidth'
                , 'typeSpecTemplate' // we don't really have a choice yet, but this prepares it.
                , 'variationSettingsFlags'
                // everything after multipleTargets is for those multiple targets
                // though, maybe some (like alignment and color) could be
                // global.
              , 'multipleTargets' /* TODO: how to initate different typpgraphic-targets? */
                /* out of these, font-size is the most important */
              , ...TYPESPEC_MULTIPLE_TARGETS
        ]
    }
    // Falls back to PROOF_STATE_DEPENDENCIES if the key is not in PROOF_REQUIRE_INIT_DEPENDENCIES.
  , PROOF_REQUIRE_INIT_DEPENDENCIES = {
        // TYPESPEC: needs only to run its own update function when the other
        // state values change.
        "TYPESPEC": ['typeSpecTemplate']
    }
    // These are intended to be turned on/off per proof, they don't
    // necessarily cary state for serialization themselves, but e.g.
    // animation controls (play/pause etc.)
  , VIDEPROOF_UI_DEPENDENCIES = ['keyframesdDisplayContainer', 'moarAxesDisplay'
                , 'animationControls', 'animationDurationContainer', 'aniparams'
                , 'selectGlyphsContainer', 'colors']
  , PROOF_UI_DEPENDENCIES = {
        "GRID": [...PROOF_STATE_DEPENDENCIES.GRID, ...VIDEPROOF_UI_DEPENDENCIES]
      , "TYPE_YOUR_OWN": [...PROOF_STATE_DEPENDENCIES.TYPE_YOUR_OWN, ...VIDEPROOF_UI_DEPENDENCIES]
      , "CONTEXTUAL": [...PROOF_STATE_DEPENDENCIES.CONTEXTUAL, 'contextualPadModeContainer'
                , 'contextualPadCustomContainer', ...VIDEPROOF_UI_DEPENDENCIES]
      , "TYPESPEC": [...PROOF_STATE_DEPENDENCIES.TYPESPEC , 'columnWidth'
                , 'typographyContainer',  'alignmentColorContainer'
                 // This is to get informed when the font changes.
                 // We'll have to update especially the manualAxisLocations
                 // but for automated leading, this is relevant as well.
                 //
                 // The wiring of this is done in _uiInitProofTypespec. ??
                 // so there's a duplication of dependency descriptions.
                 // It would be better when enabling/including multipleTargets
                 // it would itself include it's dependencies. In the end
                 // I guess we want a flat, ordered list and make surre
                 // there are no loops. (Because there are no loops we can
                 // order it in a way that all dependencies are already
                 // updated fullfilled when the dependent it is its turn.
                 // HOWEVER, I also see that there must be a difference
                 // between more demanding/effortful initializing/rebuilding
                 // and just updating, so maybe we build two dependency
                 // trees, one for each where: if(needsRebuild) else if(needsUpdate)
                 // because a rebuild must always also include the work of
                 // an update. To be sure there's no code duplication, it
                 // could be possible that the initialize/rebuild method
                 // requests to run the update method subsequently, but it
                 // could similarly be solved internally in the implementaton.
                 //
                 // For this to work, initialize/rebuild dependencies must
                 // be a superset to update dependencies, containing all
                 // update dependencies and more. Othwerwise
                 // update would never run (may be fine). Initialize/rebuild
                 // also must have full access to all update dependencies.
                 // In other words, initalize is only triggered when the
                 // depedencies that channged are in initilaize but not
                 // in update.
                 //
                 //
                 // CAUTION: fontName here actually stands for font, as
                 //          changing the font changes the fontName, nothing
                 //          else and as here, the actual contents of the
                 //          font (axis names and defaults etc.) are
                 //          required information.
                 , 'fontName'
                ]
    }
    ;




const GENERAL_STATE_STRUCTURE = [
    // 0. Comment time and date.
    // 1. Version of font (we use array of srings [fontName, version])
    // 2. Designspace location (we custom order by axes tags in here, array of [str axisTag, Number(parseFLoat) axisLocation])
    // 3. Proof format (sub format depending on the proof widget)
    // 4. str Comment
    // 5. serialize the browser select API state Custom string highlight
    //    maybe this must also live in the Proof format, if it's special how
    //    to select within the proof.
        //           date => str     str => date
        ['dateTime', _serializeDate, _deserializeDate]
      , ['fontParticles', _serializeListOfStr, _deserializeListOfStr]
      , ['axisLocations', _serializeAxisLocations, _deserializeAxisLocations]
      , ['proofFormatTag', encodeURIComponent, _decodeURIComponent]
      , ['comment',  encodeURIComponent, _decodeURIComponent]
//      , ['colors', _serializeRGBColors, _deserializeRGBColors]
        // Not implemented
                    // mergedPathsRanges => str    str => pathsRanges
      , ['highlightSelection', serializePathRanges, deserializePathRanges]
];
    /** the serialize functions get as second argument a function:
     * addExtended(type, value) => pointer (i.e. index into the extended array)
     * and similarly, the the deserialize function is called with a second
     * argument getExtended(type, pointer)
     * Extended structures are separated by the ampersand '&' hence that
     * must not be be part of the returned string.
     */
    // , _EXTENDED: {
    //   }


