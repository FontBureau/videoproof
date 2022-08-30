/* jshint browser: true, esversion: 9, laxcomma: true, laxbreak: true, unused:true, undef:true */


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
        {fontSize: 64, fontLeading: 'auto', alignment: 'l'}
      , {fontSize: 25, fontLeading: 'auto', alignment: 'l'}
      , {fontSize: 18, fontLeading: 'auto', alignment: 'l'}
      , {fontSize: 18, fontLeading: 'auto', alignment: 'l'}
      , {fontSize: 14, fontLeading: 'auto', alignment: 'l'}
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
          , [htmlTag, {'class': `${TYPO_ELEMENT_TARGET_CLASS} ${TYPO_ELEMENT_TARGET_CLASS}_heading`
                    , 'contenteditable': ''}, textContent]
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
          , ['div', {'class': `${TYPO_ELEMENT_TARGET_CLASS} ${TYPO_ELEMENT_TARGET_CLASS}_text`
                    , 'contenteditable': ''},
                paragraphs.map(text=>['p', null, text])]
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

function _reduceDOMWhitespace(text) {
    // In block elements this removes all contained markup and
    // unessary white space.
    const reWs = /[\t\n\r ]+/g
        , reWsStart = /^[\t\n\r ]/
        , reWsEnd = /[\t\n\r ]$/
        ;
    return text.replace(reWs, ' ')
                .replace(reWsStart, '')
                .replace(reWsEnd, '')
                ;
}

function _compareByStartContainerPosition(rangeA, rangeB) {
    const { DOCUMENT_POSITION_FOLLOWING, DOCUMENT_POSITION_CONTAINED_BY
          , DOCUMENT_POSITION_PRECEDING, DOCUMENT_POSITION_CONTAINS
          } = rangeA.startContainer.ownerDocument.defaultView.Node
      , position = rangeA.startContainer.compareDocumentPosition(rangeB.startContainer)
      ;

    if (position & DOCUMENT_POSITION_FOLLOWING || position & DOCUMENT_POSITION_CONTAINED_BY)
        return -1;
    else if (position & DOCUMENT_POSITION_PRECEDING || position & DOCUMENT_POSITION_CONTAINS)
        return 1;
    // else 0 ... same node
    return rangeA.startOffset - rangeB.startOffset;
}

function* _getAllElementsInBetween(startNode, endNode) {
    const { DOCUMENT_POSITION_FOLLOWING, DOCUMENT_POSITION_CONTAINED_BY
          , DOCUMENT_POSITION_PRECEDING /*, DOCUMENT_POSITION_CONTAINS*/
    } = startNode.ownerDocument.defaultView.Node;

    let nextNode = startNode;
    while(true) {
        if(nextNode === endNode) {
            yield nextNode;
            return;
        }
        const position = nextNode.compareDocumentPosition(endNode)
              // nextNode must be considered deleted after the yield, thus we must
              // find next nextNode before yielding current nextNode;
            , yieldNode = nextNode
            ;

        if(position & DOCUMENT_POSITION_PRECEDING) {
            // Happens if endNode is the container node/the editable host
            // shouldn't have called this method probably.
            return;
            // throw new Error('ASSERTION FAILED Node must never be DOCUMENT_POSITION_PRECEDING.');
        }
        if(!(position & DOCUMENT_POSITION_FOLLOWING)) // && nextNode !== endNode => returned already
            throw new Error('ASSERTION FAILED When node is not DOCUMENT_POSITION_FOLLOWING it must be endNode.');

        // all are DOCUMENT_POSITION_FOLLOWING
        if( position & DOCUMENT_POSITION_CONTAINED_BY)
            nextNode = nextNode.firstChild;
        else if(!nextNode.nextSibling) {
            // Go to `nextNode.parenNode.nextSibling`, but there may be
            // no nextSibling then go to
            // `nextNode.parenNode.parenNode.nextSibling` and so on.
            nextNode = nextNode.parentNode;
            while(true) {
                if(nextNode.nextSibling) {
                    nextNode = nextNode.nextSibling;
                    break;
                }
                else
                    nextNode = nextNode.parenNode;
            }
        }
        else
            nextNode = nextNode.nextSibling;

        yield yieldNode;
    }
}

