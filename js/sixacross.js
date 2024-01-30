import "./libraries/jquery.js";
import { wordslist as dictionary } from "./modules/wordslist.js";
import { shakeElement } from "./modules/shakeElement.js";
import { Sounds } from "./modules/Sounds.js";
import { fitInParent } from "./modules/fitInParent.js";
import { Clock } from "./modules/Clock.js";
// import { ConfettiCelebration } from "./modules/ConfettiCelebration.js";
import { Confetti } from "./modules/Confetti.js";

const log = console.log;
const wordslist = new WordsList(dictionary);


const conroller = new Controller(wordslist, Problem, Clock, Table, Touchpad, Confetti, Directions, EndScreen);
function Controller(wordslist, Problem, Clock, Table, Touchpad, Confetti, Directions, EndScreen, settings = {}) {

    const $body = $("body");
    const $muteButton = $("#mute-button");

    const timeoutsArray = [];
    const numLetters = settings.numLetters ?? 6;
    const overflow = settings.overflow ?? 4;
    const table = new Table({ numLetters, overflow, timeoutsArray });
    const clock = new Clock({ display: $("#clock")[0] });
    const touchpad = new Touchpad();
    const mistakes = new Mistakes(numLetters, () => current());
    const confetti = new Confetti();
    const endScreen = new EndScreen();
    const directions = new Directions({
        fitInParent,
        icons: $(".directions-icon"),
    });

    endScreen.onClick = () => newGame();

    if (localStorage.sixacross_is_muted === "true") $body.addClass("muted");
    $muteButton.on("click", () => {
        $body.toggleClass("muted");
        localStorage.setItem("sixacross_is_muted", $body.hasClass("muted"));
    });

    const current = () => remainingCells[pointer];

    mistakes.getCurrentIndex = () => current();

    touchpad.onclick = letter => {
        if (letter === "←") letter = "ArrowLeft";
        if (letter === "→") letter = "ArrowRight";
        window.dispatchEvent(new KeyboardEvent("keydown", { key: letter }));
    };

    const sounds = new Sounds({
        completed: "sounds/completed.mp3",
        tick: "sounds/tick.mp3",
        wrongSound: "sounds/wrongSound.mp3",
        flipped: "sounds/flipped.mp3",
        gameOver: "sounds/completed.mp3",
    });
    sounds.isMuted = () => $body.hasClass("muted");

    confetti.onNew = () => sounds.play("completed");

    let remainingCells = generateRemainingCells(numLetters);
    let pointer = 0;
    let problem = undefined;
    let gameOver = false;

    table.onFocusChange = () => {
        touchpad.populate(mistakes.atIndex(current()));
    };
    table.onCellClick = index => {
        pointer = remainingCells.indexOf(index);
        table.focus(current());
    };

    $(window).on("keydown", e => {
        const key = e.key;
        if (directions.isShowing()) return directions.toggle(false);
        if (key === "Enter" && gameOver) return newGame();
        if (gameOver) return true;
        if (key === "Tab" && e.shiftKey) return tabHandler(e, "ArrowLeft");
        if (key === "Tab") return tabHandler(e, "ArrowRight");
        if (mistakes.includes(key) || e.originalEvent.repeat || e.metaKey || e.shiftKey || e.ctrlKey) return true;
        clock.start();
        if (["ArrowLeft", "ArrowRight"].includes(key)) return changeFocus(e, true);
        if (isLetter(key)) return problem.checkAnswer(remainingCells[pointer], key.toUpperCase());
    }).on("keydown touch", () => {
        $(window).trigger("resize");
        $(window).trigger("orientationchange");
    });

    newGame();


    /////////////////////////////////


    function newGame(settings = {}) {

        clock.clear();
        setTimeout(clearAndBuild, settings.delay ?? 0);

        function clearAndBuild() {
            endScreen.clear();
            $body.removeClass("game-over");
            pointer = 0;
            timeoutsArray.forEach(t => clearTimeout(t));
            timeoutsArray.length = 0;
            gameOver = false;
            remainingCells = generateRemainingCells(numLetters);
            mistakes.clear();
            touchpad.clear();

            problem = new Problem(wordslist, { numLetters });
            log(problem.mainWord); // for testing purposes
            problem.onCorrectAnswer = letter => {
                table.showCorrectAnswer(remainingCells[pointer], letter);
                remainingCells.splice(pointer, 1);
                sounds.play("tick");
                if (!remainingCells.length) return endGame();
                if (!remainingCells[pointer]) pointer = 0; // moving back to the beginning if the pointer has overshot the end of the array
                table.focus(remainingCells[pointer]);
            };
            problem.onWrongAnswer = letter => {
                table.showWrongLetter(remainingCells[pointer], letter);
                table.shakeKey(current());
                sounds.play("wrongSound");
                mistakes.addMistake(letter);
                touchpad.populate(mistakes.atIndex(current()));
            };

            table.build(problem);
            table.focus(remainingCells[0]);
        }
    }

    function changeFocus(e) {
        if (gameOver) return false;
        const direction = e.key === "ArrowLeft" ? -1 : 1;
        pointer += direction;
        if (pointer < 0) pointer = remainingCells.length - 1;
        if (pointer > remainingCells.length - 1) pointer = 0;
        table.focus(remainingCells[pointer]);
    }

    function generateRemainingCells(num) {
        const array = [];
        for (let i = 0; i < num; i++) array.push(i);
        return array;
    }

    function isLetter(key) {
        return /^[A-Za-z]$/.test(key); // tests for single letter
    }

    function endGame() {

        clock.pause();
        setTimeout(() => table.onEndGame().victorySwell(), 500); // slight delay before endGame and victoryWell
        gameOver = true;
        sounds.play("gameOver");

        // slight delay before showing endscreen
        timeoutsArray.push(setTimeout(() => {
            const numMistakes = mistakes.getTotalNumMistakes();
            const time = clock.getElapsedTimeFormatted();
            $body.addClass("game-over");
            endScreen.show(problem.mainWord, numMistakes, time);
        }, 1500));
    }

    function tabHandler(e, whichKey) {
        e.preventDefault();
        return dispatchEvent(new KeyboardEvent("keydown", { key: whichKey }));
    }
}


