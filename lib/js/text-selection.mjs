/* jshint esversion: 11, unused:true, undef:true, laxcomma: true, laxbreak: true, devel: true */

// from varla-varfo justifiction.mjs, sloghtly modified
// TODO: use https://developer.mozilla.org/en-US/docs/Web/API/TreeWalker
//       or  https://developer.mozilla.org/en-US/docs/Web/API/NodeIterator
//      to implement this.
// let walker = document.createTreeWalker(el,NodeFilter.SHOW_TEXT,null,false);
// while(let node=walker.nextNode()) yield n;
function* _deepTextGen({/*window*/Node}, node, [skipSelector, skipClass]) {
    // console.log('_deepTextGen:', node, node.textContent);

    let continueWithNextSiblings = false;
    if(Array.isArray(node)) {
        [node, continueWithNextSiblings] = node;
    }

    // console.log('_deepTextGen:', node, nextElementSiblings, '==>', node.nextSibling);
    if(node && skipSelector && node.nodeType === Node.ELEMENT_NODE && node.matches(skipSelector)) {
        if(skipClass)
            node.classList.add(skipClass);
        return;
    }
    // Only if node is an element, otherwise, assert it's a text
    // node and continue with it and then it's nextSiblinds...
    // this way we can start the generator in the middle of an element.
    if(node.nodeType === Node.ELEMENT_NODE && !continueWithNextSiblings)
        // Only descent into the node but do not use node.nextSibling.
        node = node.firstChild;
    while(node !== null) {
        if(node.nodeType === Node.TEXT_NODE){
            // console.log('yield', node, node.textNode, node.nextSibling);
            yield node;
        }
        else if(node.nodeType === Node.ELEMENT_NODE) {
            yield* _deepTextGen({Node}, node, [skipSelector, skipClass]);
        }
        // else: skip, is COMMENT_NODE or such
        node = node.nextSibling;
    }
}

function _getIndexPath(stopNode, node) {
        let indexes = [];
        // Must be within stopNode or we never stop!
        if(!stopNode.contains(node))
            throw new Error(`node must be contained in stopNode.`);
        while(node !== stopNode) {
            indexes.push(Array.prototype.indexOf.call(node.parentElement.childNodes, node));
            node = node.parentElement;
        }
        return indexes.reverse();
}

function _getRangeIndexPath(stopNode, node, offset) {
    let Node = stopNode.ownerDocument.defaultView.Node;
    if(node.nodeType !== Node.TEXT_NODE) {
        // seen in Firefox
        // FIXME: this happens when multi-selecting a range
        //        in firefox, that is before the last selected
        //        range, seems to be related how FireFox handles
        //        multiple selection, esp. when we remove all but
        //        the current selected range.
        let textNode = _getFirstTextNode(node); // just use the first TextNode
        if(textNode) {
            node = textNode;
            offset = 0; // Could actually assert it is already 0.
        }
        else
            throw new Error(`ASSERTION FAILED: range-container must `
              + `be a TextNode, but it is Type: ${node.nodeName} `
              + `"${node.textContent}"`);
    }
    return [..._getIndexPath(stopNode, node), offset];
}

function _getIndexStartPath(stopNode, range) {
    return _getRangeIndexPath(stopNode, range.startContainer, range.startOffset);
}

function _getIndexEndPath(stopNode, range) {
    return _getRangeIndexPath(stopNode, range.endContainer, range.endOffset);
}

function _getFullPathsFromRange(stopNode, range) {
    return [
        _getIndexStartPath(stopNode, range)
      , _getIndexEndPath(stopNode, range)
    ];
}

export function getFullPathsFromRanges(stopNode, ...ranges) {
    return ranges.map(range=>_getFullPathsFromRange(stopNode, range));
}