function _getCommonAncestorSilblings(range) {
    let startAncestorSibling, endAncestorSibling
      , { Node } = range.commonAncestorContainer.ownerDocument.defaultView
      , commonAncestorElement = range.commonAncestorContainer.nodeType === Node.ELEMENT_NODE
            ? range.commonAncestorContainer
            : range.commonAncestorContainer.parentElement
      ;
    for(let elem of [...commonAncestorElement.children, commonAncestorElement]) {
        if(!startAncestorSibling && elem.contains(range.startContainer)) {
            startAncestorSibling = elem;
        }
        if(!endAncestorSibling && elem.contains(range.endContainer)) {
            endAncestorSibling = elem;
        }
        if(startAncestorSibling && endAncestorSibling)
            break;
    }
    return [startAncestorSibling, endAncestorSibling];
}

function _clearEmptyAncestorsUntil(node, stopNode) {
    const { Node } = node.ownerDocument.defaultView;
    if(!node.parentElement || !stopNode.contains(node))
        return [null, null];
    let offset = 0;
    if(node === stopNode)
        return [node, offset];// what to return for offset?

    while(node !== stopNode && (
               node.nodeType === Node.TEXT_NODE && node.data.length === 0
            || node.nodeType === Node.ELEMENT_NODE && node.childNodes.length === 0)) {
        // is not stopNode and empty
        // we wan't to have an offset for the node that is about to be removed
        // as in a Range, the startOffset is within startContainer.
        offset = Math.max(0, [...node.parentElement.childNodes].indexOf(node)-1);
        let remove = node;
        node = node.parentElement;
        remove.parentNode.removeChild(remove);
    }
    // first none empty ancestor
    return [node, offset];
}

// Return the closest startContainer/startOffset for a new cursor position
// after this operation.
function _deleteRange(domTool, range) {
    const  { Node } = domTool.window
      , { startContainer, endContainer, startOffset, endOffset } = range
        // these share the same parent and respectiveley contain start
        // and end container.
      , [startAncestorSibling, endAncestorSibling] = _getCommonAncestorSilblings(range)
      , editableHost = (startContainer.closest
                            ? startContainer
                            : startContainer.parentElement
                        ).closest('[contenteditable]')
      , commonParentElement = startAncestorSibling.parentElement
      , startAncestorSiblingOffset = [...commonParentElement.childNodes].indexOf(startAncestorSibling)
      ;

    // make sure all containers are within editableHost ...
    for(const node of _getAllElementsInBetween(startContainer, endContainer)) {
        const isElement = node.nodeType === Node.ELEMENT_NODE;
        // If node is not an element or a text: delete it.
        if(!isElement && node.nodeType !== Node.TEXT_NODE) {
            node.parentNode.removeChild(node);
            continue;
        }
        // is element or text node;

        // Don't delete ancestors of startContainer or endContainer,
        // so maybe we shouldn't yield them either....
        // Eventually we will delete ancestors if they are empty.
        if(node !== startContainer && node !== endContainer) {
            if(isElement && !(node.contains(startContainer) || node.contains(endContainer))) {
                node.parentNode.removeChild(node);
            }
            continue;
        }

        // is startContainer or endContainer
        const nodeStartOfffset = node === startContainer
                ? startOffset
                : 0
          , nodeEndOffset = node === endContainer
                ? endOffset
                : (isElement
                        ? node.childNodes.length
                        : node.data.length
                  )
          ;
        // delete contents
        if(isElement) {
            if(node.contains(endContainer))
                // Special case, not sure, if this is the full/a good enough
                // handling of the issue. Case was:
                //      startContainer: <div class="T2-target" contenteditable=""> offset: 0
                //      endContainer: first textNode in first <p> of startContainer offset: 1
                // And, subsequently, nodeEndOffset was node.childNodes.length
                // and deleting everything in startContainer
                //
                continue;
            for(let i=nodeEndOffset-1;i>=nodeStartOfffset;i--){
                node.removeChild(node.childNodes[i]);
            }
        }
        else {
            // is TextNode
            node.deleteData(nodeStartOfffset, nodeEndOffset - nodeStartOfffset);
        }
    }

    let commonStopNode = commonParentElement.contains(editableHost)
      ? editableHost
      : commonParentElement
      ;
    let [noneEmptyStartAncestor, noneEmptyStartAncestorOffset] = _clearEmptyAncestorsUntil(startContainer, commonStopNode);
    _clearEmptyAncestorsUntil(endContainer, commonStopNode);

    // merging
    if(     // both still in DOM
            startAncestorSibling.parentNode && endAncestorSibling.parentNode
            // no need to merge otherwise
            && startAncestorSibling !== endAncestorSibling
            // No need to merge textNodes, as we have element.normalize
            && startAncestorSibling.nodeType === Node.ELEMENT_NODE
            && endAncestorSibling.nodeType === Node.ELEMENT_NODE
            // And both are "compatible" The following should/could be a check
            // injected into this function, as compatibility depends on
            // content semantics.
            //
            // In this case, we want to merge paragaphs in order to remove
            // the line break withing the range...
            && startAncestorSibling.tagName === 'P'
            && endAncestorSibling.tagName === 'P') {
        // Can use Element API, because we checked nodeType.
        startAncestorSibling.append(...endAncestorSibling.childNodes);
        endAncestorSibling.remove();
    }
    // could keep for cursor position, but this normalizes between FireFox/Chromium.
    if(!startAncestorSibling.childNodes.length && startAncestorSibling !== editableHost){
        startAncestorSibling.remove();
        return [commonParentElement, startAncestorSiblingOffset];
    }
    if(startContainer.parentNode) {
        // startContainer is still there!
        return [startContainer, startOffset];
    }
    if(noneEmptyStartAncestor && noneEmptyStartAncestor.parentNode){
        return [noneEmptyStartAncestor, noneEmptyStartAncestorOffset];
    }
    return [startAncestorSibling, startAncestorSiblingOffset];
}


