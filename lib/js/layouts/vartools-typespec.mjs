/* jshint browser: true, esversion: 9, laxcomma: true, laxbreak: true, unused:true, undef:true */
import { handleEditableLine, handleEditableDiv } from '../content-editable.mjs';

// from https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object/freeze
function deepFreeze(object) {
  // Retrieve the property names defined on object
  const propNames = Object.getOwnPropertyNames(object);

  // Freeze properties before freezing self

  for (const name of propNames) {
    const value = object[name];

    if (value && typeof value === "object") {
      deepFreeze(value);
    }
  }

  return Object.freeze(object);
}

/**
 * I keep this as a reference, there's now a more compact template language
 * that can build an equivalent of the legacy template markup below.
const template = `<article spellcheck="false">
    <div class="H1 row">
        <label>H1</label>
        <h1 class='H1-target' contenteditable>Heading One</h1>
    </div>
    <div class="H2 row">
        <label>H2</label>
        <h2 class='H2-target' contenteditable>Heading Two</h2>
    </div>
    <div class="H3 row">
        <label>H3</label>
        <h3 class='H3-target' contenteditable>Heading Three</h3>
    </div>
    <div class="T1 row">
        <label>T1</label>
        <div class="T1-target" contenteditable>
            <p>Intro text leads reader into the article by the nose, with grace and dignity and a little pithy charm. Typeface has changed to the appropriate optical size by the miracle of modern typography.
            </p>
        </div>
    </div>
    <div class="T2 row">
        <label>T2</label>
        <div class="T2-target" contenteditable>
            <p>Johannes Gutenberg’s work on the printing press began in approximately 1436 when he partnered with Andreas Heilmann, owner of a paper mill. Having previously worked as a goldsmith, Gutenberg made skillful use of the knowledge of metals he had learned as a craftsman. He was the first to make type from an alloy of lead, tin, and antimony, which was critical for producing durable type that produced high-quality printed books and proved to be much better suited for printing than all other known materials.
            </p>
            <p>Επειδη δε κοινη το των Αρκαδων εθνος
εχει τινα παρα πασι τοις Ελλησιν επ αρετη
φημην, ου μονον δια ρην εν τοις ηθεσι και βιοις
φιλοξενιαν και φιλανθρωπιαν, μαλιστα δε δια
την εις το θειον ευσεβειαν, αξιον βραχυ διαπορησαι
περι της Κυναιθεων αγριοτητος, πως οντες
ομολογουμενως Αρκαδες τοσουτο κατ εκεινους
τοθς καιπους διηνεγκαν των αλλων Ελληνων
ωμοτητι και παρανομια. δοκαυσι δε μοι, διοτι
τα καλως υπο των αρχαιων επινενοημενα και
φυσικως συντεθεωρημενα περι παντας τους
κατοικουντας την Αρκαδιαν, ταυτα δη πρωτοι και
μονοι Αρκαδων εγκατελιπον. μουσικην γαρ, την
γ αληθως μουσικην, πασι μεν ανθρωποις οφελος
ασκειν Αρκασι δε και αναγκαιον. ου γαρ ηγητεον
μουσικην, ως Εφορος φησιν εν τω προοιμιω της
ολης προγματειας, ουδαμως αρμοζοντα λογον
αυτω πιψας, επ απατη και γοητεια παραισηχθαι
τοις ανθρωποις, ουδε τους παλαιοθς Κρητων
και Λακεδαιμονιων αυλον και ρυθμον εις
τον πολεμον αντι σαλπιγγος εικη νομιστεον
εισαγαγειν, ουδε τους πρωτους Αρκαδων εις την
ολην πολιτειαν την μοθσικην παραλαβειν επι
τοσουτον ωστε μη μονον παισιν ουσιν, αλλα ακι
νεανισκοις γενομενοις εως τριακοντ ετων κατ
αναγκην ουντροφον ποιειν αυτην, ταλλα τοις
βιοις οντας αυστηροτατους.
            </p>
            <p>В глубоких и темных водах Антарктики ученые обнаружили невероятное изобилие до сих пор неизвестных видов морской жизни. Исследователи открыли более 700 новых видов морских существ в морях, которые раньше считались слишком неблагоприятными для существования большого биологического разнообразия. Эти темные воды буквально кишат стаями хищных губок, свободноплавающих червей, ракообразных и моллюсков. Доклад о новых видах фауны был опубликован в журнале Nature. “То, что раньше считалось пустой бездной, на поверку оказалось динамичной, меняющейся и биологически богатой средой”, - сказала одна из соавторов документа, морской биолог Британского общества исследования Антарктики доктор Кэтрин Линс. “Находка этой сокровищницы морской живности - наш первый шаг на пути к пониманию сложного взаимоотношения глубоких океанов и распределения морской жизни”, - добавила она. Науке это пока неизвестно. Исследование антарктических вод было проведено в рамках проекта Andeep, изучающего биологическое разнообразие глубоководного антарктического дна. Один из ранее неизвестных ракообразных (Cylindrarcturus), найденных в Антарктитке Исследователи не ожидали обнаружить такого разнобразия морской жизни Проект призван заполнить “вакуум знаний” о фауне, населяющей самые глубокие воды Южного океана.
            </p>
            <p>我的征途是星辰大海 "My Conquest is the Sea of Stars", a famous sentence in Legend Of The Galactic Heroes
            </p>
            <p>很久很久以前，在一个遥远的星系 "A long time ago in a galaxy far, far away", a famous sentence in Star Wars
            </p>
        </div>
    </div>
</article>
`;
*/