function _indexPathSort(a, b) {
    for(let i=0, l=Math.max(a.length, b.length); i<l;i++) {
        // This makes undefined "lighter" than 0, even though
        // they could be considered equivalent. But, it's better
        // to have an order than not.
        if(a[i] === undefined) return -1;
        if(b[i] === undefined) return 1;
        if(a[i] === b[i]) continue;
        return a[i] - b[i];
    }
     return 0;
}

/**
 * To use in an array.prototype sort, maybe bind...
 * let rangeSort _rangeSort.bind(null, proof)
 *
 * This currently unused, but I keep it as an export as it
 * could become useful at some point.
 */
export function rangeSort(stopNode, a, b) {
    let pathRangeA = _getFullPathsFromRange(stopNode, a)
      , pathRangeB =  _getFullPathsFromRange(stopNode,b)
      ;
    return _pathRangeSort(pathRangeA, pathRangeB);
}

function _pathRangeSort(a, b) {
    let [startPathA, endPathA] = a
      , [startPathB, endPAthB] = b
      ;
    let startAb = _indexPathSort(startPathA, startPathB);
    if(startAb !== 0)
        return startAb;
    let endAb = _indexPathSort(endPathA, endPAthB);
    if(endAb === 0) return 0;
    // reverse sort, so that the longer paths with the same
    // start come first.
    if(endAb < 0) return 1;
    // endAb > 0
    return -1;
}

function _copyPathRange([startPath, endPath]) {
    return [startPath.slice(), endPath.slice()];
}

function _getPathRangeKey(pathRange) {
     return `${pathRange.slice(0, -1).join('.')}@${pathRange[pathRange.length-1]}`;
}


/**
 * If there are overlaps, make a union.
 *
 * NOTE: there could also be other modes, e.g. where merging is
 *       exclusive. I.e. selection get's deselected not-selected
 *       get's selected.
 */
export function mergePathRanges(...pathRanges) {
    let result = [];
    if(!pathRanges.length)
        return result;
    pathRanges.sort(_pathRangeSort);
    let current = null;
    for(let pathRange of pathRanges) {
        if(current === null) {
            // makes a defensive copy
            current = _copyPathRange(pathRange);
            continue;
        }
        // don't forget that ranges are sorted, so at least the
        // range is contained in current and at most it is outside.
        let [rangeStart, rangeEnd] = pathRange
          , [, currentEnd] = current
          , comparedEndStart = _indexPathSort(currentEnd, rangeStart)
          ;
        if(comparedEndStart < 0) {
            // sort a before b
            // currentEnd is before range start, they are apart
            // and there's a gap.
            result.push(current);
            current = _copyPathRange(pathRange);
            continue;
        }

        if(comparedEndStart >= 0) {
            // if 0
            //      current ends where range starts, so we can just
            // if > 0
            //      sort a after b
            //      currentEnd is after range start, they overlap
            let  compareEndEnd = _indexPathSort(currentEnd, rangeEnd);
            if(compareEndEnd < 0) {
                // add them together
                current[1] = rangeEnd;
            }
        }
    }
    if(current)
        result.push(current);
    return result;
}

function _getNodeFromPath(rootElem, path) {
    return path.reduce((accum, index)=>accum.childNodes[index], rootElem);
}

/**
 * Only required when using markupSelectionInline!
 *
 * A TextNode may be within a selection-span
 * in that case, we MUST assert the path-part is 0. The offset
 * may still be something else, as we may have selected within
 * the TextNode. The answer to this is to get the path and offset
 * of the parentElement (selection-span), remove the TextNodes
 * own 0-adress from the path sum both offsets to create the
 * new offset.
 *
 * Really, for any element on the path, there may be selection-span
 * elements before, as siblings. We need to identify these,
 * get their TextNode content length and add it to the offset,
 * and also reduce the adress by -1 if there's any TextNode the
 * selection-span content would merge with.
 */
