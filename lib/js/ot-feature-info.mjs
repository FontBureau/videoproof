/* jshint esversion: 11, unused:true, undef:true, laxcomma: true, laxbreak: true, devel: true */
// feature data collected from
// https://www.microsoft.com/typography/otspec/featuretags.htm ff.
// Why is there no machine readable version? -- Probably because
// everything is very vague over there.
//
// How to interprete this data:
//
// The purpose of this data is to provide a user interface for a font
// for turning features available in the font on and off.
// `friendlyName` used to name the feature  probably like this: "{tag} {friendlyName}"
// `uiBoolean`: Taken from "UI suggestion", can have three values:
//                                `false`, `true`, `null`
//              `false`: This feature is optional and must be turned on
//                       by the user. We'll primarily focus on making these
//                       features available
//              `true`: This feature is on by default. Usually because
//                      it is needed to display the font/script/language
//                      correctly.
//                      We could allow the user to turn these off, however
//                      for the specimen use case this is probably overkill.
//                      For a QA/font testing/inspection tool, this
//                      could be more interesting!
//                      Most prominent are examples like `kern` or `liga`
//                      For the specimen, maybe as a hidden/expandable menu
//                      option.
//              `null`: These features are in one or the other way special
//                      It's not easy to determine from the spec if they are
//                      on or off. They are sometimes "sub-features" that
//                      enable other user-selectable features to function
//                      or similar. We are going to ignore these in the first
//                      round, until good use cases emerge.
// `slSensitivity`: array, Taken from "Script/language sensitivity" This is
//                  basically none-data at the moment. It's here to give an
//                  idea of the lingusitic context where th e feature is used.
//                  An empty array usually means all scripts and languages.
//                  This may become useful in the future, if there is an idea
//                  how to use and represent the data properly
//
// For more information, look at the spec link above and consider adding
// it here, if it can be useful, including a little description above.
//
// Some fetures, like `salt` are non boolean. In css we can give these
// integer settings. For the moment, only boolean features should
// be supported. Thus, the others should be set to uiBoolean = null
export const featureData = Object.create(null);