/**
 * ABOUT TEMPLATES
 *
 * With the template language we can have the whole template or a diff/patch
 * of it transported in a very compact manner, without much overhead for
 * markup. That is achieved by using a simple tag/content format:
 *      {TAG} Label[attributes]: content
 *      NOTE: "label" and "[attributes]" are optional].
 * Each line establsishes a new element, if it starts with a tag, matched
 * according to the format above. Otherwise, the line will be ammended to
 * the previous line, *including the line break*.
 * Lines that end with a backslash (in Javascript often `\\` as it escapes
 * itself, but `String.raw` can be used to prevent escaping from javascript input)
 * are escaping the line break and thus do not end. That way, a tag
 * at the beginning of a newline can be included literally into the text of
 * the line before, but, more importantly, line breaks can be introduced
 * for formatting without having them appear literally in the text.
 *
 * Soft-line and spaces are supported in T elements, hence they show up
 * when present. This makes editing the text feel much more natural in
 * contenteditable.
 * If I decide to put into this a Text with a new line followed by a "tag" string
 * the newline should be escaped, by the serializing code
 *
 * T T1: text\
 * T T2: this is not a new text element\
 * !p:this is not a new paragraph
 *
 * Consequently, the backslash must be escaped as well, if it does not
 * escape the new line
 *
 * T T1: text that ends with a backslash\\
 * T T2: this *is* a new text element that ends with a backslash\\
 * !p:this is a a new paragraph
 *
 * Add untagged lines to element before.
 *
 * T T1: text that ends with a backslash\\
 * !p:this is a a new paragraph
 *
 * this is part of the paragraph and there's a newline before.
 */

