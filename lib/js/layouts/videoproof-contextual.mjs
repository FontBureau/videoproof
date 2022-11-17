/* jshint esversion: 11, browser: true, unused:true, undef:true, laxcomma: true, laxbreak: true */

import DOMTool from '../domTool.mjs';

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
    return [outer, inner];
}

function _getWords(selectedChars, getCharsForKey, showExtended
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
    else if(padMode === 'custom') {
        chars = selectedChars;
        formatter = c=>_formatCustom(customPad, c);
    }
    else if(padMode in _autoFormatters) {
        chars = selectedChars;
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

export function init(proofElement, selectedChars, getCharsForKey
                   , fixLineBreaks, showExtended, extendedCharGroups
                   , padMode, customPad) {
    const domTool = new DOMTool(proofElement.ownerDocument)
      , words = _getWords(selectedChars, getCharsForKey, showExtended
                        , extendedCharGroups, padMode, customPad)
      , cells = []
      ;

    domTool.clear(proofElement);
    for(let i=0,l=words.length;i<l;i++) {
        cells.push(domTool.createElement('span', {}, `${words[i]} `));
    }
    proofElement.append(...cells);
    fixLineBreaks(proofElement);
}
