

const log = console.log;


function Clock(settings = {}) {

    const display = settings.display; // required
    const showMiliseconds = settings.showMiliseconds;
    const that = this;
    const defaultText = display.textContent;

    let t1 = Date.now(),
        isRunning = false,
        totalElapsedMs = 0,
        secondCounter = 0;

    this.clear = () => {
        totalElapsedMs = 0;
        display.textContent = defaultText;
        this.pause();
    };
    this.getElapsedTimeRaw = () => totalElapsedMs;
    this.getElapsedTimeFormatted = () => getFormattedTime(totalElapsedMs);
    this.onChangeRunningState = () => undefined;
    this.onPause = () => undefined;
    this.onStart = () => undefined;
    this.onTimeUp = () => undefined;
    this.pause = () => isRunning = false;
    this.start = () => {
        // if (isRunning) return;
        eachSecond();
        isRunning = true;
    };

    //////////////////////////

    function pad(n) {
        return n.toString().length === 1 ? "0" + n : n;
    }

    function getFormattedTime(ms) {
        const totalSeconds = Math.floor(ms / 1000);
        const displaySeconds = totalSeconds % 60;
        const totalMinutes = Math.floor(totalSeconds / 60);
        return totalMinutes + ":" + pad(displaySeconds);
    }

    function getDisplayText() {
        let text = getFormattedTime(totalElapsedMs);
        if (showMiliseconds) text += "." + t.displayMs;
        return text;
    }

    function addElapsedTime(t) {
        totalElapsedMs += t;
        secondCounter += t;
        if (secondCounter > 1000) {
            secondCounter -= 1000;
            eachSecond();
        }
    }

    function timeUp() {
        that.pause();
        that.onTimeUp();
    }

    function eachSecond() {
        display.textContent = getDisplayText();
    }

    function tick() {
        const t2 = Date.now();
        if (isRunning) addElapsedTime(t2 - t1);
        t1 = t2;
        window.requestAnimationFrame(tick);
    }
    tick();
}

export { Clock };