export const template = deepFreeze({
    content: String.raw`H1 H1:Heading One
H2 H2:Heading Two
H3 H3:Heading Three
T T1:Intro text leads reader into the article by the nose, with grace and \
dignity and a little pithy charm. Typeface has changed to the appropriate \
optical size by the miracle of modern typography.
T T2:Johannes Gutenberg’s work on the printing press began in approximately 1436 when he partnered with Andreas Heilmann, owner of a paper mill. Having previously worked as a goldsmith, Gutenberg made skillful use of the knowledge of metals he had learned as a craftsman. He was the first to make type from an alloy of lead, tin, and antimony, which was critical for producing durable type that produced high-quality printed books and proved to be much better suited for printing than all other known materials.
!p:Επειδη δε κοινη το των Αρκαδων εθνος εχει τινα παρα πασι τοις Ελλησιν επ αρετη φημην, ου μονον δια ρην εν τοις ηθεσι και βιοις φιλοξενιαν και φιλανθρωπιαν, μαλιστα δε δια την εις το θειον ευσεβειαν, αξιον βραχυ διαπορησαι περι της Κυναιθεων αγριοτητος, πως οντες ομολογουμενως Αρκαδες τοσουτο κατ εκεινους τοθς καιπους διηνεγκαν των αλλων Ελληνων ωμοτητι και παρανομια. δοκαυσι δε μοι, διοτι τα καλως υπο των αρχαιων επινενοημενα και φυσικως συντεθεωρημενα περι παντας τους κατοικουντας την Αρκαδιαν, ταυτα δη πρωτοι και μονοι Αρκαδων εγκατελιπον. μουσικην γαρ, την γ αληθως μουσικην, πασι μεν ανθρωποις οφελος ασκειν Αρκασι δε και αναγκαιον. ου γαρ ηγητεον μουσικην, ως Εφορος φησιν εν τω προοιμιω της ολης προγματειας, ουδαμως αρμοζοντα λογον αυτω πιψας, επ απατη και γοητεια παραισηχθαι τοις ανθρωποις, ουδε τους παλαιοθς Κρητων και Λακεδαιμονιων αυλον και ρυθμον εις τον πολεμον αντι σαλπιγγος εικη νομιστεον εισαγαγειν, ουδε τους πρωτους Αρκαδων εις την ολην πολιτειαν την μοθσικην παραλαβειν επι τοσουτον ωστε μη μονον παισιν ουσιν, αλλα ακι νεανισκοις γενομενοις εως τριακοντ ετων κατ αναγκην ουντροφον ποιειν αυτην, ταλλα τοις βιοις οντας αυστηροτατους.
!p:В глубоких и темных водах Антарктики ученые обнаружили невероятное изобилие до сих пор неизвестных видов морской жизни. Исследователи открыли более 700 новых видов морских существ в морях, которые раньше считались слишком неблагоприятными для существования большого биологического разнообразия. Эти темные воды буквально кишат стаями хищных губок, свободноплавающих червей, ракообразных и моллюсков. Доклад о новых видах фауны был опубликован в журнале Nature. “То, что раньше считалось пустой бездной, на поверку оказалось динамичной, меняющейся и биологически богатой средой”, - сказала одна из соавторов документа, морской биолог Британского общества исследования Антарктики доктор Кэтрин Линс. “Находка этой сокровищницы морской живности - наш первый шаг на пути к пониманию сложного взаимоотношения глубоких океанов и распределения морской жизни”, - добавила она. Науке это пока неизвестно. Исследование антарктических вод было проведено в рамках проекта Andeep, изучающего биологическое разнообразие глубоководного антарктического дна. Один из ранее неизвестных ракообразных (Cylindrarcturus), найденных в Антарктитке Исследователи не ожидали обнаружить такого разнобразия морской жизни Проект призван заполнить “вакуум знаний” о фауне, населяющей самые глубокие воды Южного океана.
!p:我的征途是星辰大海 "My Conquest is the Sea of Stars", a famous sentence in Legend Of The Galactic Heroes
!p:很久很久以前，在一个遥远的星系 "A long time ago in a galaxy far, far away", a famous sentence in Star Wars`
  , defaults: [
        {fontSize: 64, fontLeading: [0 /* UIFontLeading.MODE_AUTO is 0 */], alignment: 'l', manualAxisLocations: []}
      , {fontSize: 25, fontLeading: [0 /* UIFontLeading.MODE_AUTO is 0 */], alignment: 'l', manualAxisLocations: []}
      , {fontSize: 18, fontLeading: [0 /* UIFontLeading.MODE_AUTO is 0 */], alignment: 'l', manualAxisLocations: []}
      , {fontSize: 18, fontLeading: [0 /* UIFontLeading.MODE_AUTO is 0 */], alignment: 'l', manualAxisLocations: []}
      , {fontSize: 14, fontLeading: [0 /* UIFontLeading.MODE_AUTO is 0 */], alignment: 'l', manualAxisLocations: []}
    ]
});
/**
 * ABOUT CONTENTEDITABLE
 *
 * "contenteditable" is kind of a beast, as it is possible to insert very
 * reach HTML, especially via copy paste of other html. We wan't to restrict
 * these capabilities, to have a controllable environment:
 *
 * <h1>-<h6>: only allow pure text content.
 * <div>: all children are <p> allow to insert new paragraphs (press enter
 * or paste)
 *
 * Even for the template above, but also later for all changes we need
 * at some point normalization. The initial normalization of the template
 * is meant to ensure that diffs are eqivalent and minimal, e.g. we can
 * remove white-space that is only for html formatting.
 *
 */

