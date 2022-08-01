/* jshint browser: true, esversion: 8, laxcomma: true, laxbreak: true, unused:true, undef:true */

import DOMTool from '../domTool.mjs';

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
        <div class="T1-targe" contenteditable>
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


/* "contenteditble" is kind of a beast, as it is possible to insert very
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

const _EDITABLE_HEADINGS_SELECTOR = ':is(h1, h2, h3, h4, h5, h6)[contenteditable]'
    , _EDITABLE_DIVS_SELECTOR = 'div[contenteditable]'
    ;


// FIXME: typing feels MUCH more native/natural with white-space: pre-wrap
//        but this means line-breaks, tabs and multiple spaces don't collapse.
//        Would be nice to insert line-breaks with ctrl + enter instead of
//        paragraphs (only enter).
//        Consequently, this means, that we can't remove collapsing
//        whitespaces for normalization in any case. Normalizing the template
//        above, however, is ok currently.
function _normalizeTemplate(domTool, templateStr) {
    let { Node } = domTool.window
      , templateFragment = domTool.createFragmentFromHTML(templateStr)
        // These selections are only temporaily valid. E.g. the heading
        // can, in an aribitrary template, be located within  e.g the
        // div[contenteditable], it is possible, that normalization
        // removes them.
      , headings = templateFragment.querySelectorAll(_EDITABLE_HEADINGS_SELECTOR)
      , divs = templateFragment.querySelectorAll(_EDITABLE_DIVS_SELECTOR)
      ;

    // Flattens all child nodes to just text.
    function elemContentToPlainText(elem) {
        // In block elements this removes all contained markup and
        // unessary white space.
        const reWs = /[\t\n\r ]+/g
            , reWsStart = /^[\t\n\r ]/
            , reWsEnd = /[\t\n\r ]$/
            ;
        elem.textContent = elem.textContent
            .replace(reWs, ' ')
            .replace(reWsStart, '')
            .replace(reWsEnd, '')
            ;
        // But we should rather iterate through the textNodes, clean
        // each from redundant white-space and then set just the
        // remaining text.
    }

    for(let heading of headings) {
        console.log('heading', heading.tagName, heading.getAttribute('contenteditable'), heading.hasAttribute('contenteditable'));
        elemContentToPlainText(heading);
    }

    // Return null if the paragraph is empty.
    function nodesToParagraph(nodes) {
        // this will move the nodes into the new node
        let newP = domTool.createElement('p', null, nodes);
        // Flattens all nodes.
        elemContentToPlainText(newP);
        return newP;
    }

    for (let div of divs) {
        let collected = []
            // childNodes must not be a live list, because it modifies in place.
          , childNodes = [...div.childNodes]
          ;
        for(let childNode of childNodes) {
            console.log('is elem:', childNode.nodeType, childNode.nodeType === Node.ELEMENT_NODE
                    , childNode.tagName, childNode
                    , childNode.nodeType === Node.ELEMENT_NODE && childNode.getAttribute('contenteditable')
                    , childNode.nodeType === Node.ELEMENT_NODE && childNode.hasAttribute('contenteditable')
                    );
            if(childNode.nodeType === Node.ELEMENT_NODE && childNode.tagName === 'P') {
                if(collected.length) {
                    // process and flush collected
                    let newP = nodesToParagraph(collected);
                    if(newP.textContent.length)
                        domTool.insertBefore(newP, childNode);
                    // flush collected
                    collected = [];
                }
                // This way we can get rid of all element attributes, such
                // as "style". "class" or "contenteditable" etc. At some point,
                // we may have to conserve the "lang" attribute!
                domTool.replaceNode(nodesToParagraph([...childNode.childNodes]), childNode);
                continue;
            }
            collected.push(childNode);
        }
        if(collected.length) {
            let newP = nodesToParagraph(collected);
            if(newP.textContent.length)
                div.append(newP);
        }
        console.log(`div.innerHTML ${div.className}://${div.innerHTML}//`);
    }
    return templateFragment;
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

        if(position & DOCUMENT_POSITION_PRECEDING)
            throw new Error('ASSERTION FAILED Node must never be DOCUMENT_POSITION_PRECEDING.');
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
        if(elem.contains(range.startContainer)) {
            startAncestorSibling = elem;
        }
        if(elem.contains(range.endContainer)) {
            endAncestorSibling = elem;
            break;
        }
    }
    return [startAncestorSibling, endAncestorSibling];
}

function _clearEmptyAncestorsUntil(node, stopNode) {
    const { Node } = node.ownerDocument.defaultView;
    if(!node.parentelement || stopNode.contains(node))
        return;
    while(node !== stopNode
            || node.nodeType === Node.TEXT_NODE && node.data.length
            || node.nodeType === Node.ELEMENT_NODE && node.childNodes.length) {
        // is not stopNode and empty
        let remove = node;
        node = node.parentElement;
        remove.parentNode.removeChild(remove);
    }
}

function _deleteRange(domTool, range) {
    const  { Node } = domTool.window
      , { startContainer, endContainer, startOffset, endOffset } = range
      , [startAncestorSibling, endAncestorSibling] = _getCommonAncestorSilblings(range)
      ;
    for(const node of _getAllElementsInBetween(startContainer, endContainer)) {
        console.log('_getAllElementsInBetween...', node);
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
            for(let i=nodeEndOffset-1;i>=nodeStartOfffset;i--){
                console.log('node.removeChild(node.childNodes[i]);', node.childNodes[i], 'of', node);
                node.removeChild(node.childNodes[i]);
            }
        }
        else {
            // is TextNode
            node.deleteData(nodeStartOfffset, nodeEndOffset - nodeStartOfffset);
        }
        // Could be deleted in here or not.
        // I'd delete if the _getAllElementsInBetween generator would
        // work it.
    }
    console.log('_clearEmptyAncestorsUntil startContainer:', startContainer, startAncestorSibling, startAncestorSibling);
    _clearEmptyAncestorsUntil(startContainer, startAncestorSibling.parentNode);
    console.log('_clearEmptyAncestorsUntil endContainer:', endContainer, endAncestorSibling, endAncestorSibling);
    _clearEmptyAncestorsUntil(endContainer, endAncestorSibling.parentNode);

    // about merging
    // hmm this is not how it works!
    // Both container could be i.e. an inlin <span> within two subsequent
    // <p>s. Merging the spans wouldn't be right, neither remove the
    // excess <p>. Instead, we must figure out how to identify both <p>
    // (that may be the same element) and if compatible merge those.
    // That <p> is the element that is the ancestor that is a direct child
    // of the common ancestor.
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
    if(!startAncestorSibling.childNodes.length)
        startAncestorSibling.remove();
}


function _deleteRanges(domTool, editableHost, ranges) {
    // In reverse order, so previous ranges stay valid.
    // ASSERT: ranges don't overlap
    // ASSERT: ranges are not sorted
    // because ranges don't overlap, they can be sorted by means of
    // their startContainer position
    ranges.sort(_compareByStartContainerPosition);
    for(let i=ranges.length-1;i>=0;i--)
        _deleteRange(domTool, ranges[i]);
}

/**
 * That's the most comprehensive explanation of how InputEvents
 * are constituted:
 *      https://w3c.github.io/input-events/#interface-InputEvent
 */