function _deleteRanges(domTool, editableHost, ranges) {
    // In reverse order, so previous ranges stay valid.
    // ASSERT: ranges don't overlap
    // ASSERT: ranges are not sorted
    // because ranges don't overlap, they can be sorted by means of
    // their startContainer position
    ranges.sort(_compareByStartContainerPosition);
    let lastResult;
    for(let i=ranges.length-1;i>=0;i--)
        lastResult = _deleteRange(domTool, ranges[i]);
    return lastResult;
}

/**
 *  Includes node as first element in the returned array
 */
function _getNextSiblings(node) {
    let siblings = [];
    while(node) {
        siblings.push(node);
        node = node.nextSibling;
    }
    return siblings;
}

/**
 * That's the most comprehensive explanation of how InputEvents
 * are constituted:
 *      https://w3c.github.io/input-events/#interface-InputEvent
 */
function _handleEditableDiv(domTool, event) {
    // This destroys the native undo/redo mechanism.
    // E.g. ctrl+z, ctrl+y don't do anything anymore and "historyUndo",
    // "historyRedo" don't appear in here anymore; However, that stuff is
    // not scriptable/available as API, so we can hardly do anything about
    // it. Instead, the overall app state could be used for history management.
    //
    // Using https://developer.mozilla.org/en-US/docs/Web/API/Document/execCommand
    // would actually keep that history management feature working, but
    // it is deprecated and a peculiar API anyways.
    event.preventDefault();

    console.log(`handleEditableDiv %c${event.inputType}`, 'font-weight: bold; font-size: 1.3em;');
    const { Range, Node } = domTool.window
        , editableHost = event.target.closest('[contenteditable]')
        ;
    let textContent;

    // In contenteditable, these use event.dataTransfer
    // and event.getTargetRanges() returns a "Non-empty Array"
    // "insertFromPaste", "insertFromPasteAsQuotation", "insertFromDrop", "insertReplacementText", "insertFromYank"

    // In contenteditable, these use event.data
    // and event.getTargetRanges() returns a "Non-emp   ty Array"
    // "insertText", "insertCompositionText", "formatSetBlockTextDirection", "formatSetInlineTextDirection", "formatBackColor", "formatFontColor", "formatFontName", "insertLink"

    const hasDataTransfer = new Set(["insertFromPaste", "insertFromPasteAsQuotation", "insertFromDrop", "insertReplacementText", "insertFromYank"])
        , hasData = new Set(["insertText", "insertCompositionText", "formatSetBlockTextDirection", "formatSetInlineTextDirection", "formatBackColor", "formatFontColor", "formatFontName", "insertLink"])
        ;

    if(hasDataTransfer.has(event.inputType)) {
        textContent = event.dataTransfer.getData('text/plain');
    }
    else if(hasData.has(event.inputType)) {
        // These are going to insert only text anyways, should be a bit
        // simpler to handle ...
        textContent = event.data;
    }
    else if(event.inputType === 'insertLineBreak')
        textContent = '\n';

    console.log('has textContent:', textContent);

    // In contenteditable and plain text input fields:
    // event.dataTransfer === event.data === null
    // and event.getTargetRanges() returns an "Empty Array"
    // "historyUndo", "historyRedo"

    // In contenteditable and plain text input fields:
    // event.dataTransfer === event.data === null
    // and event.getTargetRanges() returns an "Non-empty Array"
    // All Remaining ???

    let selection = event.target.ownerDocument.getSelection()
     , staticRanges = event.getTargetRanges()
     ;

    // Firefox will happily delete multiple ranges,    // "historyUndo", "historyRedo"

    // but, it will collapse to the end of the first Range, while
    // it now collapses to the end of the last range. Inserting is then
    // done at the first range cursor. This seems to be not and
    // issue, can keep as it or change later.

    const liveRanges = [];
    for(let staticRange of staticRanges) {
        let liveRange = new Range()
          , [startContainer, startOffset] = editableHost.contains(staticRange.startContainer)
                ? [staticRange.startContainer, staticRange.startOffset]
                : [editableHost.firstChild, 0]
          , [endContainer, endOffset] = editableHost.contains(staticRange.endContainer)
                ? [staticRange.endContainer, staticRange.endOffset]
                : [editableHost.lastChild, editableHost.childNodes.length]
          ;
        liveRange.setStart(startContainer, startOffset);
        liveRange.setEnd(endContainer, endOffset);
        liveRanges.push(liveRange);
    }

    // delete
    let [startContainerAfterDelete, startOffsetAfterDelete] = _deleteRanges(domTool, editableHost, liveRanges)
      ,  rangeAfterDelete = new Range()
      ;
    // Set the cursor to the position from where to insert next.
    rangeAfterDelete.setStart(startContainerAfterDelete, startOffsetAfterDelete);
    rangeAfterDelete.collapse();
    selection.removeAllRanges();

    selection.addRange(rangeAfterDelete);

    // and insert
    if(event.inputType === 'insertParagraph') {
        let cursor = selection.getRangeAt(0)
          , startContainer = cursor.startContainer
          , startOffset = cursor.startOffset
          , firstInsertedNode, lastInsertedNode
          ;

        while(true) {
            if(startContainer.nodeType === Node.TEXT_NODE) {
                // startOffset references a position in the Text
                lastInsertedNode = startContainer.splitText(startOffset);
                if(!firstInsertedNode)
                    firstInsertedNode = lastInsertedNode;
                startContainer = startContainer.parentElement;
                startOffset = [...startContainer.childNodes].indexOf(lastInsertedNode);
                continue;
            }
            if(startContainer.nodeType !== Node.ELEMENT_NODE)
                // It's also a failed assertion!
                throw new Error(`ASSERTION FAILED/NOT SUPPORTED insertParagraph into `
                        +`${startContainer.nodeName}/${startContainer.nodeType}`);
            // startContainer is an Element
            if(startContainer !== editableHost) {
                // If it is a <p> it should be a direct child of editableHost,
                // but we don't assert that! It could also be a span within a
                // p or even be nested further down within other inline elements.

                lastInsertedNode = startContainer.cloneNode(false);
                if(!firstInsertedNode)
                    firstInsertedNode = lastInsertedNode;
                // split it at startOffset
                const children = _getNextSiblings(startContainer.childNodes[startOffset]);
                lastInsertedNode.append(...children);
                startContainer.after(lastInsertedNode);
                startOffset = [...startContainer.childNodes].indexOf(lastInsertedNode);
                startContainer = startContainer.parentElement;
                continue;
            }

            // startContainer === editableHost
            if(!lastInsertedNode) {
                let newP = domTool.createElement('p');
                newP.append('');

                // insert newP at startOffset
                if(startContainer.childNodes[startOffset])
                    domTool.insertAfter(newP, startContainer.childNodes[startOffset]);
                else
                    startContainer.insertBefore(newP, null);

                firstInsertedNode = newP;
            }
            else if(lastInsertedNode.nodeType !== Node.ELEMENT_NODE || lastInsertedNode.tagName !== 'P') {
                let newP = domTool.createElement('p')
                  , children = _getNextSiblings(lastInsertedNode)
                  , indexOfFirstP = children.findIndex(element => element.tagName === 'P')
                  ;
                if(indexOfFirstP !== -1)
                    children = children.slice(0, indexOfFirstP);

                startContainer.replaceChild(newP, lastInsertedNode);
                newP.append(...children);
            }
            //else: all good already

            cursor.setStart(firstInsertedNode, 0);
            break;
        }
    }
    else if(textContent) {
        let cursor = selection.getRangeAt(0)
          , newContentsFragement = domTool.createTextNode(textContent)
          ;
        // TODO:
        //      * make sure cursor is withing the contenteditable (let's take this as granted)
        //      * maybe, e.g. on paste, insert multiple paragraphs in an orderly
        //        fashion.

        // If the cursor is not within a <p> now, we should move it into one.
        // the easiest is to just to `Range.surroundContents(aNewP);` and later
        // clean up possible empty remaining <p>, as we have to do so anyways.
        //
        // This test works if the structure in editableHost is only flat
        // <p> elements and nothing else...
        let cursorElement = cursor.startContainer.nodeType === Node.ELEMENT_NODE
                               ? cursor.startContainer
                               : cursor.startContainer.parentElement
                               ;

        if(!cursorElement.closest('[contenteditable] p')) {
            let newP = domTool.createElement('p');
            cursor.surroundContents(newP);
            if(!newP.childNodes.length) {
                let newText = domTool.createTextNode('');
                newP.append(newText);
            }
            cursor.setEndAfter(newP.lastChild);
            cursor.collapse();
        }
        // cursor is now within a <p>!
        cursor.insertNode(newContentsFragement);
        newContentsFragement.parentElement.normalize();
    }

    // use selection.collapseToStart() and experience the cursor moving
    // in the wrong direction when typing!
    selection.collapseToEnd();
}