/**
 * ABOUT TEMPLATE-TAGS
 * s flag is RegExp.prototype.dotAll: dit matches newlines, hence content can contain newlines
 *
 * tag group: A-Z followed by one or more A-Z0-9 (all uppercase)
 * zero or more spaces
 * label optional group: word characters and spaces
 * attribues optional group: all within [], returns the brackets as well
 * a colon : (not captured)
 * content group: everything to the end, includes newlines
 */
const TAG_REGEX = /^(?<tag>[A-Z][A-Z0-9]*) *(?<label>[\w ]+)?(?<attributes>\[.*\])?:(?<content>.*)$/s; // jshint ignore:line
function _parseTag(str, ...lines) {
    let match = str.match(TAG_REGEX)
      , {tag, label, attributes, content} = match
                ? match.groups
                : {content: str}
      , contenLines = [content, ...lines]
      ;
    if(attributes)
        // TODO: Not parsed yet, but this removes the brackets.
        attributes = attributes.slice(1,-1);
    return {tag, label, attributes, content: contenLines};
}

function _parseHeading({tag, label, attributes, contents}) {
    return {
        type: 'heading'
      , htmlTag: tag.toLowerCase()
      , label
      , attributes
      , textContent: contents.map(line=>line.join('')).join('\n')
    };
}

function _parseText({tag, label, attributes, contents}) {
    let paragraph = [];
    const paragraphs = [paragraph]
      , NEW_PARAGRAPH = '!p:'
      ;
    for(const [lineHead, ...lineTail] of contents) {
        if(lineHead.startsWith(NEW_PARAGRAPH)){
            paragraph = [lineHead.slice(NEW_PARAGRAPH.length), ...lineTail];
            paragraphs.push(paragraph);
        }
        else

            if(paragraph.length)
                // not first line
                paragraph.push('\n');
            // first Line and lines that follow and don't start with a tag
            // or NEW_PARAGRAPH marker.
            paragraph.push(lineHead, ...lineTail);
    }
    return {
        type: 'text'
      , label
      , attributes
      , paragraphs: paragraphs.map(lines=>lines.join(''))
    };
}

const TEMPLATE_PARSERS = {
    T: _parseText
  , H1: _parseHeading
  , H2: _parseHeading
  , H3: _parseHeading
  , H4: _parseHeading
  , H5: _parseHeading
  , H6: _parseHeading
};