function _handleEditableDiv(domTool, event) {
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
        console.log(event.inputType, 'has data transfer', event.dataTransfer);
        textContent = event.dataTransfer.getData('text/plain');
    }

    else if(hasData.has(event.inputType)) {
        // These are going to insert only text anyways, should be a bit
        // simpler to handle ...
        console.log(event.inputType, 'has data', event.data);
        textContent = event.data;
    }

    console.log('has textContent', textContent);

    // In contenteditable and plain text input fields:
    // event.dataTransfer === event.data === null
    // and event.getTargetRanges() returns an "Empty Array"
    // "historyUndo", "historyRedo"

    // In contenteditable and plain text input fields:
    // event.dataTransfer === event.data === null
    // and event.getTargetRanges() returns an "Non-empty Array"
    // All Remaining ???

    let selection = event.target.ownerDocument.getSelection()
     , ranges = event.getTargetRanges()
     ;

    // Firefox will happily delete multiple ranges,
    // but, it will collapse to the end of the first Range, while
    // it now collapses to the end of the last range. Inserting is then
    // done at the first range cursor. This seems to be not and
    // issue, can keep as it or change later.
    console.log('ranges:', ranges.length, ...ranges);
    if(ranges.length !== 1)
        console.warn(`ASSERTION FAILED: event target ranges are not 1 but ${ranges.length}.`);
    else
        console.info(`ASSERTION HOLDS: event target ranges are 1`);


    const liveRanges = [];
    for(let staticRange of ranges) {
        let liveRange = new Range();
        liveRange.setStart(staticRange.startContainer, staticRange.startOffset);
        liveRange.setEnd(staticRange.endContainer, staticRange.endOffset);
        liveRanges.push(liveRange);
        console.log('add range:', liveRange.toString());
    }

    console.log('BEFORE deleteFromDocument...', ...selectionToLog(selection));

    // delete: when do not???

    // This can have catastrophic results! I.e. In Chromium, after pressing
    // ctrl+a and del what remains in the editable div is <p></p><p></p>,
    // where both paragraphs can't be selected for editing and no cursor
    // can be put in between, in other words, the div is now unusable.
    // Also, if text is inserted or pasted, instead of deleted, by pressing
    // a character key or withctrl+v, the position is not within a <p> but
    // in between both.
    // This means, an empty <p> should be filled with something like
    // "(Enter text here.)", which, as content in serialization could
    // be "".
    // One question is, whether we should allow multiple empty <p> in a
    // row. I believe that is unneccessary, similar as white space in html
    // which is basically horizontal cursor movement and restricted to one
    // space, we should also restrict multiple empty paragraphs, which is
    // vertical cursor movement. Actually, there should be no empty paragraphs
    // at all. We could clean up, after the editable div loses focus.

    // selection.deleteFromDocument();
    // It's interesting, as this won't merge <p> if deletion is across
    // boundaries!. It will, however delete <p>s when completely within
    // the selection.

    // It seems at this point, that deleting the ranges is better when
    // implemented here explicitly... ;-/
    // and then eventially, if the endContainer and the startContainer
    // aren't in the same element, the endContainer gets merged into the
    // startContainer.
    _deleteRanges(domTool, editableHost, liveRanges);

    function* _rangeToLog(range, index) {
        yield `Range#${index} "${range.toString()}"`;
        yield 'start:';
        yield range.startContainer;
        yield `offset ${range.startOffset}`;
        yield 'end:';
        yield range.endContainer;
        yield `offset ${range.endOffset}`;
    }

    function* selectionToLog(selection) {
        yield `Selection isCollapsed=${selection.isCollapsed} rangeCount=${selection.rangeCount}:`;
        for(let i=0,l=selection.rangeCount;i<l;i++)
            yield* _rangeToLog(selection.getRangeAt(i), i);
    }

    // The selection is collapsed, but also moved to the common ancestor,
    // between the elements.When instead, I'd prefer: end of previous startContainer
    // to start of previous EndContainer...
    // Also if those container were different they should be merged now,
    // effectiveley removing the line-break and collapsing the selection again.
    //
    // In Firefox, after ctrl+a del, indeed, the whole editableHost is empty
    // at this point, which we also dont want to persist!
    // FF after ctrl+a
    //  start:
    //      <div class="T2-target" contenteditable=""> offset 0
    //  end:
    //      <div class="T2-target" contenteditable=""> offset 5
    // Chrome after ctrl+a
    // start:
    //      <textNode @0> offset 0
    //  end:
    //      <textNode @end> offset 91
    //
    console.log('AFTER deleteFromDocument...', ...selectionToLog(selection));

    console.log('AFTER LIVE SELECTION...', ...selectionToLog(event.target.ownerDocument.getSelection()));

    //selection.collapseToStart();
    selection.collapseToEnd();

    if(!selection.isCollapsed)
        // otherwise, when we later cursor.surroundContents(aNewP);, what
        // do we surround?
        console.warn('ASSERTION FAILED: Selection should be collapsed after `selection.deleteFromDocument()`,');
    else
        console.info('ASSERTION HOLDS: Selection is collapsed after `selection.deleteFromDocument()`,');

    // and insert
    if(textContent) {
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
            if(!newP.childNodes.length){
                let newText = domTool.createTextNode('');
                newP.append(newText);
            }
            cursor.setEndAfter(newP.lastChild);
            cursor.collapse();
        }
        // cursor is now within a <p>!
        cursor.insertNode(newContentsFragement);
    }
    editableHost.normalize();
    // use selection.collapseToStart() and experience the cursor moving
    // in the wrong direction when typing!
    selection.collapseToEnd();
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
}

