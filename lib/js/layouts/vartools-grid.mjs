/* jshint browser: true, esversion: 9, laxcomma: true, laxbreak: true, unused:true, undef:true */
import { handleEditableLine } from '../content-editable.mjs';

function* gridDimensionGenerator({axisTag, stepping, from, to, steppingValue}) {
    if(axisTag === 'disabled' || steppingValue <= 0){
        yield null;
        return;
    }

    const stepSize = (stepping === 'steps')
            ? Math.abs(from - to) / steppingValue
            : steppingValue
      , step = to < from ? -stepSize : stepSize
        , change = to > from
                // the last step may be smaller
                ? value=>Math.min(value+step, to)
                : value=>Math.max(value+step, to)
      ;

    let value=from;
    while(true) {
        const yieldValue = Math.round(value * 100) / 100;
        yield yieldValue;
        if(yieldValue === to) break;
        // Not based on yieldValue because it could cause a
        // never ending loop.
        value=change(value);
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

const GRID_CONTAINER_CLASS = 'grid-container'
  , ROW_CLASS = 'grid-row'
  , CELL_CLASS = 'grid-cell'
  , CELL_CONTENT_CLASS = 'grid-cell_content'
  , SHOW_PARAMETERS_CLASS = 'grid-show_parameters'
  , TOGGLE_EDIT_CLASS = 'grid-toggle_edit'
    // Selectors for classes
  , CELL_SELECTOR = `.${CELL_CLASS}`
  , CELL_CONTENT_SELECTOR = `.${CELL_CONTENT_CLASS}`
  , SHOW_PARAMETERS_SELECTOR = `.${SHOW_PARAMETERS_CLASS}`
  , TOGGLE_EDIT_SELECTOR = `.${TOGGLE_EDIT_CLASS}`
    // something completely different
  , FONT_SIZE_CUSTOM_PROPERTY = '--font-size'
  , FONT_SIZE_PLACEHOLDER = '{font-size}'
  , DEFAULT_CONTENT = 'H'
  ;

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

function keyFromAxisTag(axisTag) {
    return `font-var-${axisTag}`;
}

function applyPropertyChanges(contentElement, fontSize, manualAxisLocations, gridDimensionControls, variationSettingsFlags) {
      const applyDefaultsExplicitly = variationSettingsFlags.has('applyDefaultsExplicitly')
      , locations = _filterLocations(applyDefaultsExplicitly, manualAxisLocations)
            .map(([axisTag, {location, autoOPSZ}])=>[axisTag, location, autoOPSZ])
      , varProperties = []
      , gridDimensionAxisTags = Object.values(gridDimensionControls)
                .filter(({axisTag})=>axisTag!=='disabled')
                .map(({axisTag})=>axisTag)
      , seen = new Set()
    ;

    for(const [axisTag, location, autoOPSZ] of locations) {
        const key = keyFromAxisTag(axisTag);
        let propertyValue = gridDimensionAxisTags.includes(axisTag)
                ? null
                : location
                ;
        if(axisTag === 'opsz' && autoOPSZ) {
            // Don't set property, fallback to --font-size (FONT_SIZE_CUSTOM_PROPERTY) directly
            propertyValue = null; // deletes/removes
        }
        seen.add(axisTag);
        const [propertyName, ] = _setProperty(contentElement, key, propertyValue);
        varProperties.push([axisTag, propertyName, location, autoOPSZ]);
    }

    for(const {axisTag} of Object.values(gridDimensionControls)) {
        if(seen.has(axisTag))
            continue;
        if(['disabled', 'font-size'].includes(axisTag))
            continue;

        const key = keyFromAxisTag(axisTag)
          ,  [propertyName, ] = _setProperty(contentElement, key, null)
          ;
        varProperties.push([axisTag, propertyName]);
    }

    contentElement.style.setProperty(FONT_SIZE_CUSTOM_PROPERTY, fontSize);
    return varProperties;
}

function _parametersTextFromProperties(varProperties, gridDimensionControls) {
    const gridAxesTags = Object.values(gridDimensionControls).map(({axisTag})=>axisTag)
      , explicitFontSize = gridAxesTags.includes('font-size')
      ;
     let parametersText = varProperties
            .map(([axisTag, /*propertyName*/, location, autoOPSZ])=>{
                if(gridAxesTags.includes(axisTag))
                    return `${axisTag} {${axisTag}}`;

                return axisTag === 'opsz' && autoOPSZ
                    ? `${axisTag} (auto ${FONT_SIZE_PLACEHOLDER})`
                    : `${axisTag} ${location}`;
            })
            .join(', ')
      ;

    if(explicitFontSize)
        parametersText += ` Font size: ${FONT_SIZE_PLACEHOLDER} pt`;
    return parametersText;
}

function _getParametersTextForFontSize(parametersText, proofFontSize, cellProperties) {
    const fontSize = 'font-size' in cellProperties
            ? cellProperties['font-size']
            : proofFontSize
            ;
    parametersText = parametersText.replaceAll(FONT_SIZE_PLACEHOLDER, fontSize);
    for(let [axisTag, value] of Object.entries(cellProperties))
        parametersText = parametersText.replaceAll(`{${axisTag}}`, value);

    return parametersText;
}

function _getParametersTextForCell(parametersText, cell) {
    const fontSize = cell.style.getPropertyValue(FONT_SIZE_CUSTOM_PROPERTY)
      , cellProperties = {}
      , propertyStart = '--font-var-'
      ;
    for(let propertyName of Array.from(cell.style)){
        if(!propertyName.startsWith(propertyStart))
            continue;
        const axisTag = propertyName.slice(propertyStart.length);
        cellProperties[axisTag] = cell.style.getPropertyValue(propertyName);
    }
    return _getParametersTextForFontSize(parametersText, fontSize, cellProperties);
}


function updateDisplayParameters(domTool, contentElement, varProperties, gridDimensionControls) {
    const parametersText = _parametersTextFromProperties(varProperties, gridDimensionControls);
    for(const cell of contentElement.querySelectorAll(CELL_SELECTOR)) {
        let parameters = cell.querySelector(SHOW_PARAMETERS_SELECTOR)
          , cellContent = cell.querySelector(CELL_CONTENT_SELECTOR)
          ;
        // Assert there's a parameters element!
        parameters.textContent = _getParametersTextForCell(parametersText, cellContent);
    }
}

function updateFontVariationsSettings(domTool, contentElement, varProperties) {
    const fontVariationSettings =  _fontVariationSettingsFromProperties(varProperties);
    for(const cell of  contentElement.querySelectorAll(CELL_CONTENT_SELECTOR))
        cell.style.setProperty('font-variation-settings', fontVariationSettings);
}

function makeCell(domTool, cellTextContent, proofFontSize, fontVariationSettings
                , parametersTextTemplate, variationSettingsFlags, cellProperties) {

    const parametersText = _getParametersTextForFontSize(parametersTextTemplate, proofFontSize, cellProperties)
      , cellContent = domTool.createElement('div',
            {'class': CELL_CONTENT_CLASS, title:parametersText}, cellTextContent)
      , cellElement = domTool.createElement('div', {'class': CELL_CLASS}, [
            domTool.createElement('span', {'class': TOGGLE_EDIT_CLASS, title: 'click here to edit line'})
          , cellContent
        ])
        ;

    if('font-size' in cellProperties)
        cellContent.style.setProperty(FONT_SIZE_CUSTOM_PROPERTY, `${cellProperties['font-size']}`);
    cellContent.style.setProperty('font-variation-settings', fontVariationSettings);

    for(const [axisTag, value] of Object.entries(cellProperties))
        _setProperty(cellContent, keyFromAxisTag(axisTag), value);



    if(variationSettingsFlags.has('displayParameters')) {
        // enable parameters
        const parameters = domTool.createElement(
                'div', {'class': SHOW_PARAMETERS_CLASS}, parametersText);
        cellElement.append(parameters);
    }
    return cellElement;
}

function makeGrid(domTool, contentElement, userText, fontSize, alignment
                , gridDimensionControls, varProperties, variationSettingsFlags
                , manualFontLeading) {
    const cellTextContent = userText || DEFAULT_CONTENT
      , fontVariationSettings = _fontVariationSettingsFromProperties(varProperties)
      , parametersTextTemplate = _parametersTextFromProperties(varProperties, gridDimensionControls)
      , rows = []
      ;
    domTool.clear(contentElement);

    const {x, y} = gridDimensionControls
      , MAX_CELLS = 1000
      ;
    let i = 0;
    y:
    for(const yValue of gridDimensionGenerator(y)) {
        const cells = [];
        for(const xValue of gridDimensionGenerator(x)) {
            // both disabled or bot stepsSize === 0
            if(xValue === null && yValue === null) break y;
            if(i >= MAX_CELLS)
                break ;
            i++;
            cells.push(makeCell(domTool, cellTextContent, fontSize
                    , fontVariationSettings, parametersTextTemplate, variationSettingsFlags
                    , {[x.axisTag]: xValue, [y.axisTag]: yValue}));
        }
        rows.push(domTool.createElement('div', {'class': ROW_CLASS}, cells));
        if(i >= MAX_CELLS) {
            // Could add a a button to "load more ..." !
            rows.push(domTool.createElementFromHTML('div', {'class': 'to-many-cells'},
                  `<h2>Cell creation aborted!</h2> The maximum cell amount was created. `
                + `Too many cells can affect the website performance negatively`
                + ` (MAX_CELLS ${MAX_CELLS}).`));
            break;
        }
    }
    contentElement.style.setProperty(FONT_SIZE_CUSTOM_PROPERTY, `${fontSize}`);
    contentElement.style.setProperty('line-height', `${manualFontLeading}`);
    contentElement.append(...rows);
}

function _handleBeforeInput(domTool, event) {
    handleEditableLine(domTool, event);
    domTool.dispatchEvent(event.target, 'edited', {bubbles: true});
}

function _handleClick(domTool, e) {
    if(!e.target.matches(`${CELL_SELECTOR} ${TOGGLE_EDIT_SELECTOR}`))
        return;
    e.preventDefault();
    // Turning contentEditable on only when required has the advantage
    // that text selection works better, it's otherwise limited within
    // each contenteditable element and one cannot select accross elements.
    const line = e.target.closest(CELL_SELECTOR)
      , lineContent = line.querySelector(CELL_CONTENT_SELECTOR)
      ;
    lineContent.contentEditable = true;
    lineContent.focus();
}

function _handleDblclick(domTool, e) {
    if(!e.target.matches(`${CELL_SELECTOR} *`))
        return;
    e.preventDefault();
    // Turning contentEditable on only when required has the advantage
    // that text selection works better, it's otherwise limited within
    // each contenteditable element and one cannot select accross elements.
    const line = e.target.closest(CELL_SELECTOR)
      , lineContent = line.querySelector(CELL_CONTENT_SELECTOR)
      ;
    lineContent.contentEditable = true;
    lineContent.focus();
}

function _handleFocusOut(domTool, e) {
     if(!e.target.matches(CELL_CONTENT_SELECTOR))
        return;
    const lineContent = e.target;
    lineContent.contentEditable = false;
}

function updateTextContent(container, newText) {
    // Update all lines
    const cellContents = container.querySelectorAll(CELL_CONTENT_SELECTOR);
    for(const elem of cellContents) {
        if(elem.textContent === newText) continue;
        elem.textContent = newText;
    }
}

function _handleEdited(updateTextHandler, event) {
    // Update all lines
    const newText = event.target.textContent;
    updateTextHandler(newText);
}

export function init(proofElement, domTool, updateTextHandler, fontSize
                , manualAxisLocations, alignment, variationSettingsFlags
                , gridDimensionControls, userText, manualFontLeading) {

    console.log(`VARTOOLS_GRID init!`, variationSettingsFlags);

    const contentElement = domTool.createElement('div', {'class': GRID_CONTAINER_CLASS});
    proofElement.append(contentElement);

     const handleDestroy = (/*event*/)=>{
            for(const eventListener of eventListeners)
                proofElement.removeEventListener(...eventListener);
        }
      , eventListeners = [
            ['beforeinput', _handleBeforeInput.bind(null, domTool), false]
          , ['focusout', _handleFocusOut.bind(null, domTool), false]
          , ['edited', _handleEdited.bind(null, updateTextHandler), false]
          , ['click', _handleClick.bind(null, domTool), false]
          , ['dblclick', _handleDblclick.bind(null, domTool), false]
          , ['destroy', handleDestroy, false]
        ]
      ;

    for(const eventListener of eventListeners)
        proofElement.addEventListener(...eventListener);


    _setProperty(contentElement, 'alignment', alignment);

    const varProperties = applyPropertyChanges(contentElement, fontSize
                            , manualAxisLocations, gridDimensionControls
                            , variationSettingsFlags, userText);
    makeGrid(domTool, contentElement, userText, fontSize, alignment
           , gridDimensionControls, varProperties, variationSettingsFlags
           , manualFontLeading);

    return {

        // Update will run if the proof is not re-initalized anyways.
        update: (changedDependencyNamesSet, fontSize
                , manualAxisLocations, alignment, variationSettingsFlags
                , gridDimensionControls, userText, manualFontLeading)=>{
            _setProperty(contentElement, 'alignment', alignment);
            const varProperties = applyPropertyChanges(contentElement, fontSize, manualAxisLocations
                                    , gridDimensionControls, variationSettingsFlags);


            if(['fontName', 'variationSettingsFlags', 'gridDimensionControls'].some(k=>changedDependencyNamesSet.has(k))) {
                makeGrid(domTool, contentElement, userText, fontSize, alignment
                        , gridDimensionControls, varProperties, variationSettingsFlags
                        , manualFontLeading);
                return;
            }
            if(changedDependencyNamesSet.has('fontSizeGrid'))
                contentElement.style.setProperty(FONT_SIZE_CUSTOM_PROPERTY, `${fontSize}`);

            if(changedDependencyNamesSet.has('manualFontLeading'))
                contentElement.style.setProperty('line-height', `${manualFontLeading}`);

            if(changedDependencyNamesSet.has('userText') )
                updateTextContent(contentElement, userText);
            // What follows is covered in makeLines as well
            if(!variationSettingsFlags.has('applyDefaultsExplicitly')) {
                // When the default are not explicitly applied, font-variation-settings
                // must be updated when the variation properties change, as
                // they may contain more or less axis than before..
                updateFontVariationsSettings(domTool, contentElement, varProperties);
            }
            if(changedDependencyNamesSet.has('manualAxisLocations') && variationSettingsFlags.has('displayParameters')){
                updateDisplayParameters(domTool, contentElement, varProperties, gridDimensionControls);
            }

        }
    };
}

