/* jshint browser: true, esversion: 8, laxcomma: true, laxbreak: true */

/**
 * TODO: the controller should take care of these events:
 * $(document).on('videoproof:fontLoaded.grid', populateGrid);
 * $('#select-glyphs').on('change.grid', populateGrid);
 * $('#show-extended-glyphs').on('change.grid', populateGrid);
 */
export function init(proofElement, glyphset, fixLineBreaksFunc) {
    while(proofElement.lastChild)
        proofElement.lastChild.remove();

    for(let char of glyphset) {
        var cell = proofElement.ownerDocument.createElement('span');
        cell.textContent = char;
        proofElement.append(cell);
    }
    fixLineBreaksFunc(proofElement);
}