function _handleEditableHeading(domTool, event) {
    if(event.inputType === 'insertParagraph')
        event.preventDefault();
}

function _handleBeforeInput(domTool, e) {

    console.log('capturing', e.inputType, e.target);
    if(e.target.closest(_EDITABLE_DIVS_SELECTOR))
        _handleEditableDiv(domTool, e);
    else if(e.target.closest(_EDITABLE_HEADINGS_SELECTOR))
        _handleEditableHeading(domTool, e);
    else
        // Discourage use of other editable elements, as we don't
        // handle them properly, e.g. in serialization.
        e.preventDefault();
}

function _handleFocusOut(domTool, e){
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

function _applyStates(allTypoTargets, states) {
    for(let i=0, l=allTypoTargets.length;i<l;i++) {
        const state = states[i]
            , target = allTypoTargets[i]
            ;
        if(!state) continue;
        for(let k of Object.keys(state)) {
            target.style.setProperty(_keyToProperty(k), state[k]);
        }
    }
}

export function init(proofElement, domTool, templateElement, setActiveTypoTarget, activeTypoTargetIndex, states) {
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

    // Always mark one element as actice, not sure if
    // focus should be required for this. This way we also trigger
    // setActiveTypoTarget, which however only acts "on change".
    //
    // There's also the posibility that activeTypoTarget is not
    // in the templateElement, but since all of the state, activeTypoTarget
    // and the template need to be in sync, for now and here I consider
    // that a minor issue, to be delt with another time.
    _activateTypoTarget(allTypoTargets, activeTypoTargetIndex);
    setActiveTypoTarget(activeTypoTargetIndex);
    _applyStates(allTypoTargets, states);
    return {
        update: (activeTypoTargetIndex, states)=>_applyStates(allTypoTargets, states)
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
    //        generate keys adresing the state, the external code can't
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