function _parseTemplate(template) {
    const rawLines = template.split('\n')
      , BACKSLASH = '\\' // a single backslash
      ;
    let appendLine = false
      , items = []
      ;

    for(let i=0,l=rawLines.length;i<l;i++) {
        // does the line escape a newline?
        // or does it end with a backslash?

        // a double backslash represents a literal backslash
        // a single backslash, if at the end of the line, represents an
        // escaped line break
        // a single backslash, if not escaping anything, will be removed!
        const lineParts = rawLines[i].split(`${BACKSLASH + BACKSLASH}`)
          , lastPart = lineParts[lineParts.length-1]
            // This means the next line is part of this line and the
            // Newline in between is a literal newline
          , lineEndsWithEscape = lastPart[lastPart.length-1] === BACKSLASH
            // Could unescape other escape sequences here, but there aren't any as of now.
            // remove single backslashes
          , unescapedLine = lineParts.map(line=>line.replaceAll(BACKSLASH, ''))
                // insert literal backslashes
                .join(BACKSLASH)
          ;
        if(appendLine)
            // add to old line
            items[items.length-1].push(unescapedLine);
        else
            // new line
            items.push([unescapedLine]);
        appendLine = lineEndsWithEscape;
    }

    const taggedItems = [];
    for(const item of items) {
        const {tag, label, attributes, content} = _parseTag(...item);
        let taggedItem;
        if(tag) {
            taggedItem = {
                tag
              , label
              , attributes
              , contents: []
            };
            taggedItems.push(taggedItem);
        }
        else {
            // Lines that don't start with a tag will just added to the current open element.
            taggedItem = taggedItems[taggedItems.length-1];
        }
        if(!taggedItem) continue; // Can only happen at the beginning;
        taggedItem.contents.push(content);
    }
    let result = [];
    for(const taggedItem of taggedItems) {
        const parse = TEMPLATE_PARSERS[taggedItem.tag];
        if(!parse) {
            console.warn(`Skipping unkown tag "${taggedItem.tag}" of item:`, taggedItem);
            continue;
        }
        result.push(parse(taggedItem));
    }
    return result;
}

// TODO: could go ditectly into DOMTools
function createElementAndChildren(domTool, tag, attributes, childDescriptions) {
    return domTool.createElement(
        tag,
        attributes,
        Array.isArray(childDescriptions)
            ? childDescriptions.map(child=>(typeof child === 'string')
                                ? domTool.createTextNode(child)
                                : createElementAndChildren(domTool, ...child))
            : childDescriptions
    );
}

// often used classes and selectors
const TYPO_ELEMENT_CLASS = 'typespec-element'
  , TYPO_ELEMENT_TARGET_CLASS = `${TYPO_ELEMENT_CLASS}_target`
  , TYPO_ELEMENT_SELECTOR = `.${TYPO_ELEMENT_CLASS}`
  , TYPO_ELEMENT_TARGET_SELECTOR = `.${TYPO_ELEMENT_TARGET_CLASS}`
  , TYPO_ELEMENT_WRAPPER_CLASS = `${TYPO_ELEMENT_CLASS}_wrapper`
  , TYPO_ELEMENT_WRAPPER_SELECTOR = `.${TYPO_ELEMENT_WRAPPER_CLASS}`
  , TYPO_ELEMENT_SHOW_PARAMETERS_CLASS = `${TYPO_ELEMENT_CLASS}_show-parameters`
  , TYPO_ELEMENT_SHOW_PARAMETERS_SELECTOR = `.${TYPO_ELEMENT_SHOW_PARAMETERS_CLASS}`
  ;


function _renderHeading(domTool, {htmlTag, label, textContent/*, type, attributes*/}){
    // <div class="typespec_heading typespec_heading-{htmlTag}">
    //     <label>H1</label>
    //     <{htmlTag} class='typespec_heading_target' contenteditable>{textContent}</{htmlTag}>
    // </div>
    return createElementAndChildren(domTool, 'div', {'class': `${TYPO_ELEMENT_CLASS} `
                + `${TYPO_ELEMENT_CLASS}_heading ${TYPO_ELEMENT_CLASS}_heading-${htmlTag}`},
        [
            ['label', null, label || `Heading ${htmlTag}`]
                    // Could use _reduceDOMWhitespace(textContent) here.
          , ['div', {'class': TYPO_ELEMENT_WRAPPER_CLASS}, [
                [htmlTag, {'class': `${TYPO_ELEMENT_TARGET_CLASS} ${TYPO_ELEMENT_TARGET_CLASS}_heading`
                    , 'contenteditable': ''}, textContent]
            ]]
        ]
    );
}


