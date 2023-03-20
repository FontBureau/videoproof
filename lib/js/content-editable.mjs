/* jshint browser: true, esversion: 9, laxcomma: true, laxbreak: true, unused:true, undef:true */

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
export function handleEditableDiv(domTool, event) {
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
            cursor.setEnd(newP.lastChild, newP.lastChild.textContent.length);
            cursor.collapse();
        }
        // cursor is now within a <p>!
        let parentElement = cursor.endContainer.parentElement
          , endOffset = cursor.endOffset
          ;
        cursor.insertNode(newContentsFragement);
        // Extra effort to move the cursor after the insertion for
        // iOS: see issue https://github.com/FontBureau/videoproof/issues/29
        // "Text is Inputting backwards"
        parentElement.normalize();
        cursor.setEnd(parentElement.firstChild, endOffset+textContent.length);
        selection.removeAllRanges();
        selection.addRange(cursor);
    }
    // use selection.collapseToStart() and experience the cursor moving
    // in the wrong direction when typing!
    // It's interesting, on iOS the cursor still moves backwards, on
    // entering text.
    selection.collapseToEnd();
}

export function handleEditableLine(domTool, event) {
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

    const { Range } = domTool.window
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
    else if(['insertLineBreak', 'insertParagraph'].includes(event.inputType))
        textContent = '\n';

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

    if(textContent) {
        let cursor = selection.getRangeAt(0)
          , newContentsFragement = domTool.createTextNode(textContent)
          , parentElement = cursor.endContainer.parentElement
          , endOffset = cursor.endOffset
          ;
        // Extra effort to move the cursor after the insertion for
        // iOS: see issue https://github.com/FontBureau/videoproof/issues/29
        // "Text is Inputting backwards"
        cursor.insertNode(newContentsFragement);
        parentElement.normalize();
        // This failed sometimes, had an out og range error,
        // but even adding the Math.min didn't help.
        // the cursor.collapse(false) however works so far, I'm
        // leaving the failing line in case another issue comes up.
        // cursor.setEnd(parentElement.firstChild, Math.min(endOffset+textContent.length, parentElement.firstChild.textContent.length));
        cursor.collapse(false);
        selection.removeAllRanges();
        selection.addRange(cursor);
    }
    // use selection.collapseToStart() and experience the cursor moving
    // in the wrong direction when typing!
    // It's interesting, on iOS the cursor still moves backwards, on
    // entering text.
    selection.collapseToEnd();
}