function _normalizeRangePath(rootElem, selectionSelector, path) {
    let originalIndexPath = path.slice(0, -1)
      , originalOffset = path[path.length-1]
      , nodesPath = originalIndexPath.reduce((accum, index)=>
            [...accum, (accum.length ? accum[accum.length-1] : rootElem).childNodes[index]]
        , [])
      , normalizedIndexOffsetPath = []
      , normalizedOffset = originalOffset

      , Node = rootElem.ownerDocument.defaultView.Node
      , _isTextNode = node=>node.nodeType === Node.TEXT_NODE
      , _isSelectionNode = node=>node.nodeType === Node.ELEMENT_NODE
                                    && node.matches(selectionSelector)
      , _isTextNodeLike = node=>_isTextNode(node) || _isSelectionNode(node)
      , _toTextNodes = node=>{
            if(_isSelectionNode(node)) {
                // unwrap the textNode
                if(node.childNodes.length !== 1)
                    throw new Error(`ASSERTION FAILED: selection-node `
                        + `must contain only one TEXT_NODE, but has `
                        + `${node.childNodes.length} "${node.textContent}"`);
                if(!_isTextNode(node.firstChild))
                    throw new Error(`ASSERTION FAILED: selection-node `
                        + `child node is not a TEXT_NODE type: ${node.nodeName}`);
                return node.firstChild;
            }
            return node;
        }
      ;

    if(!_isTextNode(nodesPath[nodesPath.length-1])) {
        // fix in caller...
        let node = nodesPath[nodesPath.length-1];
        throw new Error(`ASSERTION FAILED: path must end in an `
              + `TextNode, but it is Type: ${node.nodeName} "${node.textContent}" `
              + `Path: ${_getPathRangeKey(path)}`);
    }
    // There must only be one or none span.select in the path
    // if present at nodesPath[nodesPath.length-2].
    for(let node of nodesPath.slice(0, -2)) {
        if(_isSelectionNode(node))
            throw new Error(`ASSERTION FAILED: node path has selection-nodes at the wrong positions.`);
    }

    for(let i=0,l=nodesPath.length;i<l;i++) {
        let node = nodesPath[i]
          , nodeIndex = originalIndexPath[i]
          ;
        // normalize ...
        // index (, offset?)
        // look at all previous siblings and reduce them
        let previousSibling = node.parentElement.firstChild
          , textNodeEquivalents = []
          , consecutiveTextNodeEquivalents = []
          ;
        while(previousSibling !== node) {
            // Strings of TEXT_NODE and span.selection nodes need
            // to be normalized.
            if(_isTextNodeLike(previousSibling))
                textNodeEquivalents.push(previousSibling);
            else {
                if(textNodeEquivalents.length)
                    consecutiveTextNodeEquivalents.push(textNodeEquivalents);
                textNodeEquivalents = [];
                // don't need these, as they are not changing indexes
                // consecutiveTextNodeEquivalents.push(previousNode);
            }
            previousSibling = previousSibling.nextSibling;
        }
        if(textNodeEquivalents.length)
            consecutiveTextNodeEquivalents.push(textNodeEquivalents);
        let nodeIndexChange = 0
          , textNodeOffset = 0
          ;
        for(let textNodeEquivalents of consecutiveTextNodeEquivalents) {
            let flatTextNodes = textNodeEquivalents.map(_toTextNodes);
            // one text node will remain
            nodeIndexChange += (flatTextNodes.length - 1);
            // only the last is interesting
            textNodeOffset = flatTextNodes.reduce((accum, node)=>accum+node.textContent.length, 0);
        }

        if(_isTextNode(node)) {
            // textNode MUST be the last node, because it can't
            // have childNodes itself.
            if(node.previousSibling && _isTextNodeLike(node.previousSibling)) {
                // Because the node itself will be merged into the
                // previous textNode
                nodeIndexChange += 1;
                // textNodeOffset is only valid and relevant if
                // the previousSibling is/will become a text node.
                normalizedOffset = originalOffset + textNodeOffset;
            }
        }
        normalizedIndexOffsetPath.push([nodeIndex - nodeIndexChange, textNodeOffset]);
    }

    if(nodesPath.length > 1 && _isSelectionNode(nodesPath[nodesPath.length-2])) {
        let [nodeIndex, ] = normalizedIndexOffsetPath.pop()
          , [, textNodeOffset] = normalizedIndexOffsetPath.pop()
          ;
        normalizedOffset = textNodeOffset + normalizedOffset;
        // `normalizedOffset` from this entry in normalizedIndexOffsetPath
        // is not used, just added for completenenss.
        normalizedIndexOffsetPath.push([nodeIndex, normalizedOffset]);
    }
    let normalizedIndexPath = normalizedIndexOffsetPath.map(([nodeIndex, ])=>nodeIndex);
    normalizedIndexPath.push(normalizedOffset);
    return normalizedIndexPath;
}

