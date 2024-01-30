import "../libraries/jquery.js";


//  NOTE need to use jQuery here, because the window resize event
//  seems not to work in straight javascript

const log = console.log;

function fitInParent(child, settings = {}) {

    const $child = child instanceof $ ? child : $(child);
    const $parent = settings.parent ?? $child.parent();

    const maxWidth = settings.maxWidthFill ?? (settings.maxFill ?? 1);
    const maxHeight = settings.maxHeightFill ?? (settings.maxFill ?? 1);

    $(window).on("resize orientationchange touch click", resize);

    if (settings.onStart) settings.onStart();

    resize();

    ///////////////////////

    function resize() {
        const widthDifference = ($parent.outerWidth() / $child.outerWidth()) * maxWidth;
        const heightDifference = ($parent.outerHeight() / $child.outerHeight()) * maxHeight;
        const scale = Math.min(widthDifference, heightDifference);
        $child.css("transform", `scale(${scale}, ${scale})`);
        if (settings.onResize) settings.onResize(scale);
    }
}


export { fitInParent };
