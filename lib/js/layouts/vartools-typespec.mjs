/* jshint browser: true, esversion: 9, laxcomma: true, laxbreak: true, unused:true, undef:true */
import { handleEditableLine, handleEditableDiv } from '../content-editable.mjs';

// import diff_match_patch from '../diff_match_patch/diff_match_patch.mjs';

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

export const template = String.raw`H1 H1:Heading One
H2 H2:Heading Two
H3 H3:Heading Three
T1 T1:Intro text leads reader into the article by the nose, with grace and dignity and a little pithy charm. Typeface has changed to the appropriate optical size by the miracle of modern typography.
T2 T2:Johannes Gutenberg’s work on the printing press began in approximately 1436 when he partnered with Andreas Heilmann, owner of a paper mill. Having previously worked as a goldsmith, Gutenberg made skillful use of the knowledge of metals he had learned as a craftsman. He was the first to make type from an alloy of lead, tin, and antimony, which was critical for producing durable type that produced high-quality printed books and proved to be much better suited for printing than all other known materials.
!p:Επειδη δε κοινη το των Αρκαδων εθνος εχει τινα παρα πασι τοις Ελλησιν επ αρετη φημην, ου μονον δια ρην εν τοις ηθεσι και βιοις φιλοξενιαν και φιλανθρωπιαν, μαλιστα δε δια την εις το θειον ευσεβειαν, αξιον βραχυ διαπορησαι περι της Κυναιθεων αγριοτητος, πως οντες ομολογουμενως Αρκαδες τοσουτο κατ εκεινους τοθς καιπους διηνεγκαν των αλλων Ελληνων ωμοτητι και παρανομια. δοκαυσι δε μοι, διοτι τα καλως υπο των αρχαιων επινενοημενα και φυσικως συντεθεωρημενα περι παντας τους κατοικουντας την Αρκαδιαν, ταυτα δη πρωτοι και μονοι Αρκαδων εγκατελιπον. μουσικην γαρ, την γ αληθως μουσικην, πασι μεν ανθρωποις οφελος ασκειν Αρκασι δε και αναγκαιον. ου γαρ ηγητεον μουσικην, ως Εφορος φησιν εν τω προοιμιω της ολης προγματειας, ουδαμως αρμοζοντα λογον αυτω πιψας, επ απατη και γοητεια παραισηχθαι τοις ανθρωποις, ουδε τους παλαιοθς Κρητων και Λακεδαιμονιων αυλον και ρυθμον εις τον πολεμον αντι σαλπιγγος εικη νομιστεον εισαγαγειν, ουδε τους πρωτους Αρκαδων εις την ολην πολιτειαν την μοθσικην παραλαβειν επι τοσουτον ωστε μη μονον παισιν ουσιν, αλλα ακι νεανισκοις γενομενοις εως τριακοντ ετων κατ αναγκην ουντροφον ποιειν αυτην, ταλλα τοις βιοις οντας αυστηροτατους.
!p:В глубоких и темных водах Антарктики ученые обнаружили невероятное изобилие до сих пор неизвестных видов морской жизни. Исследователи открыли более 700 новых видов морских существ в морях, которые раньше считались слишком неблагоприятными для существования большого биологического разнообразия. Эти темные воды буквально кишат стаями хищных губок, свободноплавающих червей, ракообразных и моллюсков. Доклад о новых видах фауны был опубликован в журнале Nature. “То, что раньше считалось пустой бездной, на поверку оказалось динамичной, меняющейся и биологически богатой средой”, - сказала одна из соавторов документа, морской биолог Британского общества исследования Антарктики доктор Кэтрин Линс. “Находка этой сокровищницы морской живности - наш первый шаг на пути к пониманию сложного взаимоотношения глубоких океанов и распределения морской жизни”, - добавила она. Науке это пока неизвестно. Исследование антарктических вод было проведено в рамках проекта Andeep, изучающего биологическое разнообразие глубоководного антарктического дна. Один из ранее неизвестных ракообразных (Cylindrarcturus), найденных в Антарктитке Исследователи не ожидали обнаружить такого разнобразия морской жизни Проект призван заполнить “вакуум знаний” о фауне, населяющей самые глубокие воды Южного океана.
!p:我的征途是星辰大海 "My Conquest is the Sea of Stars", a famous sentence in Legend Of The Galactic Heroes
!p:很久很久以前，在一个遥远的星系 "A long time ago in a galaxy far, far away", a famous sentence in Star Wars`;
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
 * s flag is RegExp.prototype.dotAll: it matches newlines, hence content can contain newlines
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
      , tag
      , htmlTag: tag.toLowerCase()
      , label
      , attributes
      , textContent: contents.map(line=>line.join('')).join('\n')
    };
}
const NEW_PARAGRAPH = '!p:';
function _parseText({tag, label, attributes, contents}) {
    let paragraph = [];
    const paragraphs = [paragraph];
    for(const [lineHead, ...lineTail] of contents) {
        if(lineHead.startsWith(NEW_PARAGRAPH)){
            paragraph = [lineHead.slice(NEW_PARAGRAPH.length), ...lineTail];
            paragraphs.push(paragraph);
        }
        else {
            if(paragraph.length)
                // not first line
                paragraph.push('\n');
            // first Line and lines that follow and don't start with a tag
            // or NEW_PARAGRAPH marker.
            paragraph.push(lineHead, ...lineTail);
        }
    }
    return {
        type: 'text'
      , tag
      , label
      , attributes
      , paragraphs: paragraphs.map(lines=>lines.join(''))
    };
}

