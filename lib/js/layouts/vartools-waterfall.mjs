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

function applyPropertyChanges(contentElement, manualAxisLocations, variationSettingsFlags) {
      const applyDefaultsExplicitly = variationSettingsFlags.has('applyDefaultsExplicitly')
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
        varProperties.push([axisTag, propertyName, location, autoOPSZ]);
    }

    return varProperties;
}

const WATERFALL_CONTAINER_CLASS = 'waterfall-container'
  , LINE_CLASS = `waterfall-line`
  , LINE_CONTENT_CLASS = `waterfall-line_content`
  , TOGGLE_EDIT_CLASS = `waterfall-toggle_edit`
  , SHOW_PARAMETERS_CLASS = `waterfall-show_parameters`
  // Selectors for classes
  , LINE_SELECTOR = `.${LINE_CLASS}`
  , LINE_CONTENT_SELECTOR = `.${LINE_CONTENT_CLASS}`
  , TOGGLE_EDIT_SELECTOR = `.${TOGGLE_EDIT_CLASS}`
  , SHOW_PARAMETERS_SELECTOR = `.${SHOW_PARAMETERS_CLASS}`
  // something completely different
  , FONT_SIZE_PLACEHOLDER = '{font-size}'
  , FONT_SIZE_CUSTOM_PROPERTY = '--font-size'
  , DEFAULT_CONTENT = 'ABCDEFGHIJKLOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz1234567890'
  ;

function _parametersTextFromProperties(varProperties) {
    return varProperties
        .map(([axisTag, /*propertyName*/, location, autoOPSZ])=>{
            return axisTag === 'opsz' && autoOPSZ
                ? `${axisTag} (auto ${FONT_SIZE_PLACEHOLDER})`
                : `${axisTag} ${location}`;
        })
        .join(', ');
}

function _getParametersTextForFontSize(parametersText, fontSize) {
    return parametersText.replace(FONT_SIZE_PLACEHOLDER, fontSize);
}

function _getParametersTextForLine(parametersText, line) {
    const fontSize = line.style.getPropertyValue(FONT_SIZE_CUSTOM_PROPERTY);
    return _getParametersTextForFontSize(parametersText, fontSize);
}


function updateDisplayParameters(domTool, contentElement, varProperties) {
    const parametersText = _parametersTextFromProperties(varProperties)
      , lines = contentElement.querySelectorAll(LINE_SELECTOR)
      ;
    for(const line of lines) {
        let parameters = line.querySelector(SHOW_PARAMETERS_SELECTOR);
        // Assert there's a parameters element!
        parameters.textContent = _getParametersTextForLine(parametersText, line);
    }
}

function _fontVariationSettingsFromProperties(varProperties) {
    return varProperties
        .map(([axisTag, propertyName])=>{
            return axisTag === 'opsz'
                ? `"${axisTag}" var(${propertyName}, var(${FONT_SIZE_CUSTOM_PROPERTY}))`
                : `"${axisTag}" var(${propertyName}, 0)`
                ;
        }).join(', ');
}

function updateFontVariationsSettings(domTool, contentElement, varProperties) {
    const fontVariationSettings =  _fontVariationSettingsFromProperties(varProperties)
      , lines = contentElement.querySelectorAll(LINE_SELECTOR)
      ;
    for(const line of lines)
        line.style.setProperty('font-variation-settings', fontVariationSettings);
}

function makeLines(domTool, contentElement, userText, fontSize, fontSizeTo, varProperties, variationSettingsFlags) {
        const waterfallContent = userText || DEFAULT_CONTENT
          , lines = []
          ;
        domTool.clear(contentElement);

        const fontVariationSettings = _fontVariationSettingsFromProperties(varProperties)
          , parametersText = variationSettingsFlags.has('displayParameters')
                    ? _parametersTextFromProperties(varProperties)
                    : ''
          , fromFontSize = parseInt(fontSize)
          , toFontSize = parseInt(fontSizeTo)
          , step = toFontSize < fromFontSize ? -1 : 1
          , endCondition =  toFontSize < fromFontSize
                ? (i, l)=>i >= l
                : (i, l)=>i <= l
          ;

        for(let i=fromFontSize; endCondition(i, toFontSize); i+=step) {
            let line = domTool.createElement('div', {'class': LINE_CLASS}, [
                domTool.createElement('span', {'class': TOGGLE_EDIT_CLASS, title: 'click here to edit line'})
              , domTool.createElement('span', {'class': LINE_CONTENT_CLASS}, waterfallContent)
            ]);
            line.style.setProperty(FONT_SIZE_CUSTOM_PROPERTY, `${i}`);
            line.style.setProperty('font-variation-settings', fontVariationSettings);

            if(variationSettingsFlags.has('displayParameters')) {
                // enable parameters
                const parameters = domTool.createElement(
                        'div'
                        , {'class': SHOW_PARAMETERS_CLASS}
                        , _getParametersTextForFontSize(parametersText, i)
                );
                line.append(parameters);
            }
            lines.push(line);
        }
        contentElement.append(...lines);
}