function EndScreen(settings = {}) {

    // NOTE the message window has nested divs, the outer for transform: scale, and
    //   the inner div for transform: translateY (have to be done separately)

    const $messageWindow = settings.messageWindow ?? $("#message-window");
    const $slider = $messageWindow.find("#message-window-slider");
    const $lettersHolder = $messageWindow.find("#letters-holder");
    const $mistakesAndTime = $messageWindow.find("#mistakes-and-time");
    const numLetters = settings.numLetters ?? 6;

    this.show = (word, numMistakes, time) => {
        $slider.addClass("showing");
        $mistakesAndTime.text(`${numLetters + numMistakes} guesses in ${time}`);
        $lettersHolder.empty();
        word.split("").forEach(letter => {
            const $span = $(`<span class='message-window-letter-holder'>${letter}</span>`);
            $lettersHolder.append($span);
        });
        $messageWindow.one("click touch", this.clear);
    };

    this.clear = () => $slider.removeClass("showing");
    this.onClick = () => undefined;

    /////////////////////

    const isShowing = () => $slider.hasClass("showing");
    fitInParent($messageWindow, { maxFill: 0.9 });
    $(window).on("keydown", () => isShowing() ? this.onClick() : true); // returning true so keyboard commands like Command+R aren't blocked
    $messageWindow.on("click touch", () => this.onClick());
}


function Directions(settings = {}) {

    const $holder = settings.holder ?? $("#directions-frame");
    const $window = $holder.find("#directions-window");
    const $toggleIcons = settings.icons;

    if (!$toggleIcons) return log("Directions requires elements to act as clickable triggers, bonehead!");

    $toggleIcons.on("click", () => this.toggle());

    if (settings.fitInParent) fitInParent($window, {
        maxWidthFill: 0.8,
        maxHeightFill: 0.8,
    });

    this.toggle = val => toggle(val);
    this.isShowing = () => isShowing();


    ////////////////


    function toggle(val) {
        $holder.toggleClass("showing", val ?? !isShowing());
    }

    function isShowing() {
        return $holder.hasClass("showing");
    }
}


function Mistakes(numLetters, getIndex) {

    const array = [];

    generateNew();

    this.addMistake = addMistake;
    this.onAddMistake = () => undefined;
    this.clear = clear;
    this.atIndex = getMistakesAtIndex;
    this.includes = key => getMistakesAtIndex().includes(key.toUpperCase());
    this.getTotalNumMistakes = getTotalNumMistakes;

    //////////////////////////////

    function addMistake(letter) {
        array[getIndex()][letter] = true;
        this.onAddMistake(getTotalNumMistakes());
    }

    function clear() {
        generateNew();
    }

    function getMistakesAtIndex() {
        const index = getIndex();
        return Object.keys(array[index] ?? []);
    }

    function generateNew() {
        for (let i = 0; i < numLetters; i++) array[i] = {};
    }

    function getTotalNumMistakes() {
        let total = 0;
        for (let i = 0; i < numLetters; i++) total += Object.keys(array[i]).length;
        return total;
    };
}


