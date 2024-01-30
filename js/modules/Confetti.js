import "../libraries/konva.js";
import "../libraries/jquery.js";
import "../libraries/howler.js";

const log = console.log;


function Confetti(settings = {}) {

    const holderClass = settings.holderClass ?? "confetti-holder";

    const getRandomColor = (function () {
        const colorsArray = ["red", "limegreen", "orange", "yellow", "lightblue",];
        const getRand = () => Math.floor(Math.random() * colorsArray.length);
        return () => colorsArray[getRand()];
    }());

    this.stopAndRemove = () => $(`.${holderClass}`).remove();
    this.onNew = () => undefined;

    this.new = (settings = {}) => {

        this.onNew();

        settings = $.extend({

            // requires EITHER a parent OR X/Y coordinates            
            parent: null,
            x: null,
            y: null,

            numSparks: 15,
            fill: null,
            duration: 1.3,
            scatterWidth: window.innerWidth / 3,
            scatterHeight: window.innerHeight / 2,
            numberFlutters: 3,
            delayBetweenSparks: 5,
            pieceFadeoutDuration: 0, // percentage of the whole duration
            pieceWidth: 10,
            pieceHeight: 10,
        }, settings);

        if (settings.parent) {
            const $parent = settings.parent instanceof $ ? settings.parent : $(settings.parent);
            settings.x = $parent.offset().left + $parent.outerWidth() / 2;
            settings.y = $parent.offset().top + $parent.outerHeight() / 2;
        }

        const $konvaHolder = $(`<div class="${holderClass}"></div>`).css({
            position: "absolute",
            top: settings.y - settings.scatterHeight / 2,
            left: settings.x - settings.scatterWidth / 2,
            width: settings.scatterWidth,
            height: settings.scatterHeight,
        }).appendTo("body");

        const stage = new Konva.Stage({
            container: $konvaHolder[0],
            width: $konvaHolder.outerWidth(),
            height: $konvaHolder.outerHeight(),
        });
        const layer = new Konva.Layer().moveTo(stage);

        for (let i = 0; i < settings.numSparks; i++) setTimeout(pieceOfConfetti, i * settings.delayBetweenSparks);

        function pieceOfConfetti() {

            const pieceWidth = (settings.pieceWidth * 0.7) + (Math.random() * settings.pieceWidth * 0.6);
            const pieceHeight = (settings.pieceHeight * 0.7) + (Math.random() * settings.pieceHeight * 0.6);
            const rotation = 3 - Math.random() * 6; // between -3 and 3
            const duration = (settings.duration * 0.8) + (Math.random() * settings.duration * 0.4);

            const piece = new Konva.Rect({
                x: stage.width() / 2,
                y: stage.height() / 2,
                width: pieceWidth,
                height: pieceHeight,
                fill: settings.fill || getRandomColor(),
                offsetX: pieceWidth / 2,
                offsetY: pieceHeight / 2,
            }).cache().moveTo(layer).filters([Konva.Filters.Brighten]);

            // vertical movement (rising, then falling)
            piece.to({
                y: Math.random() * settings.scatterHeight / 2,
                easing: Konva.Easings.EaseOut,
                duration: duration / 2,
                onFinish: function () {
                    piece.to({
                        y: settings.scatterHeight,
                        easing: Konva.Easings.EaseIn,
                        duration: duration / 2,
                    });
                },
            });

            // lateral movement & rotation
            piece.to({
                x: Math.random() * settings.scatterWidth,
                duration: duration,
                rotation: 360 * rotation,
                onFinish: function () {
                    piece.destroy();
                    if (layer.getChildren().length < 1) {
                        $konvaHolder.remove();
                        settings.callback && settings.callback();
                    }
                }
            });

            // fluttering
            piece.to({
                scaleX: 0,
                duration: duration / (Math.random() * settings.numberFlutters * 0.4 + settings.numberFlutters * 0.8),
                yoyo: true, // interesting that "yoyo" is not in the documentation
            });

            // fading out
            setTimeout(function () {
                piece.getLayer() && piece.to({
                    opacity: 0,
                    duration: settings.duration * settings.pieceFadeoutDuration,
                });
            }, duration * (1 - settings.pieceFadeoutDuration) * 1000);
        }
    };
}


export { Confetti };