function _renderText(domTool, {label, paragraphs/*, type, attributes*/}){
    // <div class="typespec_text">
    //     <label>Text</label>
    //     <div class="typespec_text_target" contenteditable>
    //         <p>{paragraph}</p>
    //     </div>
    // </div>

    return createElementAndChildren(domTool,
        'div', {'class': `${TYPO_ELEMENT_CLASS} ${TYPO_ELEMENT_CLASS}_text`}, [
            ['label', null, label || 'Text']
          , ['div', {'class': TYPO_ELEMENT_WRAPPER_CLASS}, [
                ['div', {'class': `${TYPO_ELEMENT_TARGET_CLASS} ${TYPO_ELEMENT_TARGET_CLASS}_text`
                        , 'contenteditable': ''},
                    paragraphs.map(text=>['p', null, text])
                ]
            ]]
        ]
    );
}

const TEMPLATE_RENDERERS = {
    heading: _renderHeading
  , text: _renderText
};

export function templateToDOM(domTool, template) {
    let parsedElements = _parseTemplate(template)
      , templateElement = domTool.createElement('article', {spellcheck: 'false'})
      , typoTargetAmount = 0
      ;
    for(const element of parsedElements) {
        const renderer = TEMPLATE_RENDERERS[element.type];
        if(!renderer) {
            // Could throw an error.
            console.warn(`Don\'t know how to render template type ${element.type}!`);
            continue;
        }
        templateElement.append(renderer(domTool, element));
        typoTargetAmount += 1;
    }
    return [templateElement, typoTargetAmount];
}

const _EDITABLE_HEADINGS_SELECTOR = ':is(h1, h2, h3, h4, h5, h6)[contenteditable]'
    , _EDITABLE_DIVS_SELECTOR = 'div[contenteditable]'
    ;

function _handleBeforeInput(domTool, e) {

    console.log('capturing', e.inputType, e.target);
    if(e.target.closest(_EDITABLE_DIVS_SELECTOR))
        handleEditableDiv(domTool, e);
    else if(e.target.closest(_EDITABLE_HEADINGS_SELECTOR))
        handleEditableLine(domTool, e);
    else
        // Discourage use of other editable elements, as we don't
        // handle them properly, e.g. in serialization.
        e.preventDefault();
}

function _handleFocusOut(domTool, e) {
    console.log('focusout>>>commit!', e.target);
    if(e.target.closest(_EDITABLE_DIVS_SELECTOR)){
        // clean up
    }
}

function _activateTypoTarget(allTypoTargets, activeTypoTargetIndex) {
    const activeClass = `${TYPO_ELEMENT_CLASS}--active`
      , typoTarget = allTypoTargets[activeTypoTargetIndex]
      , container = typoTarget.closest(TYPO_ELEMENT_SELECTOR)
      ;
    for(const elem of allTypoTargets) {
        if(elem === typoTarget)
            continue;
        elem.classList.remove(activeClass);
    }
    typoTarget.classList.add(activeClass);
    console.log('_activateTypoTarget', activeTypoTargetIndex, typoTarget, container);
}

function _handleFocusIn(domTool, setActiveTypoTarget, e) {
    const typoTarget = e.target.closest(TYPO_ELEMENT_SELECTOR)
      , proofElement = e.currentTarget // currentTarget: where the handler is attached to
      , allTypoTargets = Array.from(proofElement.querySelectorAll(TYPO_ELEMENT_SELECTOR))
      , activeTypoTargetIndex = allTypoTargets.indexOf(typoTarget)
      ;
    if(!typoTarget) return;
    _activateTypoTarget(allTypoTargets, activeTypoTargetIndex);
    setActiveTypoTarget(activeTypoTargetIndex);
}

function _handleClick(domTool, e) {
    if(!e.target.matches('label'))
        return;
    const container = e.target.closest(TYPO_ELEMENT_SELECTOR);
    if(!container) return;
    const editableHost = container.querySelector(TYPO_ELEMENT_TARGET_SELECTOR);
    if(!editableHost) return;
    editableHost.focus(); // triggers focusin/_handleFocusIn
}