function _handleEditableHeading(domTool, event) {
    console.log('_handleEditableHeading', event.inputType);
    if(event.inputType === 'insertParagraph')
        event.preventDefault();
}

export function init(proofElement) {
    let domTool = new DOMTool(proofElement.ownerDocument)
      , templateFragment = _normalizeTemplate(domTool, template)
      ;

    // proofElement.addEventListener('beforeinput',e=>{
    //     console.log('bubbling', e.inputType, `is heading ${e.target.matches(_EDITABLE_HEADINGS_SELECTOR)}`, `is div ${e.target.matches(_EDITABLE_DIVS_SELECTOR)}`);
    //     // e.preventDefault(); works
    //     //e.stopImmediatePropagation();// prevents capturing
    //     // e.stopPropagation(); // prevents capturing as well
    // }, true);

    proofElement.addEventListener('beforeinput',e=>{
        console.log('capturing', e.inputType, e.target);
        if(e.target.closest(_EDITABLE_DIVS_SELECTOR))
            _handleEditableDiv(domTool, e);
        else if(e.target.closest(_EDITABLE_HEADINGS_SELECTOR))
            _handleEditableHeading(domTool, e);
        else
            // Discourage use of other editable elements, as we don't
            // handle them properly, e.g. in serialization.
            e.preventDefault();
    }, false);

    proofElement.append(templateFragment);
}

