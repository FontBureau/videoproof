/* jshint esversion: 11, browser: true, unused:true, undef:true, laxcomma: true, laxbreak: true, devel: true */

import DOMTool from '../domTool.mjs';

function fitToSpace(element) {
    // Original, when extended text is present, doesn't do
    // white-space: nowrap, I don't know the reason.
    // it also puts extended chars into a new span with extra class, but
    // the class is never used in css and it creates bad fitting.

    // element.style.whiteSpace = 'nowrap';


    // fixed point for measurement
    let tmpFontSizePx = 16;
    element.style.fontSize = `${tmpFontSizePx}px`;
    // for measurement this will have to be a display mode that expands
    // to firt the available space.
    element.style.display = 'block';


    // We could add an option: "avoid line breaks" and then use.
    // VideoProof.setWidest();
    // If we are not using setWidest, should we set another default?
    // We could also be setting another font size per animation frame
    // but that would likely work look very well...
    let win = element.ownerDocument.defaultView
      // , winHeight = win.innerHeight - 96
      , bBox = element.getBoundingClientRect()
        // FIXME: I'd like to do this differently! why 96 anyways???
        //        I'm now using 217, but it's still arbitrary!
      , availableHeightPx = win.innerHeight - (217)
      , availableWidthPx = bBox.width
      , content = element.firstChild
      , contentWidthPX = content.getBoundingClientRect().width
      , contentWidthEm = contentWidthPX/tmpFontSizePx
      , fontSizeWidthPx = availableWidthPx/contentWidthEm
        // FIXME: hard-coded line-height ...
      , fontSizeHeightPx = availableHeightPx/1.5
      , fontSizePx = Math.min(fontSizeHeightPx, fontSizeWidthPx)
      , fontSizePt = fontSizePx * 0.75
      ;
    //VideoProof.unsetWidest();
    element.style.fontSize = `${fontSizePt}pt`;
    element.style.padding = 0;
    return fontSizePt;
}

function _getSelectedChars(getSelectedCharsets, showExtended) {
    let [charset, extendedChars] = getSelectedCharsets();
    if(showExtended)
        return [...charset, ...extendedChars];
    return charset;
}

function _testCharType(extendedCharGroups, c, re) {
    if (re.test(c))
        return true;
    //checks all items in extendedCharGroups
    for(let [k, extChars] of Object.entries(extendedCharGroups)) {
        if (!re.test(k))
            continue;
        if(extChars.indexOf(c) != -1)
            return true;
    }
    return false;
}

function _formatAuto(mode, autoFormatter, c) {
    for(let [test, format] of autoFormatter) {
        if(test(c))
            return format(c);
    }
    throw new Error(`Don't know how to format "${c}" in mode: ${mode}.`);
}

function _formatCustom(customPad, c) {
    return `${customPad}${c}${customPad}`;
}

function* _kernPaddingGen(outer, inner) {
    for(let o of outer)
        for(let i of inner)
            yield [o, i];
}

const _autoFormatters = {
            'auto-short': [
                ['isNumeric', c=>`00${c}00`]
              , ['isLowercase', c=>`nn${c}nn`]
                // default, also isUppercase:
              , ['default', c=>`HH${c}HH`]
            ]
          , 'auto-long': [
                    ['isNumeric', c=>`00${c}0101${c}11`]
                  , ['isLowercase', c=>`nn${c}nono${c}oo`]
                    // default, also isUppercase:
                  , ['default', c=>`HH${c}HOHO${c}OO`]
            ]
      }
    , _kernFormatters = {
            'kern-upper': ([o, i])=>`HO${o}${i}${o}OLA`
          , 'kern-mixed': ([o, i])=>`${o}${i}nnoy`
          , 'kern-lower': ([o, i])=>`no${o}${i}${o}ony`
      }
    , _kernModesCharsConfig = { // mode: [charsKey, outer]
            'kern-upper': ['Latin.Uppercase', undefined]
                                              // CUSTOM! outer
          , 'kern-mixed': ['Latin.Lowercase', [..."ABCDEFGHIJKLMNOPQRSTUVWXYZ"]]
          , 'kern-lower': ['Latin.Lowercase', undefined]
      }
    ;

function _getKernChars(getCharsForKey, showExtended, mode) {
    if(!(mode in _kernModesCharsConfig))
        throw new Error(`Don't now how to get chars for mode: "${mode}".`);
    const [charsKey, customOuter] = _kernModesCharsConfig[mode]
        , [chars, extendedCharset] = getCharsForKey(charsKey)
        , outer = customOuter !== undefined ? customOuter : chars
        , inner = showExtended
                ? [...chars, ...extendedCharset]
                : chars
        ;
    console.log('_getKernChars', mode, showExtended);
    console.log('outer', outer.join(''));
    console.log('inner', inner.join(''));
    return [outer, inner];
}

function _getWords(getSelectedCharsets, getCharsForKey, showExtended
                 , extendedCharGroups, padMode, customPad) {

        // All only latin!
    let _formatterTests = {
            'isNumeric':  c=>_testCharType(extendedCharGroups, c, /[0-9]/)
            // , 'isUppercase': = c=>_testCharType(extendedCharGroups, c, /[A-Z]/)
          , 'isLowercase': c=>_testCharType(extendedCharGroups, c, /[a-z]/)
          , 'default': ()=>true
        }
      , _getAutoFormatter = padMode=>{
            let description = _autoFormatters[padMode]
              , result = []
              ;
            for(let [testName, format] of description) {
                result.push([_formatterTests[testName], format]);
            }
            return result;
        }
      , words = []
      ;

    let chars, formatter;
    if(padMode in _kernFormatters) {
        let [outerChars, innerChars] = _getKernChars(getCharsForKey, showExtended, padMode);
        chars = _kernPaddingGen(outerChars, innerChars);
        formatter = _kernFormatters[padMode];
    }
    else if(customPad.length) {
        chars = _getSelectedChars(getSelectedCharsets, showExtended);
        formatter = c=>_formatCustom(customPad, c);
    }
    else if(padMode in _autoFormatters) {
        chars = _getSelectedChars(getSelectedCharsets, showExtended);
        formatter = c=>_formatAuto(padMode, _getAutoFormatter(padMode), c);
    }
    else
        throw new Error(`Don't know how to handle mode: "${padMode}".`);

    for(let c of chars)
        words.push(formatter(c));
    if(padMode in _kernFormatters)
        // Dunno why! Behavior form legacy code.
        words.push(0);
    return words;
}

export function init(proofElement, getSelectedCharsets, getCharsForKey
                   , fixLineBreaks, showExtended, extendedCharGroups
                   , padMode, customPad) {
    const domTool = new DOMTool(proofElement.ownerDocument)
      , words = _getWords(getSelectedCharsets, getCharsForKey, showExtended
                        , extendedCharGroups, padMode, customPad)
      , cells = []
      ;

    domTool.clear(proofElement);
    for(let i=0,l=words.length;i<l;i++) {
        if (i > 0)
            cells.push(' ');
        cells.push(domTool.createElement('span', {}, words[i]));
    }
    proofElement.append(...cells);
    // fixLineBreaks(proofElement);
}
