import "../libraries/jquery.js";

const log = console.log;

function shakeElement(elementToShake, settings = {}) {

    if (!(elementToShake instanceof Element || elementToShake instanceof $)) return console.log("shakeElement requires an HTML element as its first parameter!");

    const $elementToShake = elementToShake instanceof $ ? elementToShake : $(elementToShake);

    // defaults
    settings = $.extend({
        duration: 500,
        amplitude: 4,
        period: 33,
        axis: "x"
    }, settings);

    // getting the original Top and Left positions for the object in question;
    // this is necessary for situations when the element is absolutely positioned
    // ** NOTE **  IE returns "auto" instead of "0", so we have to deal with that
    const startPosition = {
        top: $elementToShake.css("top") === "auto" ? "0" : parseInt($elementToShake.css("top")),
        left: $elementToShake.css("left") === "auto" ? "0" : parseInt($elementToShake.css("left"))
    };

    // assigning defaults for optional parameters
    const duration = settings.duration; // how long to shake total, start to finish
    const period = settings.period; // miliseconds between shakes
    const axis = (settings.axis === "x" || settings.axis === "left") ? "left" : "top";

    let amplitude = settings.amplitude; // pixels to move left and right

    // calculating how much to decrease the degree of shaking after each shake
    const amountChange = amplitude / (duration / period);
    let direction = 1; // this toggles between 1 and -1, to switch directions

    let interval = setInterval(shake, period);
    shake();


    function shake() {

        amplitude -= amountChange;

        // stopping the cycle and resetting the $element, if we're done
        if (amplitude <= 0) {
            clearInterval(interval);
            $elementToShake.css(axis, startPosition[axis]);
            return true;
        }

        direction = -direction;
        let position = amplitude * direction;

        // accounting for the start position, if any
        position += startPosition[axis];

        $elementToShake.css(axis, position + "px");
    }
}

export { shakeElement };
