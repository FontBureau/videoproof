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
//        Would be nice to insert soft line-breaks with ctrl + enter (works)
//        instead of paragraphs (only enter).
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

export function init(proofElement) {
    let domTool = new DOMTool(proofElement.ownerDocument)
      , templateFragment = _normalizeTemplate(domTool, template)
      ;

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