/**
 * Remove selection-markup influences.
 * Can't actually return a Range, as the normalized version
 * cannot depend on current markup, but should be clean/ideal markup.
 */
function _normalizeRangePaths(rootElem, selectionSelector, rangePaths/* = [startPath, endPath]*/) {
    return rangePaths.map(path=>_normalizeRangePath(rootElem, selectionSelector, path));
}

export function normalizePathsRanges(rootElem, selectionSelector, ...pathRanges/* = [[startPath, endPath], ...]*/) {
    return pathRanges.map(rangePaths=>_normalizeRangePaths(rootElem, selectionSelector, rangePaths));
}

/**
 * Return per passed range a normalize range path array.
 */
export function normalizeRanges(rootElem, selectionSelector, ...ranges) {
    return ranges.map(range=>_getFullPathsFromRange(rootElem, range))
                 .map(rangePaths=>_normalizeRangePaths(rootElem, selectionSelector, rangePaths));
}

// from justification.mjs
/**
 * Determine whether a node's text content is entirely whitespace.
 *
 * @param nod  A node implementing the |CharacterData| interface (i.e.,
 *             a |Text|, |Comment|, or |CDATASection| node
 * @return     True if all of the text content of |nod| is whitespace,
 *             otherwise false.
 */
function _isWhiteSpaceTextNode(node) { // jshint ignore:line
  // Use ECMA-262 Edition 3 String and RegExp features
  return !(/[^\t\n\r ]/.test(node.data));
}

function _getFirstTextNode(element) {
    const global = element.ownerDocument.defaultView;
    for(let textNode of _deepTextGen(global, [element, false], [])) {
        if(!_isWhiteSpaceTextNode(textNode))
            return textNode;
    }
}

function _getLastTextNode(element) {
    const global = element.ownerDocument.defaultView;
    let notWhiteSpaceTextNode;
    for(const textNode of _deepTextGen(global, [element, false], [])){
        if(!_isWhiteSpaceTextNode(textNode))
            notWhiteSpaceTextNode = textNode;
    }
    return notWhiteSpaceTextNode;
}

export function clipAndFilterRanges(stopNode, ranges) {
    const { Range } = stopNode.ownerDocument.defaultView
      , result = []
      ;
    for(let range of ranges) {
        if(!range.intersectsNode(stopNode)) {
            continue;
        }
        // We now know it touches stopNode.
        if(!stopNode.contains(range.commonAncestorContainer)) {
            const newRange = new Range();
            if(!stopNode.contains(range.startContainer)) {
                let firstTextNode = _getFirstTextNode(stopNode);
                newRange.setStartBefore(firstTextNode);
            }
            else
                newRange.setStart(range.startContainer, range.startOffset);

            if(!stopNode.contains(range.endContainer)) {
                let lastTextNode = _getLastTextNode(stopNode);
                newRange.setEnd(lastTextNode, lastTextNode.data.length);
            }
            else
                newRange.setEnd(range.endContainer, range.endOffset);
            range = newRange;
        }
        if(range.collapsed)
            continue;
        result.push(range);
    }
    return result;
}

/**
 *  pathRanges => str
 */
export function serializePathRanges(pathRanges) {
    let result = [];
    for(let [start, end] of pathRanges) {
        result.push(`${start.join('.')}-${end.join('.')}`);
    }
    return result.join(',');
}

