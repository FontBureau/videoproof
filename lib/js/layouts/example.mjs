/* jshint browser: true, esversion: 9, laxcomma: true, laxbreak: true, unused:true, undef:true */


// FIXME: keep example of injected API (here setActiveTypoTarget)
//        keep/create also complete example of returned proof api.
// TODO: what does the example do anyways?
//          Type your own is quite minimal
export function init(proofElement, domTool, templateElement, setActiveTypoTarget
                   , activeTypoTargetIndex, states, columnWidth
                   , variationSettingsFlags) {
    console.log(`TYPESPEC init! activeTypoTargetIndex: ${activeTypoTargetIndex} states:`, states);
    let handleDestroy = (/*event*/)=>{
            for(const eventListener of eventListeners)
                proofElement.removeEventListener(...eventListener);
        }
      , eventListeners = [
            ['beforeinput', _handleBeforeInput.bind(null, domTool), false]
          , ['focusout', _handleFocusOut.bind(null, domTool), false]
          , ['focusin', _handleFocusIn.bind(null, domTool, setActiveTypoTarget), false]
          , ['click', _handleClick.bind(null, domTool), false]
          , ['destroy', handleDestroy, false]
        ]
      ;

    for(const eventListener of eventListeners)
        proofElement.addEventListener(...eventListener);

    proofElement.append(templateElement);
    const allTypoTargets = proofElement.querySelectorAll(TYPO_ELEMENT_SELECTOR);

    // Always mark one element as active, not sure if
    // focus should be required for this. This way we also trigger
    // setActiveTypoTarget, which however only acts "on change".
    //
    // There's also the posibility that activeTypoTarget is not
    // in the templateElement, but since all of the state, activeTypoTarget
    // and the template need to be in sync, for now and here I consider
    // that a minor issue, to be dealt with another time.
    _activateTypoTarget(allTypoTargets, activeTypoTargetIndex);
    setActiveTypoTarget(activeTypoTargetIndex);
    _applyState(domTool, templateElement, columnWidth, allTypoTargets
                                    ,states ,variationSettingsFlags);
    return {
        // Update will run if the proof is no re-initalized.
        update: (activeTypoTargetIndex, states, columnWidth, variationSettingsFlags
                )=>{
                    console.log('TYPESPEC proofAPI.update!');
                    return _applyState(domTool, templateElement, columnWidth
                        , allTypoTargets, states, variationSettingsFlags);
                }
    };
}

