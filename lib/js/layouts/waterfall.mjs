/* jshint browser: true, esversion: 9, laxcomma: true, laxbreak: true, unused:true, undef:true */
import { handleEditableLine } from '../content-editable.mjs';

// Duplicates from typespec!
function _keyToProperty(key) {
    // 'HeLloWORLD'.replaceAll(/([A-Z])/g, (_, a)=>  `-${a.toLowerCase()}`);
    // '-he-llo-w-o-r-l-d

    let property = key.startsWith('font-var-')
            ? key.toLowerCase()
            : key.replaceAll(/([A-Z])/g, (_, a)=>  `-${a.toLowerCase()}`);
    return `--${property}`;
}

const ALIGNMENT2CSS = {
    'l': 'left'
  , 'c': 'center'
  , 'r': 'right'
  // FIXME: "white-space: pre-wrap" on
  //        #the-proof.typespec div[contenteditable] kills of justify!
  //        In the legacy tool, "white-space: pre-wrap" was not used,
  //        instead, the untampered content editable mechanisms would insert
  //        non-breaking space characters and <br /> tags. To achieve cleaner
  //        contents, I prefer pre-wrap, but it could be turned off when
  //        text-align is justify. Also, when we'll apply varla-varfo
  //        parametric font justifiction, all this will become much more
  //        complicated anyways!
  , 'j': 'justify'
};

function _propertyValueToCSSValue(key, value) {
    if(key === 'alignment')
        return value in ALIGNMENT2CSS
                ? ALIGNMENT2CSS[value]
                : value
                ;
    return value;
}

function _setProperty(elem, key, value) {
    const propertyName = _keyToProperty(key);
    let propertyValue;
    if(value === null){
        propertyValue = null;
        elem.style.removeProperty(propertyName);
    }
    else {
        propertyValue = _propertyValueToCSSValue(key, value);
        elem.style.setProperty(propertyName, propertyValue);
    }
    return [propertyName, propertyValue];
}

function _filterLocations(applyDefaultsExplicitly, state) {
    return state.filter(([axisTag, {location, 'default':def}])=>
                axisTag === 'opsz' // browsers set the wron default opsz, always apply explicitly
            || ( applyDefaultsExplicitly
                        // Keep all
                        ? true
                        // Keep only locations that are not the default.
                        : location !== def )
    );
}

const FONT_SIZE_CUSTOM_PROPERTY = '--font-size';
function applyPropertyChanges(contentElement, manualAxisLocations) {
      const applyDefaultsExplicitly = true //variationSettingsFlags.has('applyDefaultsExplicitly')
      , locations = _filterLocations(applyDefaultsExplicitly, manualAxisLocations)
            .map(([axisTag, {location, autoOPSZ}])=>[axisTag, location, autoOPSZ])
      , varProperties = []
      ;

    for(const [axisTag, location, autoOPSZ] of locations) {
        const key = `font-var-${axisTag}`;
        let propertyValue = location;
        if(axisTag === 'opsz' && autoOPSZ) {
            // Don't set property, fallback to --font-size (FONT_SIZE_CUSTOM_PROPERTY) directly
            propertyValue = null; // deletes/removes
        }
        const [propertyName, ] = _setProperty(contentElement, key, propertyValue);
        varProperties.push([axisTag, propertyName]);
    }
    return varProperties;
}

function makeLines(domTool, contentElement, fontSize, fontSizeTo, varProperties) {
        const waterfallContent = 'ABCDEFGHIJKLOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz1234567890'
          , lines = []
          ;
        domTool.clear(contentElement);

        const fontVariationSettings = varProperties.map(([axisTag, propertyName])=>{
            return axisTag === 'opsz'
                ? `"${axisTag}" var(${propertyName}, var(${FONT_SIZE_CUSTOM_PROPERTY}))`
                : `"${axisTag}" var(${propertyName}, 0)`
                ;
        }).join(', ');

        for(let i=parseInt(fontSize), l=parseInt(fontSizeTo); i <= l; i++) {
            let line = domTool.createElement('div', {'class': 'line'}, [
                domTool.createElement('span', {'class': 'toggle-edit', title: 'click here to edit line'})
              , domTool.createElement('span', {'class': 'line-content'}, waterfallContent)
            ]);
            line.style.setProperty(FONT_SIZE_CUSTOM_PROPERTY, `${i}`);
            line.style.setProperty('font-variation-settings', fontVariationSettings);
            lines.push(line);
        }
        contentElement.append(...lines);
}

function _handleBeforeInput(domTool, event) {
    handleEditableLine(domTool, event);
    domTool.dispatchEvent(event.target, 'edited', {bubbles: true});
}

function _handleClick(domTool, e) {
    if(!e.target.matches('.line .toggle-edit'))
        return;
    // Turning contentEditable on only when required has the advantage
    // that text selection works better, it's otherwise limited within
    // each contenteditable element and one cannot select accross elements.
    const line = e.target.closest('.line')
      , lineContent = line.querySelector('.line-content')
      ;
    lineContent.contentEditable = true;
    lineContent.focus();
}

function _handleFocusOut(domTool, e) {
     if(!e.target.matches('.line-content'))
        return;
    const lineContent = e.target;
    lineContent.contentEditable = false;
}

function _handleEdited(domTool, event) {
    // Update all lines
    const newText = event.target.textContent
      , container = event.target.closest('.waterfall-container')
      , lineContents = container.querySelectorAll('.line-content')
      ;
    for(const elem of lineContents) {
        if(elem === event.target) continue;
        elem.textContent = newText;
    }
}

export function init(proofElement, domTool, fontSize, fontSizeTo
                                        , manualAxisLocations, alignment) {

    console.log(`WATERFALL init!`, {
                          fontSize, fontSizeTo, manualAxisLocations});

    const contentElement = domTool.createElement('div', {'class': 'waterfall-container'});
    proofElement.append(contentElement);


    const handleDestroy = (/*event*/)=>{
            for(const eventListener of eventListeners)
                proofElement.removeEventListener(...eventListener);
        }
      , eventListeners = [
            ['beforeinput', _handleBeforeInput.bind(null, domTool), false]
          , ['focusout', _handleFocusOut.bind(null, domTool), false]
          , ['edited', _handleEdited.bind(null, domTool), false]
         //, ['focusin', _handleFocusIn.bind(null, domTool, setActiveTypoTarget), false]
          , ['click', _handleClick.bind(null, domTool), false]
          , ['destroy', handleDestroy, false]
        ]
      ;

    for(const eventListener of eventListeners)
        proofElement.addEventListener(...eventListener);


    _setProperty(contentElement, 'alignment', alignment);
    const varProperties = applyPropertyChanges(contentElement, manualAxisLocations);
    makeLines(domTool, contentElement, fontSize, fontSizeTo, varProperties);

    return {
        // Update will run if the proof is no re-initalized anyways.
        update: (changedDependencyNamesSet, fontSize, fontSizeTo
                                    , manualAxisLocations, alignment)=>{
            _setProperty(contentElement, 'alignment', alignment);
            const varProperties = applyPropertyChanges(contentElement, manualAxisLocations);
            if(['fontSize', 'fontSizeTo', 'fontName'].some(k=>changedDependencyNamesSet.has(k)))
                makeLines(domTool, contentElement, fontSize, fontSizeTo, varProperties);
        }
    };
}

