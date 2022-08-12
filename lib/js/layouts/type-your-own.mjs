/* jshint browser: true, esversion: 7, laxcomma: true, laxbreak: true */

function fitToSpace(element) {
    // Original, when extended text is present, doesn't do
    // white-space: nowrap, I don't know the reason.
    // it also puts extended chars into a new span with extra class, but
    // the class is never used in css and it creates bad fitting.
    element.style.whiteSpace = 'nowrap';
    // fixed point for measurement
    let tmpFontSizePx = 16;
    element.style.fontSize = `${tmpFontSizePx}px`;
    // for measurement this will have to be a display mode that expands
    // to firt the available space.
    element.style.display = 'block';


    // We could add an option: "avoid line breaks" and then use.
    // VideoProof.setWidest();
    // If we are not using setWidest, should we set another default?
    // We could also be setting another font size per animation frame
    // but that would likely work look very well...
    let win = element.ownerDocument.defaultView
      , winHeight = win.innerHeight - 96
      , bBox = element.getBoundingClientRect()
        // FIXME: I'd like to do this differently! why 96 anyways???
        //        I'm now using 217, but it's still arbitrary!
      , availableHeightPx = win.innerHeight - (217)
      , availableWidthPx = bBox.width
      , content = element.firstChild
      , contentWidthPX = content.getBoundingClientRect().width
      , contentWidthEm = contentWidthPX/tmpFontSizePx
      , fontSizeWidthPx = availableWidthPx/contentWidthEm
        // FIXME: hard-coded line-height ...
      , fontSizeHeightPx = availableHeightPx/1.5
      , fontSizePx = Math.min(fontSizeHeightPx, fontSizeWidthPx)
      , fontSizePt = fontSizePx * 0.75
      ;
    //VideoProof.unsetWidest();
    element.style.fontSize = `${fontSizePt}pt`;
    element.style.padding = 0;
    return fontSizePt;
}

export function init(proofElement, text) {
    let content = proofElement.ownerDocument.createElement('span');
    content.textContent = text;
    proofElement.append(content);
    fitToSpace(proofElement);
    // return as function to execute when animation is changed...
    // Maybe we could use an otion to toggle this, because it can feel
    // a bit weird as well, but it's at least consequent, as typing while
    // animating will have the same effect, but not update when not typing.
    // The quickest way to turn this off is not to return anything.
    return {update: fitToSpace.bind(null, proofElement)};
}