/**
 * str => pathRanges (must be merged and sorted at some point!)
 */
export function deserializePathRanges (rangesStr) {
    let message
      , pathRanges = rangesStr.length
            ? rangesStr.split(',')
                .map(startEnd=>startEnd.split('-') // =>  two-list [start, end]
                    .map(pathStr=>pathStr.split('.') // => list of numeric strings
                        .map(parseFloat))) // => list of numbers
            : []
      ;
    // FIXME: got to detect bad formatting, expecting a list
    //        of two-lists([start, end]) of numbers.

    return [pathRanges, message];
}

/**
 * If the paths are normalized, rootElement must be freed from
 * span.selection elements and normalized (rootElement.normalize()).
 */
function _rangeFromPathRange(rootElem, [startPath, endPath]) {
    let startContainerPath = startPath.slice(0, -1)
      , startContainerOffset = startPath[startPath.length - 1]
      , startContainer = _getNodeFromPath(rootElem, startContainerPath)
      , endContainerPath = endPath.slice(0, -1)
      , endContainerOffset = endPath[endPath.length - 1]
      , endContainer = _getNodeFromPath(rootElem, endContainerPath)
      , range = new rootElem.ownerDocument.defaultView.Range()
      ;
    try {
        range.setStart(startContainer, startContainerOffset);
        range.setEnd(endContainer, endContainerOffset);
    }
    catch(error) {
        throw error;
    }

    // TODO: create message on fail!
    return [range, null];
}

/**
 * Exported because it's handy, could be in an itertools module.
 */
export function* reverseArrayIterator(array) {
    for(let i=array.length-1;i>=0;i--)
        yield [array[i], i];
}

function _packSelection(tagName, classes, nodes, startRange, endRange=null) {
    let Range = nodes[0].ownerDocument.defaultView.Range
      , elements = []
      ;
    if(endRange === null)
        endRange = startRange;
    for(let [node, /*index*/] of reverseArrayIterator(nodes)) {
        if(node.data.length === 0)
            continue;
        let element = node.ownerDocument.createElement(tagName)
          , startIndex = node === startRange.startContainer
                    ? startRange.startOffset
                    : 0
          , endIndex = node === endRange.endContainer
                    ? endRange.endOffset
                    : node.data.length // -1???
          , r = new Range()
          ;
        r.setStart(node, startIndex);
        r.setEnd(node, endIndex);
        if(r.toString().length === 0)
            continue;
        r.surroundContents(element);
        elements.unshift(element);
    }

    for(let elem of elements) {
        for(let class_ of classes)
            elem.classList.add(class_);
    }
    return elements;
}

/**
 * This style is good for animation, as it doesn't need to be updated
 * anymore when animating. However, it changes the proof markup, which,
 * can mess with the native browser selection, making it barely useable.
 * It also complicates things, see _normalizeRangePath and where it's used.
 */
export function markupSelectionInline(rootElement, class_, normalizedMergedPathRanges) {
    const global = rootElement.ownerDocument.defaultView;
    // Clean up, so that the normalized ranges do apply.
    // CAUTION: if rootElement has changed/the wrong content,
    //          the selection will be invalid/different anyways.
    for(let elem of rootElement.querySelectorAll(`span.${class_}`))
        elem.replaceWith(...elem.childNodes);
    rootElement.normalize();

    let ranges = normalizedMergedPathRanges.map(pathRange=>_rangeFromPathRange(rootElement, pathRange))
      , textNodesForRanges = []
      ;

    for(let [range, message] of ranges) {
        let textNodes = [];
        textNodesForRanges.push(textNodes);
        if(message) {
            console.warn('Error via _rangeFromPathRange:', message);
            continue;
        }

        let foundStart = false;
        for(let textNode of _deepTextGen(global, range.commonAncestorContainer, [])) {
            if(range.startContainer === textNode)
                foundStart = true;
            if(!foundStart)
                continue;
            textNodes.push(textNode);
            if(textNode === range.endContainer || range.endContainer.contains(textNode))
                break;
        }
    }
    for(let [[range, message], i] of reverseArrayIterator(ranges)) {
        if(message) continue;
        let nodes = textNodesForRanges[i];
        _packSelection('span', [class_], nodes, range);
    }
}