const TEMPLATE_PARSERS = {
    T1: _parseText
  , T2: _parseText
  , H1: _parseHeading
  , H2: _parseHeading
  , H3: _parseHeading
  , H4: _parseHeading
  , H5: _parseHeading
  , H6: _parseHeading
};

const TEMPLATE_DEFAULTS = deepFreeze({
    H1: {fontSize: 64, fontLeading: [0 /* UIFontLeading.MODE_AUTO is 0 */], alignment: 'l', manualAxisLocations: []}
  , H2: {fontSize: 25, fontLeading: [0 /* UIFontLeading.MODE_AUTO is 0 */], alignment: 'l', manualAxisLocations: []}
  , H3: {fontSize: 18, fontLeading: [0 /* UIFontLeading.MODE_AUTO is 0 */], alignment: 'l', manualAxisLocations: []}
  , H4: {fontSize: 18, fontLeading: [0 /* UIFontLeading.MODE_AUTO is 0 */], alignment: 'l', manualAxisLocations: []}
  , H5: {fontSize: 18, fontLeading: [0 /* UIFontLeading.MODE_AUTO is 0 */], alignment: 'l', manualAxisLocations: []}
  , H6: {fontSize: 18, fontLeading: [0 /* UIFontLeading.MODE_AUTO is 0 */], alignment: 'l', manualAxisLocations: []}
  , T1: {fontSize: 18, fontLeading: [0 /* UIFontLeading.MODE_AUTO is 0 */], alignment: 'l', manualAxisLocations: []}
  , T2: {fontSize: 14, fontLeading: [0 /* UIFontLeading.MODE_AUTO is 0 */], alignment: 'l', manualAxisLocations: []}
});

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
        const line = [unescapedLine];
        if(lineEndsWithEscape)
            line.push('\n');

        if(appendLine)
            // add to old line
            items[items.length-1].push(...line);
        else
            // new line
            items.push(line);
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
const ROOT_ELEMENT_CLASS = 'typespec_root'
  // , ROOT_ELEMENT_SELECTOR = `.${ROOT_ELEMENT_CLASS}`
  , TYPO_ELEMENT_CLASS = 'typespec-element'
  , TYPO_ELEMENT_TARGET_CLASS = `${TYPO_ELEMENT_CLASS}_target`
  , TYPO_ELEMENT_SELECTOR = `.${TYPO_ELEMENT_CLASS}`
  , TYPO_ELEMENT_TARGET_SELECTOR = `.${TYPO_ELEMENT_TARGET_CLASS}`
  , TYPO_ELEMENT_WRAPPER_CLASS = `${TYPO_ELEMENT_CLASS}_wrapper`
  , TYPO_ELEMENT_WRAPPER_SELECTOR = `.${TYPO_ELEMENT_WRAPPER_CLASS}`
  , TYPO_ELEMENT_SHOW_PARAMETERS_CLASS = `${TYPO_ELEMENT_CLASS}_show-parameters`
  , TYPO_ELEMENT_SHOW_PARAMETERS_SELECTOR = `.${TYPO_ELEMENT_SHOW_PARAMETERS_CLASS}`
  , TYPO_ELEMENT_TARGET_HEADING_CLASS = `${TYPO_ELEMENT_TARGET_CLASS}_heading`
  , TYPO_ELEMENT_TARGET_HEADING_SELECTOR = `.${TYPO_ELEMENT_TARGET_HEADING_CLASS}`
  , TYPO_ELEMENT_TARGET_TEXT_CLASS =  `${TYPO_ELEMENT_TARGET_CLASS}_text`
  , TYPO_ELEMENT_TARGET_TEXT_SELECTOR =  `.${TYPO_ELEMENT_TARGET_TEXT_CLASS}`
  ;