function WordsList(dictionary, settings = {}) {

    dictionary = dictionary.map(word => word.toUpperCase());

    const maxNumLetters = settings.maxNumLetters ?? 7;

    this.getWordsByLength = getWordsByLength;
    this.getWordsContaining = getWordsContaining;

    //////////////////////////

    function getWordsByLength(num) {
        if (!num || isNaN(num) || num < 3 || num > 8) return log("Bad parameters, butthead!");
        return dictionary.filter(word => word.length === num);
    }

    function getWordsContaining(letter) {
        return dictionary.filter(word => word.includes(letter) && word.length <= maxNumLetters);
    }
}


function Problem(wordslist, settings = {}) {

    const numLetters = settings.numLetters ?? 6;
    const mainWord = chooseBaseWord(numLetters);
    const lopsidedNum = settings.lopsidedNum ?? 4;
    const that = this;
    const chosenWords = [];

    this.checkAnswer = checkAnswer;
    this.numLetters = numLetters;
    this.mainWord = mainWord;
    this.letters = mainWord.split("").map(letter => {
        const subwordLetters = pickWordWithLetter(letter, chosenWords).split("");
        const index = subwordLetters.indexOf(letter);
        const guessed = {};
        return { letter, subwordLetters, index, guessed };
    });
    this.dimensions = getTableDimensions(this.letters);
    this.onCorrectAnswer = () => undefined;
    this.onWrongAnswer = () => undefined;


    ////////////////////////////


    function getTableDimensions(letters) {

        let numAbove = 0;
        let numBelow = 0;
        let tableHeight = 0;

        letters.forEach(letter => {
            numAbove = Math.max(numAbove, letter.index);
            numBelow = Math.max(numBelow, letter.subwordLetters.length - letter.index - 1);
            tableHeight = Math.max(tableHeight, numAbove + numBelow + 1);
        });

        let mainWordIndex = numAbove;
        let tableWidth = letters.length;

        return { numAbove, numBelow, mainWordIndex, tableHeight, tableWidth };
    }

    function checkAnswer(index, userAnswer) {
        if (that.letters[index].letter !== userAnswer) return that.onWrongAnswer(userAnswer);
        that.onCorrectAnswer(userAnswer);
        return true;
    }

    function chooseBaseWord(numLetters) {
        const list = wordslist.getWordsByLength(numLetters);
        return pickRandomFrom(list);
    }

    function pickWordWithLetter(letter, chosenWords) {
        const candidateWord = pickRandomFrom(wordslist.getWordsContaining(letter));
        if (wordIsLopsided(candidateWord, letter)) return pickWordWithLetter(letter, chosenWords);
        if (chosenWords.includes(candidateWord)) return pickWordWithLetter(letter, chosenWords);
        chosenWords.push(candidateWord);
        return candidateWord;
    }

    function wordIsLopsided(word, letter) {
        const index = word.indexOf(letter);
        const tooManyLettersBefore = index > lopsidedNum;
        const tooManyLettersAfter = word.length - 1 - index > lopsidedNum;
        return tooManyLettersBefore || tooManyLettersAfter;
    }
}