featureData.aalt = {
    friendlyName: 'Access All Alternates'
    // special, not really useful for running text
    // not simple on/off
    // UI suggestion: The application should indicate to the user which
    // glyphs in the user’s document have alternative forms (i.e which are
    // in the coverage table for 'aalt'), and provide some means for the
    // user to select an alternate glyph.
  , uiBoolean: null
  , slSensitivity: []

};
featureData.abvf = {
    friendlyName: 'Above-base Forms'
  , uiBoolean: true
  , slSensitivity: ['Khmer script']
};
featureData.abvm = {
    friendlyName: 'Above-base Mark Positioning'
    // Control of the feature should not generally be exposed to the user.
  , uiBoolean: null
  , slSensitivity: ['Indic scripts']
};
featureData.abvs = {
    friendlyName: 'Above-base Substitutions'
    //  Control of the feature should not generally be exposed to the user.
  , uiBoolean: null
  , slSensitivity: ['Indic scripts']
};
featureData.afrc = {
    friendlyName: 'Alternative Fractions'
  , uiBoolean: false
  , slSensitivity: []
};
featureData.akhn = {
    friendlyName: 'Akhands'
    // Control of the feature should not generally be exposed to the user
  , uiBoolean: null
  , slSensitivity: ['Indic scripts']
};
featureData.blwf = {
    friendlyName: 'Below-base Forms'
    // Control of the feature should not generally be exposed to the user.
  , uiBoolean: null
  , slSensitivity: ['Indic scripts']
};
featureData.blwm = {
    friendlyName: 'Below-base Mark Positioning'
    // Control of the feature should not generally be exposed to the user.
  , uiBoolean: null
  , slSensitivity: ['Indic scripts']
};
featureData.blws = {
    friendlyName: 'Below-base Substitutions'
    // Control of the feature should not generally be exposed to the user.
  , uiBoolean: null
  , slSensitivity: ['Indic scripts']
};
featureData.calt = {
    friendlyName: 'Contextual Alternates'
  , uiBoolean: true
  , slSensitivity: []
};
featureData['case'] = {
    friendlyName: 'Case-Sensitive Forms'
    // "
    // It would be good to apply this feature (or turn it off) by
    // default when the user changes case on a sequence of more than
    // one character. Applications could also detect words consisting
    // only of capitals, and apply this feature based on user preference
    // settings.
    // "
  , uiBoolean: false
  , slSensitivity: ['European scripts', 'Spanish Language']
  , exampleText: '¡!(H-{E[L]L}O)'
};
featureData.ccmp = {
    friendlyName: 'Glyph Composition / Decomposition'
    // Control of the feature should not generally be exposed to the user.
   , uiBoolean: null
   , slSensitivity: []
};
featureData.cfar = {
    friendlyName: 'Conjunct Form After Ro'
    // Control of the feature should not generally be exposed to the user.
  , uiBoolean: null
  , slSensitivity: ['Khmer scripts']
};
featureData.chws = {
    friendlyName: 'Contextual Half-width Spacing'
    // This feature should not be used in combination with a layout engine
    // that independently provides advanced layout as described in CLREQ, JLREQ
    // or KLREQ. For applications that provide such advanced layout, it may
    // appropriate not to expose control of this feature to users. In
    // applications that do not support such advanced layout, this feature
    // should be enabled by default for horizontal layout of CJK text.
  , uiBoolean: null
  , slSensitivity: ['CJKV']
}
featureData.cjct = {
    friendlyName: 'Conjunct Forms'
    // Control of the feature should not generally be exposed to the user.
  , uiBoolean: null
  , slSensitivity: [' Indic scripts that show similarity to Devanagari']
};
featureData.clig = {
    friendlyName: 'Contextual Ligatures'
  , uiBoolean: true
  , slSensitivity: []
};
featureData.cpct = {
    friendlyName: 'Centered CJK Punctuation'
  , uiBoolean: false
  , slSensitivity: ['Chinese']
};
featureData.cpsp = {
    friendlyName: 'Capital Spacing'
    // This feature should be on by default.
    // Applications may want to allow the user to respecify the percentage to fit individual tastes and functions.
  , uiBoolean: true
  , slSensitivity: ['Should not be used in connecting scripts (e.g. most Arabic)']
};
featureData.cswh = {
    friendlyName: 'Contextual Swash'
    // Similar to aalt
    // This feature should be inactive by default. When implemented in
    // the font using an alternate substitution lookup, an application
    // could display the forms sequentially in context, or present a palette
    // showing all the forms at once, or give the user a choice between these
    // approaches. The application may assume that the first glyph in a
    // set is the preferred form, so the font developer should order them
    // accordingly.
  , uiBoolean: null
  , slSensitivity: []
};
featureData.curs = {
    friendlyName: 'Cursive Positioning'
    // This feature could be made active or inactive by default, at the user's preference.
    // (I don't know how this is handled, for Arabic I'd expect it to be
    // necessary to render the font properly if it is present. Actually
    // every font that contains this feature implies that it is needed
    // to make the font work fine ...)
  , uiBoolean: null
  , slSensitivity: []
};

// cv01-cv99 	 Character Variants
(function(featureData){
    var i, num, tag;
    for(i=1;i<100;i++) {
        num = ('0' + i).slice(-2);
        tag = 'cv' + num;
        featureData[tag] = {
            friendlyName: 'Character Variants ' + i
          // hmm: The Microsoft spec says these features have
          // a user-interface string: "featUiLabelNameId".
          // It would be nice to extract these  from the font if present.
          , uiBoolean: false
          , slSensitivity: []
        };
    }
})(featureData);