function _renderHeading(domTool, {tag, htmlTag, label, textContent/*, type, attributes*/}){
    // <div class="typespec_heading typespec_heading-{htmlTag}">
    //     <label>H1</label>
    //     <{htmlTag} class='typespec_heading_target' contenteditable>{textContent}</{htmlTag}>
    // </div>
    return createElementAndChildren(domTool, 'div', {'data-tag': tag, 'class': `${TYPO_ELEMENT_CLASS} `
                + `${TYPO_ELEMENT_CLASS}_heading ${TYPO_ELEMENT_CLASS}_heading-${htmlTag}`},
        [
            ['label', null, label || `Heading ${htmlTag}`]
                    // Could use _reduceDOMWhitespace(textContent) here.
          , ['div', {'class': TYPO_ELEMENT_WRAPPER_CLASS}, [
                [htmlTag, {'class': `${TYPO_ELEMENT_TARGET_CLASS} ${TYPO_ELEMENT_TARGET_HEADING_CLASS}`
                    , 'contenteditable': ''}, textContent]
            ]]
        ]
    );
}

function _renderText(domTool, {tag, label, paragraphs/*, type, attributes*/}){
    // <div class="typespec_text">
    //     <label>Text</label>
    //     <div class="typespec_text_target" contenteditable>
    //         <p>{paragraph}</p>
    //     </div>
    // </div>

    return createElementAndChildren(domTool,
        'div', {'data-tag': tag, 'class': `${TYPO_ELEMENT_CLASS} ${TYPO_ELEMENT_CLASS}_text`}, [
            ['label', null, label || 'Text']
          , ['div', {'class': TYPO_ELEMENT_WRAPPER_CLASS}, [
                ['div', {'class': `${TYPO_ELEMENT_TARGET_CLASS} ${TYPO_ELEMENT_TARGET_TEXT_CLASS}`
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
      , templateElement = domTool.createElement('article', {'class': ROOT_ELEMENT_CLASS, spellcheck: 'false'})
      , typoTargetAmount = 0
      , templateDefaults = []
      ;
    for(const element of parsedElements) {
        const renderer = TEMPLATE_RENDERERS[element.type];

        if(!renderer) {
            // Could throw an error.
            console.warn(`Don\'t know how to render template type ${element.type}!`);
            continue;
        }
        templateElement.append(renderer(domTool, element));
        templateDefaults.push(TEMPLATE_DEFAULTS[element.tag] || {});
        typoTargetAmount += 1;
    }
    return [templateElement, typoTargetAmount, templateDefaults];
}

const ESCAPED_LINE_BREAK = String.raw`\
`;

function _getLabel(typoElement) {
    const rawText = typoElement.querySelector('label').textContent;
    // Remove non-[word characters and spaces]
    return rawText.replaceAll(/[^\w ]/g, '');
}
export function domToTemplate(templateRoot) {
    const items = [];
    for(const targetElement of templateRoot.querySelectorAll(TYPO_ELEMENT_TARGET_SELECTOR)) {
        const typoElement = targetElement.closest(TYPO_ELEMENT_SELECTOR)
          , label = _getLabel(typoElement)
          , tag = typoElement.dataset.tag
          ;
        if(targetElement.matches(TYPO_ELEMENT_TARGET_HEADING_SELECTOR)) {
            const item = {
                type: 'heading'
              , tag: tag || targetElement.tagName
              , label
              , content: targetElement.textContent.replaceAll('\n', ESCAPED_LINE_BREAK)
            };
            items.push(item);
        }
        else if(targetElement.matches(TYPO_ELEMENT_TARGET_TEXT_SELECTOR)) {
            const item = {
                type: 'text'
              , tag: tag || 'T1'
              , label
              , content: Array.from(targetElement.children)
                                .map(childElement=>childElement.textContent.replaceAll('\n', ESCAPED_LINE_BREAK))
                                .join(`\n${NEW_PARAGRAPH}`)
            };
            items.push(item);
        }
    }
    return items.map(({tag, label, content})=>`${tag} ${label}:${content}`)
                .join('\n');
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

function _handleFocusOut(domTool, updateTextHandler, e) {
    console.log('focusout>>>commit!', e.target);
    /*
    // This is work in progess the question is how to serialize changes
    // to the text, and if the fuzzy patches of diff_match_patch
    // (https://github.com/google/diff-match-patch/wiki/API) in some cases
    // can be shorter than serializing the complete new text.

    // get a complete new template from the current DOM elements:
    const newTemplateStr = domToTemplate(e.target.closest(ROOT_ELEMENT_SELECTOR));
    // NOTE: it is likely better to eventually apply the comparisons,
    // difing etc. per template element and not per complete template!


    // Communicate changes with the shell ...
    // All the template handling will likely get external to this module!
    // updateTextHandler(newTemplateStr);



    // Should we assume this is always about active target OR should
    // we get the target index? The second seems more robust!


    // initialize diff_match_patch
    var dmp = new diff_match_patch()
         // the diff element
      ,  diff = dmp.diff_main(template, newTemplateStr)
         // the patch as a string (assert: has always 5 lines, content lines are escaped)
      ,  patch =  dmp.patch_toText(dmp.patch_make(diff))
      ;

    console.log('dmp.diff_main', diff);
    console.log('diff_levenshtein(diffs)', dmp.diff_levenshtein(diff));
    console.log('dmp.patch_make(diff) → patches', dmp.patch_make(diff));


    // See if we can actually restore template, this doesn't work so well
    // when the template explicitly escapes line breaks, as that information
    // get's lost in the html. We could also remove these linebreaks before
    // comparision, but it's easier to store the built in templates without
    // that feature at all so far.
    //
    // Nothing to do, serialization should be an empty string (the patches will be empty as well)
    console.log('template.content === restored newTemplateStr', template === newTemplateStr);
    // this is crucial, the new text could be in total shorter than
    // the patches but this should be compared in final serialization size!
    console.log('newTemplateStr.length', newTemplateStr.length);
    console.log('patch.length', patch.length);

    // FROM "H1 H1:Heading One"
    // TO "H1 H1:Heading B;ne"
    console.log('patch', patch);
    // >>> @@ -7,17 +7,18 @@
    // >>>  Heading
    // >>> -O
    // >>> +B;
    // >>>  ne%0AH2 H2


    // the last joint would be already serialization logic
    // we'd put out just the pieces, it should always be 5 pieces to consume
    // if the chunk starts with @@: consume 4 more pieces
    // otherwise consume one piece
    //      if it is empty: use the template string
    //               CAUTION ambigous as it can also mean the target should be empty!
    //               For that case we can maybe craft a special token or such
    //      else replace the entire template
    //
    // NOTE ALSO: we should probably store how many patches to consume
    //            then PER PATCH consume 5 chunks
    let inPieces = patch.split('\n')// create chunks per line
                // crucial as we can't have raw ; in the chunks
                // also: piece is already suficiently encoded otherwise by the diff_match_patch (encodeURI)
                .map(piece=>piece.replaceAll(';', encodeURIComponent(';')))// => chucks straigt for serialization
                .join(';') // done by serialization logic
      , fromPieces = inPieces.split(';') // done by deserialization logic
            // consume 5 chunks
            // and reverse escaping of ;
            .map(piece=>piece.replaceAll(encodeURIComponent(';'), ';'))
            // put patch back together
            .join('\n')
      ;
    console.log('inPieces', inPieces);
    // >>> @@ -7,17 +7,18 @@; Heading ;-O;+B%3B; ne%0AH2 H2;
    console.log('fromPieces', fromPieces);
    console.log('fromPieces === patch', fromPieces === patch);// >>> true

    let patches = dmp.patch_fromText(fromPieces)//patchFromUri)
     , [text2, results] = dmp.patch_apply(patches, template)
     ;
    console.log('text2', text2);
    console.log('text2 === newTemplateStr', text2 === newTemplateStr);
    console.log('results', results);

    */
    if(e.target.closest(_EDITABLE_DIVS_SELECTOR)){
        // clean up
    }
}

function _activateTypoTarget(allTypoTargets, activeTypoTargetIndex) {
    const activeClass = `${TYPO_ELEMENT_CLASS}--active`
      , typoTarget = allTypoTargets[activeTypoTargetIndex]
      ;
    for(const elem of allTypoTargets) {
        if(elem === typoTarget)
            continue;
        elem.classList.remove(activeClass);
    }
    typoTarget.classList.add(activeClass);
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

function _applyTargetsState(domTool, applyFeatures, allTypoTargets, states, variationSettingsFlags) {
    for(let i=0, l=allTypoTargets.length;i<l;i++) {
        const state = states[i]
            , wrapper = allTypoTargets[i].querySelector(TYPO_ELEMENT_WRAPPER_SELECTOR)
            , target = allTypoTargets[i].querySelector(TYPO_ELEMENT_TARGET_SELECTOR)
            ;
        if(!state) continue;

        const locations = [];
        locations.push(..._filterLocations(variationSettingsFlags.has('applyDefaultsExplicitly'), state.manualAxisLocations)
                    .map(([axisTag, {location}])=>[axisTag, location]));

        for(let k of Object.keys(state)) {
            if(k === 'manualAxisLocations') {
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
            else if(k === 'colors') {
                const [foreground, background] = state[k];
                wrapper.style.setProperty('color', foreground);
                target.style.setProperty('background', background);
            }
            else if(k === 'otFeaturesChooser') {
                applyFeatures(target, state[k]);
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

function _applyState(domTool, applyFeatures, templateElement, columnWidth
                   , allTypoTargets, states, variationSettingsFlags) {
    // FIXME: we should set the --font-size of templateElement to the
    // PT of the running/reading text-taget (the last target in our
    // current default template, but is there a way to figure it out?
    // Maybe, we should start with a proof/document default font size
    // and then all following font-sizes are specified relatively in EM
    // of that!
    templateElement.style.setProperty(`--column-width`, columnWidth);
    _applyTargetsState(domTool, applyFeatures, allTypoTargets, states, variationSettingsFlags);
}

export function init(proofElement, domTool, templateElement
                   , setActiveTypoTarget, updateTextHandler
                   , applyFeatures
                   , activeTypoTargetIndex, states, columnWidth
                   , variationSettingsFlags) {
    console.log(`TYPESPEC init! activeTypoTargetIndex: ${activeTypoTargetIndex} states:`, states);
    let handleDestroy = (/*event*/)=>{
            for(const eventListener of eventListeners)
                proofElement.removeEventListener(...eventListener);
        }
      , eventListeners = [
            ['beforeinput', _handleBeforeInput.bind(null, domTool), false]
          , ['focusout', _handleFocusOut.bind(null, domTool, updateTextHandler), false]
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
    _applyState(domTool, applyFeatures, templateElement, columnWidth, allTypoTargets
                                    ,states ,variationSettingsFlags);
    return {
        // Update will run if the proof is not re-initalized anyways.
        update: (activeTypoTargetIndex, states, columnWidth, variationSettingsFlags
                )=>{
                    console.log('TYPESPEC proofAPI.update!', variationSettingsFlags, states);
                    _activateTypoTarget(allTypoTargets, activeTypoTargetIndex);
                    return _applyState(domTool, applyFeatures, templateElement, columnWidth
                        , allTypoTargets, states, variationSettingsFlags);
                }
    };
}