function _keyToProperty(key) {
    // 'HeLloWORLD'.replaceAll(/([A-Z])/g, (_, a)=>  `-${a.toLowerCase()}`);
    // '-he-llo-w-o-r-l-d
    let property = key.replaceAll(/([A-Z])/g, (_, a)=>  `-${a.toLowerCase()}`);
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


function _filterLocations(applyDefaultsExplicitly, state){
    return state.filter(([axisTag, {location, 'default':def}])=>
                axisTag === 'opsz' // browsers set the wron default opsz, always apply explicitly
            || ( applyDefaultsExplicitly
                        // Keep all
                        ? true
                        // Keep only locations that are not the default.
                        : location !== def )
    );
}

function _applyTargetsState(domTool, allTypoTargets, states, variationSettingsFlags) {
    for(let i=0, l=allTypoTargets.length;i<l;i++) {
        const state = states[i]
            , wrapper = allTypoTargets[i].querySelector(TYPO_ELEMENT_WRAPPER_SELECTOR)
            , target = allTypoTargets[i].querySelector(TYPO_ELEMENT_TARGET_SELECTOR)
            ;
        if(!state) continue;
        for(let k of Object.keys(state)) {
            const locations = [];
            if(k === 'manualAxisLocations') {
                locations.push(..._filterLocations(variationSettingsFlags.has('applyDefaultsExplicitly'), state[k])
                    .map(([axisTag, {location}])=>[axisTag, location]));
                // FIXME: prefer to use custom properties, but this depends
                //        on the CSS setup a lot.
                target.style.setProperty('font-variation-settings',
                        locations.map(([axisTag, location])=>`"${axisTag}" ${location}`)
                                 .join(', ')
                );
            }
            else if(k === 'fontLeading'){
                let [/* mode*/, value] = state[k];
                target.style.setProperty(_keyToProperty(k), _propertyValueToCSSValue(k, value));
            }
            else if(k === 'colors'){
                const [foreground, background] = state[k];
                wrapper.style.setProperty('color', foreground);
                target.style.setProperty('background', background);
            }
            else
                target.style.setProperty(_keyToProperty(k), _propertyValueToCSSValue(k, state[k]));

            let parameters = target.parentNode.querySelector(TYPO_ELEMENT_SHOW_PARAMETERS_SELECTOR);
            if(variationSettingsFlags.has('displayParameters')) {
                if(!parameters) {
                    parameters = domTool.createElement('div', {'class': TYPO_ELEMENT_SHOW_PARAMETERS_CLASS});
                    target.after(parameters);
                }
                // enable parameters
                parameters.textContent = locations
                            .map(([axisTag, location])=>`${axisTag} ${location}`)
                            .join(', ')
                            ;
            }
            else if(parameters)
                // disable parameters
                parameters.remove();
        }
    }
}

function _applyState(domTool, templateElement, columnWidth, allTypoTargets
                                    , states, variationSettingsFlags) {
    // FIXME: we should set the --font-size of templateElement to the
    // PT of the running/reading text-taget (the last target in our
    // current default template, but is there a way to figure it out?
    // Maybe, we should start with a proof/document default font size
    // and then all following font-sizes are specified relatively in EM
    // of that!
    templateElement.style.setProperty(`--column-width`, columnWidth);
    _applyTargetsState(domTool, allTypoTargets, states, variationSettingsFlags);
}

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
        // Update will run if the proof is no re-initalized anyways.
        update: (activeTypoTargetIndex, states, columnWidth, variationSettingsFlags
                )=>{
                    console.log('TYPESPEC proofAPI.update!');
                    return _applyState(domTool, templateElement, columnWidth
                        , allTypoTargets, states, variationSettingsFlags);
                }
    };

    // If I move the handling of state out of this module into the kernel
    // we'd need to generate adresses for the typo-targets in here, that
    // can be used from outside to address the elements.
    //
    // Serialisation would be handled outside, as well as management of the
    // data. SO, what this does is:
    //      - publishing all keys to typo-targets (just indexes will do/a length)
    //      - appliying typo-target styles/state correctly
    //      - one question is how to handle defaults/initial state, but
    //        maybe when publishing the keys, we can pass default state
    //        requests along, and if applicable (with the current font),
    //        we can use these recommendations, as far as possible, i.e.
    //        use only axes that exist etc.
    //      - there's maybe a chicken-egg problem, when we rely on this to
    //        generate keys addressing the state, the external code can't
    //        "know" the state before loading this.
    //
    //
    // It's interesting now, as the controls are applied to each editable
    // element separately, and that is not expected by the app at all so far
    // so one question is if this tool will bring it's own logic or if we can
    // extend the existing logic to apply to this as well.
    //   * There may be global interfaces that change state for the whole tool
    //   * e.g. selecting the active element is done completely in the layout
    //   * the specific interfaces are not going to the generalState serialization,
    //     even though there's overlap.
    //   * It's annoying that the videoproof has a lot of unused fields in
    //     the general state. However it was an explicit part of the briefing
    //     and not forseeable that the format would change.
    //     subsequently, we could just create a whole new format for this.
    //         dateTime            * keep
    //         fontParticles       * keep, though, we could choose another font per element!
    //      x  axisLocations       * remove, will be elsewhere
    //                               could also be used as a default, and store
    //                               the most common axis locations. this scheme
    //                               would likely make it harder to understan
    //                               and parse the format.
    //         proofFormatTag      * use on index 2, switches serialization
    //                               format for known tags, known tags won't
    //                               be parsed as axisLocations
    //         comment             * keep so far
    //      x  colors              * remove, will be elsewhwere, could also
    //                               be a general setting to keep the specific
    //                               setting defaults more sparse, as they won't
    //                               be set for the
    //         highlightSelection  * keep so far
    //  * PROOF_STATE_DEPENDENCIES:
    //                             * selection of template,
    //                             * Column width
    //                             * within the template: active element
    //                               as a hidden control?)
    //  * PER ELEMENT UIs:
    //                             * style picker (go to custom when axes
    //                               are changed from there and go to the
    //                               style, when axis are diled in correctly.
    //                               (avar ?)
    //                              * Font-Size
    //                              * Leading
    //                              * Alignment
    //                              * Color FG/BG
    //                              * view all axes
    //                              * slider for all axis
    //                               (are non-displayed axes on default
    //                                values or are they just hidden?)
    //                              * Mirror size changes: make this go
    //                                both directions. This only if opsz
    //                                is available.
    //                              * There was that feature to link axes
    //                                as they mix higher level axis: do we
    //                                need this? There's now avar2. Can we
    //                                use that?
    //                              * Show: Verbose font-variation-settings
    //                              * Show: Parameters
    //                              * Show:CSS => this maybe not.
    //
    //  * EXTENDED PROOF STATE: The state of all/the inactive elements
    //
    // So, where to start ...
    // Selecting the active element.
    // Does this tool bring it's own set of user interfaces? As such,
    // it would probaly become less complex but also more verbose.
    // How hard would it be now, to separate videproof specifics from "kernel"?
    //
    // What's nice now, is that the UI elements don't need to be placed
    // into the DOM, they just have their place and are only activated
    // and deactivated. Also, note that the legacy videproof "composition"
    // layout already has separate targets/states for the "elements", so
    // some of the complication in typetools is also part of videproof.
    // ALSO: Type-Your-Own could become contenteditable...
    //
    // What's not nice is the tight coupling between proof modules and
    // the kernel, as these interfaces know a lot/are very specific to some
    // of the proofs. Think of padMode or customPad for the
    // contextual kerning proof.
    //
    // when we select another "typographic target" we:
    //      record the state of the current target
    //      fetch the state of the new target
    //      set the state of the new target to the controls
    //      the controls only ever change the active target.
    //
    //  what of this is done in ther kernel logic
    //  and what is done in the proof logic
    // e.g. one proof-logic call could be setState(state)
    // the proof should somehow inform the kernel of a target change ...
    //      so the UI-elements can change accordingly
    //      i.e. emit a new state, the target to which this is routed is
    //          not that interesting from the outside.
    //      setState function can be injected into init!
    //
}