function _handleBeforeInput(domTool, event) {
    handleEditableLine(domTool, event);
    domTool.dispatchEvent(event.target, 'edited', {bubbles: true});
}

function _handleClick(domTool, e) {
    if(!e.target.matches(`${LINE_SELECTOR} ${TOGGLE_EDIT_SELECTOR}`))
        return;
    e.preventDefault();
    // Turning contentEditable on only when required has the advantage
    // that text selection works better, it's otherwise limited within
    // each contenteditable element and one cannot select accross elements.
    const line = e.target.closest(LINE_SELECTOR)
      , lineContent = line.querySelector(LINE_CONTENT_SELECTOR)
      ;
    lineContent.contentEditable = true;
    lineContent.focus();
}

function _handleDblclick(domTool, e) {
    if(!e.target.matches(`${LINE_SELECTOR} *`))
        return;
    e.preventDefault();
    // Turning contentEditable on only when required has the advantage
    // that text selection works better, it's otherwise limited within
    // each contenteditable element and one cannot select accross elements.
    const line = e.target.closest(LINE_SELECTOR)
      , lineContent = line.querySelector(LINE_CONTENT_SELECTOR)
      ;
    lineContent.contentEditable = true;
    lineContent.focus();
}

function _handleFocusOut(domTool, e) {
     if(!e.target.matches(LINE_CONTENT_SELECTOR))
        return;
    const lineContent = e.target;
    lineContent.contentEditable = false;
}

function updateTextContent(container, newText) {
    // Update all lines
    const lineContents = container.querySelectorAll(LINE_CONTENT_SELECTOR);
    for(const elem of lineContents) {
        if(elem.textContent === newText) continue;
        elem.textContent = newText;
    }
}

function _handleEdited(updateTextHandler, event) {
    const newText = event.target.textContent;
    updateTextHandler(newText);
}

export function init(proofElement, domTool, updateTextHandler, fontSize, fontSizeTo
                , manualAxisLocations, alignment, variationSettingsFlags
                , userText, manualFontLeading) {

    console.log(`WATERFALL init!`, {
                          fontSize, fontSizeTo, manualAxisLocations});

    const contentElement = domTool.createElement('div', {'class': WATERFALL_CONTAINER_CLASS});
    proofElement.append(contentElement);


    const handleDestroy = (/*event*/)=>{
            for(const eventListener of eventListeners)
                proofElement.removeEventListener(...eventListener);
        }
      , eventListeners = [
            ['beforeinput', _handleBeforeInput.bind(null, domTool), false]
          , ['focusout', _handleFocusOut.bind(null, domTool), false]
          , ['edited', _handleEdited.bind(null, updateTextHandler), false]
         //, ['focusin', _handleFocusIn.bind(null, domTool, setActiveTypoTarget), false]
          , ['click', _handleClick.bind(null, domTool), false]
          , ['dblclick', _handleDblclick.bind(null, domTool), false]
          , ['destroy', handleDestroy, false]
        ]
      ;

    for(const eventListener of eventListeners)
        proofElement.addEventListener(...eventListener);


    _setProperty(contentElement, 'alignment', alignment);
    contentElement.style.setProperty('line-height', `${manualFontLeading}`);
    const varProperties = applyPropertyChanges(contentElement, manualAxisLocations,
                            variationSettingsFlags);
    makeLines(domTool, contentElement, userText, fontSize, fontSizeTo, varProperties, variationSettingsFlags);

    return {
        // Update will run if the proof is no re-initalized anyways.
        update: (changedDependencyNamesSet, fontSize, fontSizeTo
                    , manualAxisLocations, alignment, variationSettingsFlags
                    , userText, manualFontLeading)=>{
            _setProperty(contentElement, 'alignment', alignment);
            const varProperties = applyPropertyChanges(contentElement, manualAxisLocations,
                                    variationSettingsFlags);
            if(['fontSizeFrom', 'fontSizeTo', 'fontName', 'variationSettingsFlags'].some(k=>changedDependencyNamesSet.has(k))) {
                contentElement.style.setProperty('line-height', `${manualFontLeading}`);
                makeLines(domTool, contentElement, userText, fontSize, fontSizeTo, varProperties, variationSettingsFlags);
                return;
            }
            if(changedDependencyNamesSet.has('userText'))
                updateTextContent(contentElement, userText);
            // What follows is covered in makeLines as well
            if(!variationSettingsFlags.has('applyDefaultsExplicitly')) {
                // When the default are not explicitly applied, font-variation-settings
                // must be updated when the variation properties change, as
                // they may contain more or less axis than before..
                updateFontVariationsSettings(domTool, contentElement, varProperties);
            }
            if(changedDependencyNamesSet.has('manualAxisLocations') && variationSettingsFlags.has('displayParameters')){
                updateDisplayParameters(domTool, contentElement, varProperties);
            }

            if(changedDependencyNamesSet.has('manualFontLeading'))
                contentElement.style.setProperty('line-height', `${manualFontLeading}`);

        }
    };
}