function _applyRectProperties(elem, {top, left, width, height}) {
    let props = [
            ['top', `${top}px`]
          , ['left', `${left}px`]
          , ['width', `${width}px`]
          , ['height', `${height}px`]
          // via class:
          // , ['position', 'absolute']
          // , ['background', '#f005']
          // , ['outline', '1px solid lime']
          // , ['overflow', 'visible']
          // , ['z-index', '-1']
    ];
    for(let [k, v] of props)
        elem.style.setProperty(k, v);
}

function _drawRect(targetElement, class_, properties) {
    let div = targetElement.ownerDocument.createElement('div');
    _applyRectProperties(div, properties);
    div.classList.add(class_);
    // Better is appended, otherwise, all the rangePaths will become invalid.
    targetElement.append(div);
    return div;
}

/**
 * This style is good to not confuse the native browser selection tool,
 * from which we get the selection information, because it does not mess
 * witht the selected/to be selected markup and hence, does not change
 * the browser selection. However, it needs updating in animation on
 * every frame, which turns out to be too slow, i.e. causing in Chromium
 * "[Violation] Forced reflow while executing JavaScript" warnings and
 * slowing down frame rate.
 */
export function markupSelectionStructureSave(rootElement, class_, normalizedMergedPathRanges) {
    // Clean up
    // CAUTION: if rootElement has changed/the wrong content,
    //          the selection will be invalid/different anyways.
    let selectionElements = Array.from(rootElement.querySelectorAll(`div.${class_}`));
    if(!normalizedMergedPathRanges.length) {
        // shortcut, the result would be the same without this block
        // when normalizedMergedPathRanges.length === 0, but this
        // must evaluate less.
        for(let elem of selectionElements)
            elem.remove();
    }
    let ranges = normalizedMergedPathRanges.map(pathRange=>_rangeFromPathRange(rootElement, pathRange))
      , rootRect = rootElement.getBoundingClientRect()
      , rootLeft = rootRect.left //  + scrollLeft
      , rootTop = rootRect.top //  + scrollTop
      , seen = new Set()
      , rects = []
      , selectionElementsIndex = 0
      ;
    // first measure (getClientRects)
    for(let [range, message] of ranges) {
        if(message) {
            console.warn('Error via _rangeFromPathRange:', message);
            continue;
        }
        for(let rect of range.getClientRects()) {
                // top and left must be relative to the root element
            let top = rect.top - rootTop
              , left = rect.left - rootLeft
              , { width, height } = rect
              // Not sure where the duplicates come from, but this seems
              // to work.
              , fingerprint = `${top};${left};${width};${height}`
              ;
            if(seen.has(fingerprint))
                continue;
            seen.add(fingerprint);
            rects.push({top, left, width, height});
        }
    }

    // After measuring change the dom.
    // That is, against the warning: "[Violation] Forced reflow while executing JavaScript"
    // it's said it helps to not measure after changing the dom, so in
    // this case, it's simple to measure all first.
    // However, I still get the warning.
    for(let rectProperties of rects) {
        let elem;
        // repurpose existing selectionElements
        if(selectionElementsIndex < selectionElements.length)
            elem = selectionElements[selectionElementsIndex];
        selectionElementsIndex++;
        if(elem)
            _applyRectProperties(elem, rectProperties);
        else
            _drawRect(rootElement, class_, rectProperties);
    }

    // Take care of the rest of the old selectionElements
    for(let l=selectionElements.length;selectionElementsIndex<l;selectionElementsIndex++) {
        selectionElements[selectionElementsIndex].remove();
    }
}