function Table(settings = {}) {

    const $table = $("#table");
    const letterCellClass = settings.letterCellClass ?? "letter-cell";
    const $cellTemplate = $("." + letterCellClass).detach().removeClass("my-template");
    const focusClass = settings.focusClass ?? "focused";
    const completedClass = settings.completedClass ?? "completed";
    const wrongClass = settings.wrongClass ?? "incorrect";
    const subwordFocusClass = settings.subwordFocusClass ?? "subword-focused";
    const numLetters = settings.numLetters ?? 6;
    const answeredClass = settings.answeredClass ?? "answered";
    const hasSubletterClass = settings.hasSubletterClass ?? "has-subletter";
    const that = this;
    const timeoutsArray = settings.timeoutsArray;

    let $mainLetters;

    this.build = problem => {

        const letters = problem.letters;
        const dimensions = problem.dimensions;
        const tableHeight = dimensions.tableHeight;
        const tableWidth = dimensions.tableWidth;
        const mainWordIndex = dimensions.mainWordIndex;

        $table.empty();

        // generating the cells
        for (let row = 0; row < tableHeight; row++) {
            for (let col = 0; col < tableWidth; col++) {
                const $cell = $cellTemplate.clone().appendTo($table);
                if (row === mainWordIndex) $cell.addClass("main-letter").on("click", () => cellClickHandler($cell));
                setTimeout(() => $cell.addClass("showing"), (row * tableWidth + col) * 10);
            }
        }

        function cellClickHandler($cell) {
            if ($cell.hasClass(answeredClass)) return false;
            const index = $cell.index(".main-letter");
            return that.onCellClick(index);
        }

        fitInParent($table, {
            maxWidthFill: 0.9,
            maxHeightFill: 0.8,
            onResize: scale => this.currentScale = scale,
        });

        letters.forEach((obj, i) => {
            const startPoint = dimensions.numAbove - obj.index;
            const offset = i;
            obj.subwordLetters.forEach((letter, index) => {
                if (index === obj.index) return; // not filling if it's a letter of the main word
                const cell = letters.length * (startPoint + index) + offset;
                $("." + letterCellClass).eq(cell).addClass(hasSubletterClass).find(".letter-holder").text(letter);
            });
        });

        $mainLetters = $(".main-letter");
    };

    this.currentScale = 1; // to be overwritten on resizing
    this.clear = clear;
    this.focus = focus;
    this.onFocusChange = () => undefined;
    this.showCorrectAnswer = showCorrectAnswer;
    this.showWrongLetter = showWrongLetter;
    this.removeFocus = removeFocus;
    this.shakeKey = index => shakeElement($mainLetters[index]);
    this.markAsWrong = () => $mainLetters[index].addClass(wrongClass);
    this.victorySwell = (delay = 0) => {
        for (let i = 0; i < $mainLetters.length; i++) {
            const timeout = setTimeout(() => $mainLetters.eq(i).addClass(completedClass), delay + i * 100);
            timeoutsArray.push(timeout);
        }
    };
    this.onEndGame = () => {
        $mainLetters.removeClass(focusClass);
        $("." + subwordFocusClass).removeClass(subwordFocusClass);
        return this;
    };
    this.getDimensions = () => {
        return {
            height: $table.outerHeight(true) * this.currentScale,
            width: $table.outerWidth(true) * this.currentScale,
            top: $table.offset().top,
            left: $table.offset().left,
        };
    };


    ////////////////////////


    function clear() {
        removeFocus();
        $(".letter-holder").empty().removeClass(wrongClass, focusClass);
        $("." + hasSubletterClass).removeClass(hasSubletterClass);
    }

    function focus(index) {
        removeFocus();
        $mainLetters.eq(index).addClass(focusClass);
        $("." + letterCellClass).each(i => {
            (i % numLetters === index) && $("." + letterCellClass).eq(i).addClass(subwordFocusClass);
        });
        that.onFocusChange();
    }

    function showCorrectAnswer(index, letter) {
        const $cell = $mainLetters.eq(index);
        $cell.removeClass(wrongClass).addClass(answeredClass).find(".letter-holder").text(letter);
        $cell.find(".check-batsu-holder").text("✔︎");
    }

    function showWrongLetter(index, letter) {
        const $cell = $mainLetters.eq(index);
        $cell.addClass(wrongClass).find(".letter-holder").text(letter);
        $cell.find(".check-batsu-holder").text("×");
    }

    function removeFocus() {
        $("." + focusClass).removeClass(focusClass);
        $("." + subwordFocusClass).removeClass(subwordFocusClass);
    }
}


function Touchpad(settings = {}) {

    const $keyboard = settings.keyboard ?? $("#keyboard");
    const selectedClass = settings.selectedClass ?? "selected";

    const keyboardRows = ["QWERTYUIOP", "ASDFGHJKL", "←ZXCVBNM→"];
    const keysObject = {};

    keyboardRows.forEach(letters => {
        const $row = $("<div>").addClass("keyboard-row").appendTo($keyboard);
        letters.split("").forEach(letter => {
            const $key = $("<div>").addClass("keyboard-key").text(letter).appendTo($row);
            $key.on("click", () => this.onclick(letter));
            keysObject[letter] = $key;
            if (letter === "←") $key.addClass("arrow-key arrow-left");
            if (letter === "→") $key.addClass("arrow-key arrow-right");
        });
    });

    fitInParent($keyboard, {
        logData: false,
        maxFill: 0.95,
    });

    this.onclick = () => undefined;
    this.clear = () => {
        for (let key in keysObject) keysObject[key].removeClass(selectedClass);
    };
    this.populate = array => {
        array = Array.isArray(array) ? array : [array];
        $("." + selectedClass).removeClass(selectedClass);
        array.forEach(letter => keysObject[letter]?.addClass(selectedClass));
    };
}


////////////////


function pickRandomFrom(array, doRemove = false) {
    const index = Math.floor(Math.random() * array.length);
    const returnElem = array[index];
    if (doRemove) array.splice(index, 1);
    return returnElem;
}


function shuffle(array) {
    for (let i = array.length - 1; i > 0; i--) {
        let j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
}