featureData.c2pc = {
    friendlyName: 'Petite Capitals From Capitals'
  , uiBoolean: false
  , slSensitivity: ['scripts with both upper- and lowercase forms', 'Latin', 'Cyrillic', 'Greek']
};
featureData.c2sc = {
    friendlyName: 'Small Capitals From Capitals'
  , uiBoolean: false
  , slSensitivity: ['bicameral scripts', 'Latin', 'Greek', 'Cyrillic', 'Armenian']
  , exampleText: 'HELLO WORLD'
};
featureData.dist = {
    friendlyName: 'Distances'
    //  This feature could be made active or inactive by default, at the user's preference.
    // Control of the feature should not generally be exposed to the user.
  , uiBoolean: null
  , slSensitivity: ['Indic scripts']
};
featureData.dlig = {
    friendlyName: 'Discretionary Ligatures'
  , uiBoolean: false
  , slSensitivity: []
  , exampleText: 'act stand (1) (7)'
};
featureData.dnom = {
    friendlyName: 'Denominators'
    // : In recommended usage, this feature is applied to sequences
    // automatically by applications when the 'frac' feature is used,
    // and direct user control is not required.
  , uiBoolean: null
  , slSensitivity: []
};
featureData.dtls = {
    friendlyName: 'Dotless Forms'
    // Control of the feature should not generally be exposed to the user.
  , uiBoolean: null
  , slSensitivity: ['math formula layout']
};
featureData.expt = {
    friendlyName: 'Expert Forms'
    // UI suggestion: Applications may choose to have this feature
    // active or inactive by default, depending on their target markets.
    // (I'd expect browsers to have it off by default. But actually:
    // "depending on their target markets" is not very helpful.
    // Maybe it is on when the script is Japanese?)
  , uiBoolean: null
  , slSensitivity: ['Japanese']
};
featureData.falt = {
    friendlyName: 'Final Glyph on Line Alternates'
    // This feature could be made active or inactive by default, at the user's preference.
  , uiBoolean: null
  , slSensitivity: ['any cursive script', 'Arabic']
};
featureData.fin2 = {
    friendlyName: 'Terminal Forms #2'
    // Control of the feature should not generally be exposed to the user.
  , uiBoolean: null
  , slSensitivity: ['Syriac']
};
featureData.fin3 = {
    friendlyName: 'Terminal Forms #3'
    // Control of the feature should not generally be exposed to the user.
  , uiBoolean: null
  , slSensitivity: ['Syriac']
};
featureData.fina = {
    friendlyName: 'Terminal Forms'
    // Control of the feature should not generally be exposed to the user.
  , uiBoolean: null
  , slSensitivity: ['script with joining behavior', 'Arabic']
};
featureData.flac = {
    friendlyName: 'Flattened accent forms'
    // Control of the feature should not generally be exposed to the user.
  , uiBoolean: null
  , slSensitivity: ['math formula layout']
};
featureData.frac = {
    friendlyName: 'Fractions'
  , uiBoolean: false
  , slSensitivity: []
  , exampleText: '1/2 1/4'
};
featureData.fwid = {
    friendlyName: 'Full Widths'
  , uiBoolean: false
  , slSensitivity: ['scripts which can use monospaced forms']
};
featureData.half = {
    friendlyName: 'Half Forms'
    // Control of the feature should not generally be exposed to the user.
  , uiBoolean: null
  , slSensitivity: [' Indic scripts that show similarity to Devanagari']
};
featureData.haln = {
    friendlyName: 'Halant Forms'
    // Control of the feature should not generally be exposed to the user.
  , uiBoolean: null
  , slSensitivity: ['Indic scripts']
};
featureData.halt = {
    friendlyName: 'Alternate Half Widths'
    // In general, this feature should be off by default.
  , uiBoolean: null
  , slSensitivity: ['CJKV']
};
featureData.hist = {
    friendlyName: 'Historical Forms'
  , uiBoolean: false
  , slSensitivity: []
  , exampleText: 'basic'
};
featureData.hkna = {
    friendlyName: 'Horizontal Kana Alternates'
  , uiBoolean: false
  , slSensitivity: ['hiragana', 'katakana']
};
featureData.hlig = {
    friendlyName: 'Historical Ligatures'
  , uiBoolean: false
  , slSensitivity: []
  , exampleText: 'ba\u017fic \u017fs \u017fl'
};
featureData.hngl = {
    // DEPRECATED in 2016
    friendlyName: 'Hangul'
  , uiBoolean: null
  , slSensitivity: ['Korean']
};
featureData.hojo = {
    friendlyName: 'Hojo Kanji Forms (JIS X 0212-1990 Kanji Forms)'
  , uiBoolean: false
  , slSensitivity: ['Kanji']
};
featureData.hwid = {
    friendlyName: 'Half Widths'
  , uiBoolean: false
  , slSensitivity: ['CJKV']
};
featureData.init = {
    friendlyName: 'Initial Forms'
    // Control of the feature should not generally be exposed to the user.
  , uiBoolean: null
  , slSensitivity: ['script with joining behavior', 'Arabic']
};
featureData.isol = {
    friendlyName: 'Isolated Forms'
    // Control of the feature should not generally be exposed to the user.
  , uiBoolean: null
  , slSensitivity: ['script with joining behavior', 'Arabic']
};
featureData.ital = {
    friendlyName: 'Italics'
    // When a user selects text and applies an Italic style,
    // an application should check for this feature and use it if present.
  , uiBoolean: false
  , slSensitivity: ['mostly Latin']
};
featureData.jalt = {
    friendlyName: 'Justification Alternates'
    //  This feature could be made active or inactive by default, at the user's preference.
  , uiBoolean: false
  , slSensitivity: ['any cursive script']
};
featureData.jp78 = {
    friendlyName: 'JIS78 Forms'
  , uiBoolean: false
  , slSensitivity: ['Japanese']
};
featureData.jp83 = {
    friendlyName: 'JIS83 Forms'
  , uiBoolean: false
  , slSensitivity: ['Japanese']
};
featureData.jp90 = {
    friendlyName: 'JIS90 Forms'
  , uiBoolean: false
  , slSensitivity: ['Japanese']
};
featureData.jp04 = {
    friendlyName: 'JIS2004 Forms'
  , uiBoolean: false
  , slSensitivity: ['Kanji']
};
featureData.kern = {
    friendlyName: 'Kerning'
  , uiBoolean: true
  , slSensitivity: []
};
featureData.lfbd = {
    friendlyName: 'Left Bounds'
    // This feature is called by an application when the user invokes
    // the opbd feature. See also: rtbd
  , uiBoolean: false
  , slSensitivity: []
};
featureData.liga = {
    friendlyName: 'Standard Ligatures'
  , uiBoolean: true
  , slSensitivity: []
};
featureData.ljmo = {
    friendlyName: 'Leading Jamo Forms'
    // Control of the feature should not generally be exposed to the user.
  , uiBoolean: null
  , slSensitivity: ['Hangul + Ancient Hangul']
};
featureData.lnum = {
    friendlyName: 'Lining Figures'
  , uiBoolean: false
  , slSensitivity: []
  , exampleText: '31337 H4X0R'
};
featureData.locl = {
    friendlyName: 'Localized Forms'
    // Control of the feature should not generally be exposed to the user directly.
  , uiBoolean: null
  , slSensitivity: []
};
featureData.ltra = {
    friendlyName: 'Left-to-right alternates'
    // Control of this feature should not generally be exposed to the user.
  , uiBoolean: null
  , slSensitivity: ['Left-to-right runs of text']
};
featureData.ltrm = {
    friendlyName: 'Left-to-right mirrored forms'
    // Control of this feature should not generally be exposed to the user.
  , uiBoolean: null
  , slSensitivity: ['Left-to-right runs of text']
};
featureData.mark = {
    friendlyName: 'Mark Positioning'
    // Control of this feature should not generally be exposed to the user.
  , uiBoolean: null
  , slSensitivity: []
};
featureData.med2 = {
    friendlyName: 'Medial Forms #2'
    // Control of this feature should not generally be exposed to the user.
  , uiBoolean: null
  , slSensitivity: ['Syriac']
};
featureData.medi = {
    friendlyName: 'Medial Forms'
    // Control of the feature should not generally be exposed to the user.
  , uiBoolean: null
  , slSensitivity: ['script with joining behavior', 'Arabic']
};
featureData.mgrk = {
    friendlyName: 'Mathematical Greek'
  , uiBoolean: false
  , slSensitivity: ['Greek script']
};
featureData.mkmk = {
    friendlyName: 'Mark to Mark Positioning'
    // Control of this feature should not generally be exposed to the user.
  , uiBoolean: null
  , slSensitivity: []
};
featureData.mset = {
    friendlyName: 'Mark Positioning via Substitution'
    // Positions Arabic combining marks in fonts for Windows 95 using glyph substitution
    // Note: This feature is not recommended for use in new fonts.
  , uiBoolean: null
  , slSensitivity: ['Arabic']
};
featureData.nalt = {
    friendlyName: 'Alternate Annotation Forms'
  , uiBoolean: false
  , slSensitivity: ['CJKV', 'European scripts']
  , exampleText: '359264'
};
featureData.nlck = {
    // The National Language Council (NLC) of Japan has defined new
    // glyph shapes for a number of JIS characters in 2000.
    friendlyName: 'NLC Kanji Forms'
  , uiBoolean: false
  , slSensitivity: ['Kanji']
};
featureData.nukt = {
    friendlyName: 'Nukta Forms'
    // Control of the feature should not generally be exposed to the user.
  , uiBoolean: null
  , slSensitivity: [' Indic scripts']
};
featureData.numr = {
    friendlyName: 'Numerators'
    // In recommended usage, this feature is applied to sequences
    // automatically by applications when the 'frac' feature is used,
    // and direct user control is not required.
  , uiBoolean: null
  , slSensitivity: []
};
featureData.onum = {
    friendlyName: 'Oldstyle Figures'
  , uiBoolean: false
  , slSensitivity: []
  , exampleText: '123678'
};
featureData.opbd = {// DEPRECATED
    friendlyName: 'Optical Bounds'
  , uiBoolean: true
  , slSensitivity: []
};
featureData.ordn = {
    friendlyName: 'Ordinals'
  , uiBoolean: false
  , slSensitivity: ['Latin']
  , exampleText: '1a 9a 2o 7o'
};
featureData.ornm = {
    friendlyName: 'Ornaments'
    // special UI suggestion
  , uiBoolean: null
  , slSensitivity: []
};
featureData.palt = {
    friendlyName: 'Proportional Alternate Widths'
  , uiBoolean: false
  , slSensitivity: ['CJKV']
};
featureData.pcap = {
    friendlyName: 'Petite Capitals'
  , uiBoolean: false
  , slSensitivity: ['scripts with both upper- and lowercase forms', 'Latin', 'Cyrillic', 'Greek']
};
featureData.pkna = {
    friendlyName: 'Proportional Kana'
  , uiBoolean: false
  , slSensitivity: ['Japanese']
};
featureData.pnum = {
    friendlyName: 'Proportional Figures'
  , uiBoolean: false
  , slSensitivity: []
  , exampleText: '123678'
};
featureData.pref = {
    friendlyName: 'Pre-Base Forms'
    //  Control of the feature should not generally be exposed to the user.
  , uiBoolean: null
  , slSensitivity: ['Khmer and Myanmar (Burmese) scripts']
};
featureData.pres = {
    friendlyName: 'Pre-base Substitutions'
    // Control of the feature should not generally be exposed to the user.
  , uiBoolean: null
  , slSensitivity: ['Indic scripts']
};
featureData.pstf = {
    friendlyName: 'Post-base Forms'
    // Control of the feature should not generally be exposed to the user.
  , uiBoolean: null
  , slSensitivity: ['scripts of south and southeast Asia that have post-base forms for consonants', 'Gurmukhi', 'Malayalam', 'Khmer']
};
featureData.psts = {
    friendlyName: 'Post-base Substitutions'
    // Control of the feature should not generally be exposed to the user.
  , uiBoolean: null
  , slSensitivity: ['any alphabetic script', 'Indic scripts']
};
featureData.pwid = {
    friendlyName: 'Proportional Widths'
    // Applications may want to have this feature active or inactive by default depending on their markets.
  , uiBoolean: null
  , slSensitivity: ['CJKV', 'European scripts']
};
featureData.qwid = {
    friendlyName: 'Quarter Widths'
  , uiBoolean: false
  , slSensitivity: ['CJKV']
};
featureData.rand = {
    friendlyName: 'Randomize'
    // When supported by the font, the feature should be enabled by default.
    // In recommended usage, the application selects a glyph alternate
    // automatically and does not need to present the alternates for the
    // user to make a selection.
  , uiBoolean: true
  , slSensitivity: []
};
featureData.rclt = {
    friendlyName: 'Required Contextual Alternates'
    // Control of this feature should not generally be exposed to the user.
  , uiBoolean: null
  , slSensitivity: ['any script', 'important for many styles of Arabic']
};
featureData.rkrf = {
    friendlyName: 'Rakar Forms'
    // Control of the feature should not generally be exposed to the user.
  , uiBoolean: null
  , slSensitivity: ['Devanagari', 'Gujarati']
};
featureData.rlig = {
    friendlyName: 'Required Ligatures'
    // Control of this feature should not generally be exposed to the user.
  , uiBoolean: null
  , slSensitivity: ['Arabic', 'Syriac', 'May apply to some other scripts']
};
featureData.rphf = {
    friendlyName: 'Reph Forms'
    //  Control of the feature should not generally be exposed to the user.
  , uiBoolean: null
  , slSensitivity: ['Indic scripts', 'Devanagari', 'Kannada']
};
featureData.rtbd = {
    friendlyName: 'Right Bounds'
    // UI suggestion: This feature should be inactive by default.
    // Applications may expose to users direct control of this feature
    // and also the Left Bounds feature ('lfbd'), or may automatically
    // activate the feature based on other paragraph layout settings.
  , uiBoolean: false
  , slSensitivity: []
};
featureData.rtla = {
    friendlyName: 'Right-to-left alternates'
    // Control of this feature should not generally be exposed to the user.
  , uiBoolean: null
  , slSensitivity: ['Right-to-left runs of text']
};
featureData.rtlm = {
    friendlyName: 'Right-to-left mirrored forms'
    // Control of this feature should not generally be exposed to the user.
  , uiBoolean: null
  , slSensitivity: ['Right-to-left runs of text']
};
featureData.ruby = {
    friendlyName: 'Ruby Notation Forms'
  , uiBoolean: false
  , slSensitivity: ['Japanese']
};
featureData.rvrn = {
    friendlyName: 'Required Variation Alternates'
    // The 'rvrn' feature is mandatory: it should be active by default and not directly exposed to user control.
  , uiBoolean: null
  , slSensitivity: []
};
featureData.salt = {
    friendlyName: 'Stylistic Alternates'
    // Cmplicated UI
    // This feature should be inactive by default. When implemented in
    // the font using an alternate substitution lookup, an application
    // could display the forms sequentially in context, or present a
    // palette showing all the forms at once, or give the user a choice
    // between these approaches. The application may assume that the
    // first glyph in a set is the preferred form, so the font developer
    // should order them accordingly.
  , uiBoolean: null
  , slSensitivity: []
};
featureData.sinf = {
    friendlyName: 'Scientific Inferiors'
  , uiBoolean: false
  , slSensitivity: []
  , exampleText: '1902835746'
};
featureData.size = {
    // Note: Use of this feature has been superseded by the STAT table.
    friendlyName: 'Optical size'
    // This feature should be active by default. Applications may want
    // to present the tracking curve to the user for adjustments via a GUI
  , uiBoolean: null
  , slSensitivity: []
};
featureData.smcp = {
    friendlyName: 'Small Capitals'
  , uiBoolean: false
  , slSensitivity: [' bicameral scripts', 'Latin', 'Greek', 'Cyrillic', 'Armenian']
  , exampleText: "Hello World"
};
featureData.smpl = {
    friendlyName: 'Simplified Forms'
  , uiBoolean: false
  , slSensitivity: ['Chinese', 'Japanese']
};
// ss01-ss20 Stylistic Sets
(function(featureData) {
    var i, num, tag;
    for(i=1;i<21;i++) {
        num = ('0' + i).slice(-2);
        tag = 'ss' + num;
        featureData[tag] = {
            // It seems these features can reference a custom name
            // in the name table
            friendlyName: 'Stylistic Set ' + i
          , uiBoolean: false
          , slSensitivity: []
        };
    }
})(featureData);
featureData.ssty = {
    friendlyName: 'Math script style alternates'
    // Control of the feature should not generally be exposed to the user.
  , uiBoolean: null
  , slSensitivity: ['math formula layout']
};
featureData.stch = {
    friendlyName: 'Stretching Glyph Decomposition'
    // Control of this feature should not generally be exposed to the user.
  , uiBoolean: null
  , slSensitivity: []
};
featureData.subs = {
    friendlyName: 'Subscript'
  , uiBoolean: false
  , slSensitivity: []
  , exampleText: 'a1 b4 c9'
};
featureData.sups = {
    friendlyName: 'Superscript'
  , uiBoolean: false
  , slSensitivity: []
  , exampleText: 'x2 y5 z7'
};
featureData.swsh = {
    friendlyName: 'Swash'
    // Often more complicated than on/off:
    // UI suggestion: This feature should be inactive by default. When
    // implemented in the font using an alternate substitution lookup,
    // an application could display the alternate forms sequentially in
    // context, or present a palette showing all the forms at once, or
    // give the user a choice between these approaches. The application
    // may assume that the first glyph in a set is the preferred form,
    // so the font developer should order them accordingly.
  , uiBoolean: false
  , slSensitivity: ['Does not apply to ideographic scripts']
};
featureData.titl = {
    friendlyName: 'Titling'
  , uiBoolean: false
  , slSensitivity: []
};
featureData.tjmo = {
    friendlyName: 'Trailing Jamo Forms'
    // Control of this feature should not generally be exposed to the user.
  , uiBoolean: null
  , slSensitivity: ['Hangul + Ancient Hangul']
};
featureData.tnam = {
    friendlyName: 'Traditional Name Forms'
  , uiBoolean: false
  , slSensitivity: ['Japanese']
};
featureData.tnum = {
    friendlyName: 'Tabular Figures'
  , uiBoolean: false
  , slSensitivity: []
  , exampleText: '123678'
};
featureData.trad = {
    friendlyName: 'Traditional Forms'
    // not trivial
  , uiBoolean: null
  , slSensitivity: ['Chinese', 'Japanese']
};
featureData.twid = {
    friendlyName: 'Third Widths'
  , uiBoolean: false
  , slSensitivity: ['CJKV']
};
featureData.unic = {
    friendlyName: 'Unicase'
  , uiBoolean: false
  , slSensitivity: ['scripts with both upper- and lowercase forms', 'Latin', 'Cyrillic', 'Greek']
};
featureData.valt = {
    friendlyName: 'Alternate Vertical Metrics'
    // This feature should be active by default in vertical-setting contexts.
  , uiBoolean: null
  , slSensitivity: ['scripts with vertical writing modes']
};
featureData.vatu = {
    friendlyName: 'Vattu Variants'
    // Control of the feature should not generally be exposed to the user.
  , uiBoolean: null
  , slSensitivity: ['Indic scripts', 'Devanagari']
};
featureData.vchw = {
    friendlyName: 'Vertical Contextual Half-width Spacing'
    // This feature should not be used in combination with a layout engine
    // that independently provides advanced layout as described in CLREQ,
    // JLREQ or KLREQ. For applications that provide such advanced layout,
    // it may appropriate not to expose control of this feature to users.
    // In applications that do not support such advanced layout, this
    // feature should be enabled by default for vertical layout of CJK text.
  , uiBoolean: null
  , slSensitivity: ['CJKV']
};
featureData.vert = {
    friendlyName: 'Vertical Alternates'
    // This feature should be active by default in vertical writing mode.
  , uiBoolean: null
  , slSensitivity: ['scripts with vertical writing capability.']
};
featureData.vhal = {
    friendlyName: 'Alternate Vertical Half Metrics'
    // In general, this feature should be off by default. Different behavior
    // should be used, however, in applications that conform to Requirements
    // for Japanese Text Layout (JLREQ) or similar CJK text-layout
    // specifications that expect half-width forms of characters whose
    // default glyphs are full-width. Such implementations should turn
    // this feature on by default, or should selectively apply this feature
    // to particular characters that require special treatment for CJK
    // text-layout purposes, such as brackets, punctuation, and quotation marks.
  , uiBoolean: false
  , slSensitivity: ['CJKV']
};
featureData.vjmo = {
    friendlyName: 'Vowel Jamo Forms'
    // Control of the feature should not generally be exposed to the user.
  , uiBoolean: null
  , slSensitivity: ['Hangul + Ancient Hangul']
};
featureData.vkna = {
    friendlyName: 'Vertical Kana Alternates'
  , uiBoolean: false
  , slSensitivity: ['hiragana', 'katakana']
};
featureData.vkrn = {
    friendlyName: 'Vertical Kerning'
    //  This feature should be active by default for vertical text setting.
    // Applications may wish to allow users to add further manually-specified
    // adjustments to suit specific needs and tastes.
  , uiBoolean: true
  , slSensitivity: []
};
featureData.vpal = {
    friendlyName: 'Proportional Alternate Vertical Metrics'
  , uiBoolean: false
  , slSensitivity: ['CJKV']
};
featureData.vrt2 = {
    friendlyName: 'Vertical Alternates and Rotation'
    // This feature should be active by default when vertical writing mode is on,
    // although the user must be able to override it.
    // (don't know if I can determine if "vertical writing mode").
  , uiBoolean: true
  , slSensitivity: ['scripts with vertical writing capability']
};
featureData.vrtr = {
    friendlyName: 'Vertical Alternates for Rotation'
    // This feature should always be active by default for sideways runs in vertical writing mode
  , uiBoolean: true
  , slSensitivity: []
};
featureData.zero = {
    friendlyName: 'Slashed Zero'
  , uiBoolean: false
  , slSensitivity: []
  , exampleText: '0123'
};

function _deepFreeze(object) {
    // Retrieve the property names defined on object
    const propNames = Object.getOwnPropertyNames(object);

    // Freeze properties before freezing self
    for (const name of propNames) {
        const value = object[name];

        if (value && typeof value === "object") {
          _deepFreeze(value);
        }
    }
    return Object.freeze(object);
}



// Don't want returned sub objects to be changeable by a client:
_deepFreeze(featureData);

function _getSubset(filter) {
    const data = Object.create(null);
    for(const tag of Object.keys(featureData)) {
        if(!filter(featureData[tag]))
            continue;
        data[tag] = featureData[tag];
    }
    Object.freeze(data);
    return data;
}

export const OTFeatureInfo = {
    all: featureData
  , optional: _getSubset(item=>item.uiBoolean === false)
  , defaults: _getSubset(item=>item.uiBoolean === true)
  , unknown: _getSubset(item=>item.uiBoolean === null)
  , getFeature(tag) {
        return featureData[tag];
    }
  , getSubset(key, tags) {
        var data = this[key]
          , result = Object.create(null)
          ;
        for(const tag of tags) {
            if(tag in data)
                result[tag] = data[tag];
        }
        return result;
    }
};
Object.freeze(OTFeatureInfo);
